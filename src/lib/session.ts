import { getServerSession } from 'next-auth';
import type { DefaultSession, Session, AuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from "next-auth/providers/credentials";

// Extend the built-in session types
interface ExtendedSession extends DefaultSession {
  user: {
    id: string;
    role: string;
  } & DefaultSession['user'];
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Implement your auth logic here
        return null;
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  callbacks: {
    async session({ session, token, user }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub ?? '',
          role: token.role as string,
        },
      } as ExtendedSession;
    }
  }
};

export async function getValidatedSession(): Promise<ExtendedSession> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Unauthorized');
  return session as ExtendedSession;
}
