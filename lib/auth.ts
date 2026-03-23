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
      email: string | null
      walletAddress: string | null
      ensName: string | null
      name?: string | null
      image?: string | null
    }
  }
}

// JWT token extension (used via token.walletAddress / token.ensName in callbacks)
interface ExtendedJWT {
  id: string
  walletAddress?: string | null
  ensName?: string | null
}

const isDev = process.env.NODE_ENV === "development"

const siweProvider = Credentials({
  id: "siwe",
  name: "Ethereum",
  credentials: {
    message: { type: "text" },
    signature: { type: "text" },
  },
  async authorize() {
    // Implementation in 1C-2
    return null
  },
})

const devCredentialsProvider = Credentials({
  id: "dev-login",
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
    // Dev only: auto-create member + profile + floor membership
    let member = await prisma.member.findUnique({ where: { userId: user.id } })
    if (!member) {
      member = await prisma.member.create({
        data: {
          userId: user.id,
          fullName: email.split("@")[0],
          profile: {
            create: {
              homeFloorId: "floor-1",
              status: "DRAFT",
              visibility: "TOWER",
              introOpenness: "VERY_OPEN",
            },
          },
          memberships: {
            create: { floorId: "floor-1", role: "MEMBER", status: "ACTIVE" },
          },
        },
      })
    }

    return { id: user.id, email: user.email, name: user.name }
  },
})

const nodemailerProvider = Nodemailer({
  server: {
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT),
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  },
  from: process.env.EMAIL_FROM,
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  providers: isDev
    ? [devCredentialsProvider, siweProvider]
    : [nodemailerProvider, siweProvider],
  // JWT required: SIWE Credentials provider needs JWT strategy in both dev and prod
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // Persist wallet data from authorize() return value
        token.walletAddress = (user as Record<string, unknown>).walletAddress as string | null ?? null
        token.ensName = (user as Record<string, unknown>).ensName as string | null ?? null
      }
      return token
    },
    async session({ session, token }) {
      // JWT-only strategy: always use token (user param is undefined)
      const userId = token.id as string
      const member = await prisma.member.findUnique({
        where: { userId },
        select: { id: true },
      })
      session.user.id = userId
      session.user.memberId = member?.id ?? null
      session.user.walletAddress = (token.walletAddress as string) ?? null
      session.user.ensName = (token.ensName as string) ?? null
      return session
    },
  },
})
