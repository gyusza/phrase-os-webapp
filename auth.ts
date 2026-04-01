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
        // Securely pull credentials from host enviroment variables
        const adminUser = process.env.ADMIN_USERNAME || "admin_secured";
        const adminPass = process.env.ADMIN_PASSWORD || "phraseOS_SECURE_pass_replace_me";
        
        if (credentials.username === adminUser && credentials.password === adminPass) {
          return { id: "69582ce4-c873-4a07-923b-16fc6dddf577", name: "Admin", email: "admin@phraseos.local" }
        }

        // Disable guest by default for production safety
        if (process.env.NODE_ENV === "development" && credentials.username === "guest" && credentials.password === "guest") {
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
