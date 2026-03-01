import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })
        if (!user || !user.passwordHash) return null

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
        })
        if (!existing) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? "Streamer",
              image: user.image,
              googleId: account.providerAccountId,
            },
          })
        } else if (!existing.googleId) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { googleId: account.providerAccountId, image: user.image },
          })
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Credentials provider returns id directly on user.
        if (user.id) {
          token.id = user.id
        }
      }
      // For Google OAuth without an adapter, always map to our DB user id by email.
      // This overrides provider profile ids (e.g. Google subject id) so app queries use `users.id`.
      if (token.email && account?.provider === "google") {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true },
        })
        if (dbUser) token.id = dbUser.id
      }
      // On subsequent JWT callbacks `account` is undefined; recover missing id if needed.
      if (!token.id && token.email && !account) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true },
        })
        if (dbUser) token.id = dbUser.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}
