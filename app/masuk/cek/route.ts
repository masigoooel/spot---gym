import { NextResponse, type NextRequest } from "next/server";
import { consumeLoginToken } from "@/lib/login-token";
import { SESSION_COOKIE, sealSession, sessionCookieOptions } from "@/lib/session";

// link dari bot `/masuk?token=…` diarahkan ke sini oleh next.config.ts,
// karena cookie hanya bisa dipasang dari route handler / server action.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const userId = token ? await consumeLoginToken(token) : null;
  if (!userId) {
    return NextResponse.redirect(new URL("/masuk?gagal=1", request.url));
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.set(SESSION_COOKIE, await sealSession(userId), sessionCookieOptions);
  return response;
}
