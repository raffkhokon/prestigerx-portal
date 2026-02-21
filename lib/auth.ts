import { type NextAuthOptions, type User, getServerSession, type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      clinicId?: string;
      clinicName?: string;
      // Provider fields
      npi?: string;
      dea?: string;
      license?: string;
      phone?: string;
      practice?: string;
    } & DefaultSession['user'];
  }
}

// Extend User interface for custom fields
interface CustomUser {
  role?: string;
  clinicId?: string;
  clinicName?: string;
  npi?: string;
  dea?: string;
  license?: string;
  phone?: string;
  practice?: string;
}

export const authOptions: NextAuthOptions = {
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
            npi: user.npi ?? undefined,
            dea: user.dea ?? undefined,
            license: user.license ?? undefined,
            phone: user.phone ?? undefined,
            practice: user.practice ?? undefined,
          };
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
        token.role = user.role ?? 'provider';
        token.clinicId = user.clinicId;
        token.clinicName = user.clinicName;
        token.npi = user.npi;
        token.dea = user.dea;
        token.license = user.license;
        token.phone = user.phone;
        token.practice = user.practice;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.clinicId = token.clinicId as string | undefined;
        session.user.clinicName = token.clinicName as string | undefined;
        session.user.npi = token.npi as string | undefined;
        session.user.dea = token.dea as string | undefined;
        session.user.license = token.license as string | undefined;
        session.user.phone = token.phone as string | undefined;
        session.user.practice = token.practice as string | undefined;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
};

export const auth = () => getServerSession(authOptions);
