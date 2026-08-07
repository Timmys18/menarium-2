import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    sessionVersion?: number;
    emailVerified?: boolean;
  }

  interface Session {
    user: {
      id: string;
      emailVerified?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sessionVersion?: number;
    emailVerified?: boolean;
    sessionCheckedAt?: number;
    invalid?: boolean;
  }
}
