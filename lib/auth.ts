import NextAuth, { type User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials): Promise<User | null> {
        try {
          console.log('[AUTH] Starting authorization...');
          if (!credentials?.email || !credentials?.password) {
            console.log('[AUTH] Missing credentials');
            return null;
          }

          console.log('[AUTH] Looking up user:', credentials.email);
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || user.status !== 'active') {
            console.log('[AUTH] User not found or inactive');
            return null;
          }

          console.log('[AUTH] Verifying password...');
          const valid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );
          if (!valid) {
            console.log('[AUTH] Invalid password');
            return null;
          }

          console.log('[AUTH] Updating lastLoginAt...');
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          console.log('[AUTH] Authorization successful');
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            clinicId: user.clinicId ?? undefined,
            clinicName: user.clinicName ?? undefined,
          } as User;
        } catch (error) {
          console.error('[AUTH] Authorization error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? '';
        token.role = (user as User & { role?: string }).role ?? 'clinic';
        token.clinicId = (user as User & { clinicId?: string }).clinicId;
        token.clinicName = (user as User & { clinicName?: string }).clinicName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.clinicId = token.clinicId as string | undefined;
        session.user.clinicName = token.clinicName as string | undefined;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
});
