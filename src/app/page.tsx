'use client';

import Link from 'next/link';
import {
  MessageSquare,
  Bell,
  ChevronRight,
  Zap,
  AlertCircle,
  Settings,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useFeatureStore, FEATURE_CONFIGS } from '@/store/featureStore';
import { chatRooms, getTotalUnread } from '@/data/messages';
import { notifications, getUnreadCount } from '@/data/notifications';
import { PriorityDashboard } from '@/components/chat/PriorityDashboard';
import { usePriorityStore, getPriorityTier, PRIORITY_INDICATORS } from '@/store/priorityStore';

function formatRelativeTime(ts: string): string {
  const now = new Date('2024-04-24T18:00:00');
  const date = new Date(ts);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '방금';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${diffDays}일 전`;
}

export default function HomePage() {
  const { features, getActiveCount } = useFeatureStore();
  const { getPriorityScore } = usePriorityStore();
  const activeCount = getActiveCount();
  const totalUnread = getTotalUnread();
  const notifUnread = getUnreadCount();
  const urgentNotifs = notifications.filter(n => n.priority === 'urgent' && !n.isRead);

  // Priority-sorted chat rooms (only when feature is ON)
  const sortedChatRooms = features.priorityLearning
    ? [...chatRooms].sort((a, b) => {
        const scoreA = getPriorityScore(a.id);
        const scoreB = getPriorityScore(b.id);
        return scoreB - scoreA;
      })
    : chatRooms;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              안녕하세요, 고연구원님 👋
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              2024년 4월 24일 수요일 · 개발팀 선임 연구원
            </p>
          </div>
          {activeCount > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ backgroundColor: 'rgba(37, 99, 235, 0.08)', color: 'var(--brand-primary)' }}
            >
              <Zap size={14} />
              AI {activeCount}개 활성화
            </div>
          )}
        </div>
      </div>

      {/* Urgent Notifications Banner */}
      {urgentNotifs.length > 0 && (
        <div
          className="mb-6 rounded-xl p-4 border"
          style={{
            backgroundColor: 'rgba(29, 78, 216, 0.04)',
            borderColor: 'rgba(29, 78, 216, 0.2)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} style={{ color: 'var(--brand-primary)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--brand-primary)' }}>
              긴급 알림 {urgentNotifs.length}건
            </span>
          </div>
          <div className="space-y-1">
            {urgentNotifs.slice(0, 2).map((n) => (
              <div key={n.id} className="text-sm text-gray-700 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                {n.title}
              </div>
            ))}
            {urgentNotifs.length > 2 && (
              <Link href="/notifications" className="text-xs text-red-500 hover:underline">
                +{urgentNotifs.length - 2}건 더 보기
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
        <StatCard
          href="/chat/project-a"
          icon={<MessageSquare size={20} />}
          label="읽지 않은 메시지"
          value={totalUnread}
          accent
        />
        <StatCard
          href="/notifications"
          icon={<Bell size={20} />}
          label="읽지 않은 알림"
          value={notifUnread}
        />
        <StatCard
          href="/settings"
          icon={<Zap size={20} />}
          label="AI 기능 활성화"
          value={`${activeCount}/7`}
        />
        <StatCard
          href="/chat/project-a"
          icon={<Clock size={20} />}
          label="진행 중인 프로젝트"
          value={1}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Chat Rooms */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-800">채팅방</h2>
              {features.priorityLearning && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  AI 정렬
                </span>
              )}
            </div>
            <Link href="/chat/project-a" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              전체 보기
            </Link>
          </div>
          <div className="space-y-2">
            {sortedChatRooms.map((room) => {
              const lastMsg = room.messages[room.messages.length - 1];
              const priorityScore = features.priorityLearning ? getPriorityScore(room.id) : null;
              const tier = priorityScore !== null ? getPriorityTier(priorityScore) : null;
              const indicator = tier ? PRIORITY_INDICATORS[tier] : null;
              return (
                <Link key={room.id} href={`/chat/${room.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-gray-50 transition-colors border border-gray-100 group">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{
                        backgroundColor:
                          room.category === 'project'
                            ? 'var(--brand-primary)'
                            : room.category === 'executive'
                            ? '#2d3450'
                            : room.category === 'casual'
                            ? '#6b7280'
                            : '#3b82f6',
                      }}
                    >
                      {room.name.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-800 truncate">{room.name}</span>
                        {room.isPinned && (
                          <span className="text-[10px] text-gray-400 flex-shrink-0">📌</span>
                        )}
                        {indicator && (
                          <span className="text-[11px] flex-shrink-0" title={`우선순위 ${indicator.label}`}>
                            {indicator.dot}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {lastMsg?.content ?? '메시지 없음'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[10px] text-gray-400">
                        {formatRelativeTime(room.lastActivity)}
                      </span>
                      {room.unreadCount > 0 && (
                        <span
                          className="min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                          style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Priority Dashboard — visible only when priorityLearning is ON */}
          <PriorityDashboard />

          {/* Recent Notifications */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">최근 알림</h2>
              <Link href="/notifications" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                전체 보기
              </Link>
            </div>
            <div className="space-y-2">
              {notifications
                .filter(n => !n.isRead)
                .slice(0, 4)
                .map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-xl bg-white border border-gray-100 flex items-start gap-3"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{
                        backgroundColor:
                          n.priority === 'urgent'
                            ? 'var(--brand-primary)'
                            : n.priority === 'important'
                            ? '#f59e0b'
                            : '#6b7280',
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{n.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{n.body}</p>
                    </div>
                  </div>
                ))}
            </div>
          </section>

          {/* AI Features Status */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">AI 기능 현황</h2>
              <Link href="/settings" className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-0.5">
                <Settings size={12} />
                설정
              </Link>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {FEATURE_CONFIGS.map((cfg, i) => {
                const isOn = features[cfg.key as keyof typeof features];
                return (
                  <div
                    key={cfg.key}
                    className={`flex items-center gap-3 px-3 py-2.5 ${
                      i < FEATURE_CONFIGS.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                  >
                    <span className="text-base">{cfg.icon}</span>
                    <span className="flex-1 text-sm text-gray-700">{cfg.nameKo}</span>
                    <div className="flex items-center gap-1.5">
                      {isOn ? (
                        <CheckCircle2 size={14} className="text-green-500" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-200" />
                      )}
                      <span
                        className={`text-[10px] font-medium ${
                          isOn ? 'text-green-600' : 'text-gray-400'
                        }`}
                      >
                        {isOn ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {activeCount === 0 && (
              <Link
                href="/settings"
                className="mt-2 flex items-center justify-center gap-1 text-xs py-2 rounded-lg transition-colors"
                style={{ color: 'var(--brand-primary)' }}
              >
                <Zap size={12} />
                AI 기능 활성화하러 가기
                <ChevronRight size={12} />
              </Link>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  href,
  icon,
  label,
  value,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <Link href={href}>
      <div
        className="p-4 rounded-xl border transition-all hover:shadow-sm cursor-pointer"
        style={{
          backgroundColor: accent ? 'var(--brand-primary)' : 'white',
          borderColor: accent ? 'var(--brand-primary)' : '#e5e7eb',
        }}
      >
        <div className={`mb-2 ${accent ? 'text-red-100' : 'text-gray-400'}`}>
          {icon}
        </div>
        <div className={`text-2xl font-bold ${accent ? 'text-white' : 'text-gray-900'}`}>
          {value}
        </div>
        <div className={`text-xs mt-0.5 ${accent ? 'text-red-100' : 'text-gray-500'}`}>
          {label}
        </div>
      </div>
    </Link>
  );
}
