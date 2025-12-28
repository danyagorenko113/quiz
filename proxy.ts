import type { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  // No middleware needed - Auth0 handles authentication via API routes
  return
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
}
