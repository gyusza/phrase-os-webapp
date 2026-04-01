import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (credentials.username === "admin" && credentials.password === "admin") {
          return { id: "69582ce4-c873-4a07-923b-16fc6dddf577", name: "Admin (Gyula)", email: "gyusza@gmail.com" }
        }
        if (credentials.username === "guest" && credentials.password === "guest") {
          return { id: "guest-0000-0000-0000-guest00000", name: "Guest User", email: "guest@phrase-os.local" }
        }
        return null
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
         session.user.id = token.sub;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/login',
  }
})
