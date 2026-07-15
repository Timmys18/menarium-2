import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPrefixes = [
  "/new",
  "/my-items",
  "/profile/edit",
  "/profile/chats",
  "/exchange",
  "/notifications",
  "/admin",
  "/swipe",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected =
    protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    /^\/item\/[^/]+\/edit$/.test(pathname);

  if (!isProtected) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token) return NextResponse.next();

  const loginUrl = new URL("/auth/login", req.url);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${req.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/new",
    "/my-items/:path*",
    "/profile/edit",
    "/profile/chats",
    "/exchange",
    "/notifications",
    "/admin",
    "/swipe",
    "/item/:id/edit",
  ],
};
