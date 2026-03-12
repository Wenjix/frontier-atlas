import type { NextAuthConfig } from "next-auth"

/**
 * Edge-compatible auth config (no Prisma, no Node.js modules).
 * Used by middleware. The full config in auth.ts extends this with the adapter.
 */
export const authConfig = {
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname

      // Public routes
      if (
        pathname === "/" ||
        pathname.startsWith("/auth/") ||
        pathname.startsWith("/api/")
      ) {
        return true
      }

      // Protected routes require login
      return isLoggedIn
    },
  },
  providers: [], // Providers are added in the full auth.ts config
} satisfies NextAuthConfig
