'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileText,
  Users,
  Building2,
  Hospital,
  User,
  Package,
  CreditCard,
  DollarSign,
  LogOut,
  Pill,
  ShieldCheck,
  UserCog,
  ChevronRight,
} from 'lucide-react';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  salesOnly?: boolean;
}

const navSections: Array<{ title: string; adminOnly?: boolean; items: NavItem[] }> = [
  {
    title: 'RX',
    items: [
      { href: '/prescriptions', label: 'Prescriptions', icon: <FileText className="h-4 w-4" /> },
      { href: '/patients', label: 'Patients', icon: <Users className="h-4 w-4" /> },
      { href: '/pharmacies', label: 'Pharmacies', icon: <Building2 className="h-4 w-4" /> },
    ],
  },
  {
    title: 'DATA',
    items: [
      { href: '/billing', label: 'Billing', icon: <CreditCard className="h-4 w-4" /> },
      { href: '/sales', label: 'Sales', icon: <DollarSign className="h-4 w-4" />, salesOnly: true },
      { href: '/providers', label: 'Providers', icon: <Hospital className="h-4 w-4" />, adminOnly: true },
    ],
  },
  {
    title: 'ADMIN',
    adminOnly: true,
    items: [
      { href: '/clinics', label: 'Clinics', icon: <Building2 className="h-4 w-4" />, adminOnly: true },
      { href: '/products', label: 'Products', icon: <Package className="h-4 w-4" />, adminOnly: true },
      { href: '/users', label: 'Users', icon: <UserCog className="h-4 w-4" />, adminOnly: true },
    ],
  },
];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAdmin = session?.user?.role === 'admin';
  const isSales = isAdmin || ['sales_manager', 'sales_rep'].includes(session?.user?.role || '');

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      signOut({ callbackUrl: '/login' });
    }, INACTIVITY_TIMEOUT);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status !== 'authenticated') return;

    resetTimer();

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [status, resetTimer, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading PrestigeScripts...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col flex-shrink-0 overflow-y-auto">
        {/* Logo */}
        <div className="p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 rounded-lg p-2">
              <Pill className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">PrestigeScripts</p>
              <p className="text-slate-400 text-xs">Pharmacy Portal</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <User className="h-4 w-4 text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{session?.user?.name}</p>
              <p className="text-slate-400 text-xs truncate">
                {session?.user?.clinicName || session?.user?.role?.toUpperCase()}
              </p>
            </div>
            {isAdmin && (
              <div className="ml-auto">
                <ShieldCheck className="h-4 w-4 text-blue-400" aria-label="Admin" />
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-6">
          {navSections.map((section) => {
            if (section.adminOnly && !isAdmin) return null;
            const visibleItems = section.items.filter((item) => {
              if (item.adminOnly && !isAdmin) return false;
              if (item.salesOnly && !isSales) return false;
              return true;
            });
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title}>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest px-3 mb-2">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                        {isActive && <ChevronRight className="h-3 w-3 opacity-60" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-700/50">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
          <p className="text-slate-600 text-xs px-3 mt-2 text-center">
            Auto-logout after 15 min inactivity
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
