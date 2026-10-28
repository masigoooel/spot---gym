import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// cek cepat: tanpa cookie sesi langsung ke /masuk.
// pemeriksaan yang sebenarnya (isi cookie + user masih ada) di lib/auth.ts.
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/masuk", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/bagikan/:path*"],
};
