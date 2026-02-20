import 'next-auth';
import { DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      clinicId?: string;
      clinicName?: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: string;
    clinicId?: string;
    clinicName?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    clinicId?: string;
    clinicName?: string;
  }
}
