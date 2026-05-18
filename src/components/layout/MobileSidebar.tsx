'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Home,
  MessageSquare,
  Mail,
  Bell,
  Search,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
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
    <header
      className="flex md:hidden items-center justify-between h-14 px-4 sticky top-0 z-40 border-b"
      style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'rgba(255,255,255,0.1)' }}
    >
      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="text-white/70 hover:text-white transition-colors p-1">
              <Menu size={22} />
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-64 p-0 border-0"
            style={{ backgroundColor: 'var(--sidebar-bg)' }}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between h-14 px-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    {BRAND.appNameShort}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{BRAND.appName}</div>
                    <div className="text-white/40 text-xs">{BRAND.orgLabel}</div>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 py-4 px-2 flex flex-col gap-1">
                {navItems.map(({ href, label, icon: Icon, badgeKey }) => {
                  const count = getBadgeCount(badgeKey);
                  const active = isActive(href);

                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                        active
                          ? 'bg-white/15 text-white'
                          : 'text-white/50 hover:text-white hover:bg-white/8'
                      )}
                    >
                      <Icon size={18} />
                      <span className="text-sm font-medium">{label}</span>
                      {count > 0 && (
                        <span
                          className="ml-auto min-w-[20px] h-5 px-1 rounded-full text-white text-xs font-bold flex items-center justify-center"
                          style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                          {count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {activeCount > 0 && (
                <div className="px-4 pb-4">
                  <div
                    className="px-3 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: 'rgba(29, 78, 216, 0.15)' }}
                  >
                    <span className="text-red-400 font-medium">AI 기능 {activeCount}개 활성화</span>
                  </div>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          {BRAND.appNameShort}
        </div>
        <span className="text-white font-semibold text-sm">{BRAND.appName}</span>
      </div>

      <div className="flex items-center gap-2">
        {activeCount > 0 && (
          <div
            className="px-2 py-1 rounded-full text-xs text-red-300 font-medium"
            style={{ backgroundColor: 'rgba(29, 78, 216, 0.2)' }}
          >
            AI {activeCount}
          </div>
        )}
      </div>
    </header>
  );
}
