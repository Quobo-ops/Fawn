'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, Brain, Target, Calendar, Settings, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '@/lib/api';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: MessageCircle },
  { name: 'Memories', href: '/dashboard/memories', icon: Brain },
  { name: 'Goals', href: '/dashboard/goals', icon: Target },
  { name: 'Schedule', href: '/dashboard/schedule', icon: Calendar },
  { name: 'Companion', href: '/dashboard/companion', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const handleLogout = () => {
    api.clearToken();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-100">
            <Link href="/dashboard" className="text-2xl font-bold text-fawn-600">
              Fawn
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition',
                    isActive
                      ? 'bg-fawn-50 text-fawn-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
