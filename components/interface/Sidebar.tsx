'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  Zap, 
  Phone, 
  Send,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { href: '/dashboard/chat', icon: MessageSquare, labelKey: 'chats' },
  { href: '/contacts', icon: Users, labelKey: 'contacts' },
  { href: '/campaigns', icon: Send, labelKey: 'campaigns' },
  { href: '/templates', icon: FileText, labelKey: 'templates' },
  { href: '/automation', icon: Zap, labelKey: 'automation' },
  { href: '/calls', icon: Phone, labelKey: 'calls' },
  { href: '/analytics', icon: BarChart3, labelKey: 'analytics' },
  { href: '/settings', icon: Settings, labelKey: 'settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('Sidebar');

  return (
    <aside className="hidden md:flex flex-col w-20 lg:w-64 border-r bg-card h-screen sticky top-0 transition-all duration-300">
      <div className="p-6 flex justify-center lg:justify-start">
        {/* Logo is usually rendered in the layout, so we just provide navigation here */}
      </div>
      
      <nav className="flex-1 px-4 space-y-2 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 shrink-0",
                isActive ? "" : "group-hover:scale-110 transition-transform"
              )} />
              <span className="hidden lg:block font-medium truncate text-sm">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        {/* Optional: User mini-profile or collapse button */}
      </div>
    </aside>
  );
}
