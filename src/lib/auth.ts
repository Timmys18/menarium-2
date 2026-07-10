import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkLoginRateLimit, getClientIp } from "@/lib/rate-limit";

// Заглушка-хэш для выравнивания времени ответа, когда пользователь не найден:
// bcrypt.compare выполняется всегда, чтобы нельзя было по времени определить,
// существует ли email (защита от enumeration).
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO0000000000000000000000000000000000";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";

        if (!email || !password) {
          return null;
        }

        const ip = getClientIp(new Headers(req?.headers as Record<string, string> | undefined));
        const rate = await checkLoginRateLimit(email, ip);
        if (!rate.ok) {
          throw new Error("RATE_LIMITED");
        }

        const user = await prisma.user.findUnique({ where: { email } });

        // Всегда выполняем bcrypt.compare (даже если пользователя нет) —
        // одинаковое время ответа против email enumeration по таймингу.
        const isValid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user?.passwordHash || !isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
