import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Nodemailer from "next-auth/providers/nodemailer"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { authConfig } from "@/lib/auth.config"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      memberId: string | null
      email: string
      name?: string | null
      image?: string | null
    }
  }
}

const isDev = process.env.NODE_ENV === "development"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  providers: isDev
    ? [
        // Dev-only: sign in with just an email, no SMTP needed.
        // Creates the user in the DB if they don't exist.
        Credentials({
          name: "Dev Login",
          credentials: {
            email: { label: "Email", type: "email", placeholder: "maya@example.com" },
          },
          async authorize(credentials) {
            const email = credentials?.email as string
            if (!email) return null

            // Find or create user
            let user = await prisma.user.findUnique({ where: { email } })
            if (!user) {
              user = await prisma.user.create({
                data: { email, emailVerified: new Date() },
              })
            }
            return { id: user.id, email: user.email, name: user.name }
          },
        }),
      ]
    : [
        Nodemailer({
          server: {
            host: process.env.EMAIL_SERVER_HOST,
            port: Number(process.env.EMAIL_SERVER_PORT),
            auth: {
              user: process.env.EMAIL_SERVER_USER,
              pass: process.env.EMAIL_SERVER_PASSWORD,
            },
          },
          from: process.env.EMAIL_FROM,
        }),
      ],
  // Credentials provider requires JWT strategy
  session: { strategy: isDev ? "jwt" : "database" },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token, user }) {
      // JWT strategy (dev) uses token, database strategy (prod) uses user
      const userId = isDev ? (token.id as string) : user.id
      const member = await prisma.member.findUnique({
        where: { userId },
        select: { id: true },
      })
      session.user.id = userId
      session.user.memberId = member?.id ?? null
      return session
    },
  },
})
