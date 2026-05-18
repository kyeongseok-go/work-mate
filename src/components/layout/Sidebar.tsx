'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  MessageSquare,
  Mail,
  Bell,
  Search,
  Settings,
  Zap,
} from 'lucide-react';
import { useFeatureStore } from '@/store/featureStore';
import { getTotalUnread } from '@/data/messages';
import { getUnreadCount } from '@/data/notifications';
import { cn } from '@/lib/utils';
import { BRAND } from '@/config/brand';

const navItems = [
  { href: '/', label: '홈', icon: Home },
  { href: '/chat/project-a', label: '채팅', icon: MessageSquare, badgeKey: 'chat' },
  { href: '/messages', label: '쪽지', icon: Mail },
  { href: '/notifications', label: '알림', icon: Bell, badgeKey: 'notifications' },
  { href: '/search', label: '검색', icon: Search },
  { href: '/settings', label: '설정', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const activeCount = useFeatureStore((s) => s.getActiveCount());
  const chatUnread = getTotalUnread();
  const notifUnread = getUnreadCount();

  const getBadgeCount = (badgeKey?: string) => {
    if (badgeKey === 'chat') return chatUnread;
    if (badgeKey === 'notifications') return notifUnread;
    return 0;
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href.startsWith('/chat/')) return pathname.startsWith('/chat/');
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside
      className="flex flex-col w-[72px] h-screen sticky top-0 z-30"
      style={{ backgroundColor: 'var(--sidebar-bg)' }}
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-white/10">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          {BRAND.appNameShort}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center py-4 gap-1">
        {navItems.map(({ href, label, icon: Icon, badgeKey }) => {
          const count = getBadgeCount(badgeKey);
          const active = isActive(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-150 group',
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/8'
              )}
              style={active ? { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)' } : {}}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                {count > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full text-white text-[10px] font-bold flex items-center justify-center leading-none"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 font-medium tracking-tight">{label}</span>

              {/* Tooltip on hover */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                {label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* AI Status */}
      <div className="flex flex-col items-center pb-4">
        {activeCount > 0 && (
          <div
            className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl w-14"
            style={{ backgroundColor: 'rgba(29, 78, 216, 0.2)' }}
          >
            <Zap size={14} className="text-red-400" />
            <span className="text-[9px] text-red-300 font-semibold">{activeCount}개</span>
            <span className="text-[8px] text-red-400/70">AI ON</span>
          </div>
        )}
      </div>
    </aside>
  );
}
