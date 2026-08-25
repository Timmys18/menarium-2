import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { trackProductEvent } from "@/lib/product-analytics";
import { checkLoginRateLimit, getClientIp, resetLoginRateLimit } from "@/lib/rate-limit";

// Заглушка-хэш для выравнивания времени ответа, когда пользователь не найден:
// bcrypt.compare выполняется всегда, чтобы нельзя было по времени определить,
// существует ли email (защита от enumeration).
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO0000000000000000000000000000000000";
const SESSION_STATE_TTL_SECONDS = 5 * 60;

type SessionState = {
  status: UserStatus;
  sessionVersion: number;
  emailVerified: boolean;
};

function sessionStateKey(userId: string) {
  return `menarium:session-state:${userId}`;
}

function getSessionStateRedis() {
  // Browser acceptance runs against the real database but deliberately has no
  // Redis service. Rate limits are already disabled there, so session caching
  // must not turn a valid authentication flow into an infrastructure timeout.
  return process.env.E2E_TEST_MODE === "true" ? null : getRedis();
}

async function getSessionState(userId: string): Promise<SessionState | null> {
  const redis = getSessionStateRedis();
  if (redis) {
    const cached = await redis.get(sessionStateKey(userId));
    if (cached) {
      try {
        return JSON.parse(cached) as SessionState;
      } catch {
        await redis.del(sessionStateKey(userId));
      }
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, sessionVersion: true, emailVerified: true },
  });
  if (!user) return null;

  const state = { ...user, emailVerified: Boolean(user.emailVerified) };
  if (redis) {
    await redis.set(sessionStateKey(userId), JSON.stringify(state), "EX", SESSION_STATE_TTL_SECONDS);
  }
  return state;
}

export async function invalidateUserSessionState(userId: string) {
  const redis = getSessionStateRedis();
  if (redis) await redis.del(sessionStateKey(userId));
}

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
        if (!user?.passwordHash || !isValid || user.status !== UserStatus.ACTIVE) {
          return null;
        }

        await resetLoginRateLimit(email, ip);
        await trackProductEvent({
          name: "login_succeeded",
          actorId: user.id,
          entityType: "User",
          entityId: user.id,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          sessionVersion: user.sessionVersion,
          emailVerified: Boolean(user.emailVerified),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        token.sessionVersion = user.sessionVersion ?? 0;
        token.emailVerified = Boolean(user.emailVerified);
      }

      if (token.sub) {
        const dbUser = await getSessionState(token.sub);
        if (!dbUser || dbUser.status !== UserStatus.ACTIVE) {
          token.invalid = true;
        } else if (typeof token.sessionVersion === "number" && dbUser.sessionVersion !== token.sessionVersion) {
          token.invalid = true;
        } else {
          token.emailVerified = Boolean(dbUser.emailVerified);
        }
      }

      return token;
    },
    session({ session, token }) {
      if (token.invalid) {
        return { ...session, user: undefined, expires: "1970-01-01T00:00:00.000Z" };
      }
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.emailVerified = Boolean(token.emailVerified);
      }
      return session;
    },
  },
};
