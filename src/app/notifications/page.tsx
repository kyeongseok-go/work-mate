'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, ChevronDown, ChevronRight, Info, X, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { notifications as initialNotifications, type Notification, type NotificationPriority } from '@/data/notifications';
import { useFeatureStore } from '@/store/featureStore';
import { useWorkLifeStore } from '@/store/workLifeStore';
import { cn } from '@/lib/utils';
import type { ClassifiedNotification, RecommendedAction } from '@/app/api/classify/route';
import { type Severity, SEVERITY_META, isAtLeastAsSevere } from '@/lib/severity';

const ACTION_META: Record<RecommendedAction, { label: string; icon: string }> = {
  reply_now: { label: '즉시 답장', icon: '⚡' },
  schedule: { label: '일정 잡기', icon: '📅' },
  delegate: { label: '위임 검토', icon: '👥' },
  ignore: { label: '조치 불필요', icon: '➖' },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Toast {
  id: string;
  message: string;
}

interface NotificationWithAI extends Notification {
  aiPriority?: NotificationPriority;
  aiSeverity?: Severity;
  aiUrgencyScore?: number;
  aiRecommendedAction?: RecommendedAction;
  aiReason?: string;
  aiConfidence?: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const priorityConfig = {
  urgent: {
    label: '긴급',
    emoji: '🔴',
    dotColor: '#2563eb',
    bgColor: 'rgba(37, 99, 235, 0.05)',
    borderColor: 'rgba(37, 99, 235, 0.2)',
    textColor: '#2563eb',
    badgeBg: 'rgba(37, 99, 235, 0.1)',
    headerBg: 'rgba(37, 99, 235, 0.06)',
    headerBorder: 'rgba(37, 99, 235, 0.15)',
  },
  important: {
    label: '중요',
    emoji: '🟡',
    dotColor: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.05)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
    textColor: '#d97706',
    badgeBg: 'rgba(245, 158, 11, 0.1)',
    headerBg: 'rgba(245, 158, 11, 0.06)',
    headerBorder: 'rgba(245, 158, 11, 0.15)',
  },
  info: {
    label: '참고',
    emoji: '🔵',
    dotColor: '#6b7280',
    bgColor: 'white',
    borderColor: '#e5e7eb',
    textColor: '#6b7280',
    badgeBg: '#f3f4f6',
    headerBg: '#f9fafb',
    headerBorder: '#e5e7eb',
  },
};

// ─── Utils ────────────────────────────────────────────────────────────────────

function formatTime(ts: string): string {
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg max-w-sm"
        >
          <Sparkles size={14} className="flex-shrink-0 text-amber-400" />
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="opacity-60 hover:opacity-100 transition-opacity">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-gray-100 bg-white">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-gray-200 mt-1.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-12 rounded bg-gray-200" />
                <div className="h-4 w-32 rounded bg-gray-200" />
              </div>
              <div className="h-3 w-3/4 rounded bg-gray-100" />
            </div>
            <div className="h-3 w-10 rounded bg-gray-100 flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

function IntegrationInfoBox({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="mb-5 rounded-xl border p-4 flex items-start gap-3"
      style={{ backgroundColor: 'rgba(37, 99, 235, 0.04)', borderColor: 'rgba(37, 99, 235, 0.2)' }}
    >
      <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#2563eb' }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 mb-0.5">그룹웨어 알림 API 통합</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          이 기능은 그룹웨어의 시스템 알림 API와 연동 시 실시간 알림 분류가 가능합니다.
          현재는 데모 데이터로 AI 분류 기능을 시연합니다.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

interface AINotificationCardProps {
  notification: NotificationWithAI;
  onPriorityChange: (id: string, priority: NotificationPriority) => void;
}

function AINotificationCard({ notification: n, onPriorityChange }: AINotificationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const effectivePriority = n.aiPriority ?? n.priority;
  const config = priorityConfig[effectivePriority];

  return (
    <div
      className={cn('p-4 rounded-xl border transition-all', !n.isRead ? 'shadow-sm' : 'opacity-75')}
      style={{ backgroundColor: config.bgColor, borderColor: config.borderColor }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: n.isRead ? '#d1d5db' : config.dotColor }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Priority badge */}
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                style={{ backgroundColor: config.badgeBg, color: config.textColor }}
              >
                {config.emoji} {config.label}
              </span>
              {/* AI badge */}
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-500">
                AI 분류
              </span>
              {/* Severity badge (공유 P0~P3 모델) */}
              {n.aiSeverity && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white"
                  style={{ backgroundColor: SEVERITY_META[n.aiSeverity].color }}
                  title={SEVERITY_META[n.aiSeverity].desc}
                >
                  {n.aiSeverity}
                </span>
              )}
              {/* Urgency score */}
              {n.aiUrgencyScore !== undefined && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500">
                  긴급도 {n.aiUrgencyScore}/10
                </span>
              )}
              {!n.isRead && (
                <span className="text-[10px] font-medium" style={{ color: config.textColor }}>
                  NEW
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">
              {formatTime(n.timestamp)}
            </span>
          </div>

          <p className={cn('text-sm font-semibold', n.isRead ? 'text-gray-600' : 'text-gray-900')}>
            {n.title}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>

          {/* Recommended action (AI 라우팅) */}
          {n.aiRecommendedAction && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                {ACTION_META[n.aiRecommendedAction].icon} 추천: {ACTION_META[n.aiRecommendedAction].label}
              </span>
            </div>
          )}

          {/* Action row */}
          <div className="mt-2.5 flex items-center gap-3 flex-wrap">
            {/* AI reason expandable */}
            {n.aiReason && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-700 transition-colors"
              >
                <Sparkles size={11} />
                AI 판단 근거 보기
                <ChevronDown
                  size={11}
                  className={cn('transition-transform', expanded && 'rotate-180')}
                />
              </button>
            )}

            {/* Action label */}
            {n.actionLabel && !n.isRead && (
              <button
                className="flex items-center gap-1 text-xs font-medium transition-colors"
                style={{ color: config.textColor }}
              >
                {n.actionLabel}
                <ChevronRight size={11} />
              </button>
            )}

            {/* Priority override dropdown */}
            <div className="ml-auto">
              <select
                value={effectivePriority}
                onChange={(e) => onPriorityChange(n.id, e.target.value as NotificationPriority)}
                className="text-[10px] border border-gray-200 rounded-md px-1.5 py-0.5 bg-white text-gray-500 cursor-pointer hover:border-gray-300 transition-colors focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="urgent">🔴 긴급</option>
                <option value="important">🟡 중요</option>
                <option value="info">🔵 참고</option>
              </select>
            </div>
          </div>

          {/* AI reason panel */}
          {expanded && n.aiReason && (
            <div className="mt-2 p-2.5 rounded-lg bg-purple-50 border border-purple-100">
              <p className="text-xs text-purple-700 leading-relaxed">
                <span className="font-semibold">AI 분석:</span> {n.aiReason}
              </p>
              {n.aiConfidence !== undefined && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-[10px] text-purple-400">신뢰도</span>
                  <div className="flex-1 h-1 bg-purple-200 rounded-full">
                    <div
                      className="h-1 bg-purple-400 rounded-full transition-all"
                      style={{ width: `${Math.round(n.aiConfidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-purple-500 font-medium">
                    {Math.round(n.aiConfidence * 100)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SimpleNotificationCardProps {
  notification: Notification;
  isMuted?: boolean;
  isUrgentBypass?: boolean;
}

function SimpleNotificationCard({ notification: n, isMuted, isUrgentBypass }: SimpleNotificationCardProps) {
  const typeIconMap: Record<string, string> = {
    alert: '⚠️',
    mention: '💬',
    review: '📋',
    meeting: '📅',
    system: '🔧',
    approval: '✅',
  };

  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-all',
        !n.isRead ? 'shadow-sm' : 'opacity-70',
        isMuted ? 'opacity-50 bg-gray-50 border-gray-100' : 'bg-white border-gray-100',
        isUrgentBypass ? 'ring-1 ring-red-300 border-red-200' : ''
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-base flex-shrink-0 mt-0.5">{typeIconMap[n.type] ?? '🔔'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className={cn('text-sm font-semibold', n.isRead ? 'text-gray-600' : 'text-gray-900')}>
                {n.title}
              </p>
              {isUrgentBypass && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
                  🔴 긴급
                </span>
              )}
              {isMuted && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">
                  🔕 무음
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">
              {formatTime(n.timestamp)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const notificationAIEnabled = useFeatureStore((s) => s.features.notificationAI);
  const workLifeEnabled = useFeatureStore((s) => s.features.workLifeMode);
  const workLifeStore = useWorkLifeStore();
  const isOutside = workLifeEnabled && workLifeStore.isOutsideWorkHours();

  // Simple mode state
  const [simpleFilter, setSimpleFilter] = useState<'all' | NotificationPriority>('all');

  // AI mode state
  const [aiNotifications, setAiNotifications] = useState<NotificationWithAI[]>([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [hasClassified, setHasClassified] = useState(false);
  const [classifyError, setClassifyError] = useState<string | null>(null);
  const [showInfoBox, setShowInfoBox] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const runClassification = useCallback(async () => {
    setIsClassifying(true);
    setClassifyError(null);

    try {
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: initialNotifications }),
      });

      const result = await response.json() as { success: boolean; data?: ClassifiedNotification[]; error?: string };

      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'AI 분류에 실패했습니다.');
      }

      const classifiedMap = new Map<string, ClassifiedNotification>(
        result.data.map((c) => [c.id, c])
      );

      const enriched: NotificationWithAI[] = initialNotifications.map((n) => {
        const classified = classifiedMap.get(n.id);
        return {
          ...n,
          aiPriority: classified?.priority ?? n.priority,
          aiSeverity: classified?.severity,
          aiUrgencyScore: classified?.urgencyScore,
          aiRecommendedAction: classified?.recommendedAction,
          aiReason: classified?.reason,
          aiConfidence: classified?.confidence,
        };
      });

      setAiNotifications(enriched);
      setHasClassified(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI 분류 중 오류가 발생했습니다.';
      setClassifyError(msg);
    } finally {
      setIsClassifying(false);
    }
  }, []);

  // Auto-run classification when AI mode is first enabled
  useEffect(() => {
    if (notificationAIEnabled && !hasClassified && !isClassifying) {
      runClassification();
    }
  }, [notificationAIEnabled, hasClassified, isClassifying, runClassification]);

  const handlePriorityChange = useCallback(
    (id: string, newPriority: NotificationPriority) => {
      setAiNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, aiPriority: newPriority } : n))
      );

      const n = aiNotifications.find((x) => x.id === id);
      const typeLabel = n?.type === 'alert' ? '알림'
        : n?.type === 'mention' ? '멘션'
        : n?.type === 'review' ? '리뷰'
        : n?.type === 'meeting' ? '회의'
        : n?.type === 'approval' ? '승인'
        : '시스템 알림';

      const priorityLabel = priorityConfig[newPriority].label;
      addToast(`학습 반영: ${typeLabel}을 ${priorityLabel}(으)로 분류하도록 학습했습니다 (시뮬레이션)`);
    },
    [aiNotifications, addToast]
  );

  // ── Simple mode ────────────────────────────────────────────────────────────

  const simpleCounts = {
    all: initialNotifications.length,
    urgent: initialNotifications.filter((n) => n.priority === 'urgent').length,
    important: initialNotifications.filter((n) => n.priority === 'important').length,
    info: initialNotifications.filter((n) => n.priority === 'info').length,
  };

  const unreadCount = initialNotifications.filter((n) => !n.isRead).length;

  const simpleFiltered = initialNotifications.filter((n) =>
    simpleFilter === 'all' ? true : n.priority === simpleFilter
  );

  // ── AI mode derived ────────────────────────────────────────────────────────

  const aiGrouped = {
    urgent: aiNotifications.filter((n) => (n.aiPriority ?? n.priority) === 'urgent'),
    important: aiNotifications.filter((n) => (n.aiPriority ?? n.priority) === 'important'),
    info: aiNotifications.filter((n) => (n.aiPriority ?? n.priority) === 'info'),
  };

  const aiCounts = {
    urgent: aiGrouped.urgent.length,
    important: aiGrouped.important.length,
    info: aiGrouped.info.length,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!notificationAIEnabled) {
    // ── SIMPLE MODE ──────────────────────────────────────────────────────────
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 md:px-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Bell size={20} className="text-gray-700" />
            <h1 className="text-xl font-bold text-gray-900">알림</h1>
          </div>
          <p className="text-sm text-gray-500">읽지 않은 알림 {unreadCount}건</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(['all', 'urgent', 'important', 'info'] as const).map((f) => {
            const isActive = simpleFilter === f;
            const label = f === 'all' ? '전체' : priorityConfig[f].label;
            const count = simpleCounts[f];
            return (
              <button
                key={f}
                onClick={() => setSimpleFilter(f)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0',
                  isActive ? 'text-white' : 'bg-white text-gray-500 border border-gray-200 hover:text-gray-700'
                )}
                style={isActive ? { backgroundColor: 'var(--brand-primary)' } : {}}
              >
                {label}
                <span
                  className={cn(
                    'text-[10px] font-bold px-1 rounded',
                    isActive ? 'bg-red-700/30 text-red-100' : 'bg-gray-100 text-gray-500'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Work-life off-hours banner in notifications */}
        {isOutside && workLifeStore.autoMute && (
          <div
            className="mb-4 px-4 py-3 rounded-xl flex items-center gap-2"
            style={{
              backgroundColor: 'rgba(88, 28, 235, 0.06)',
              border: '1px solid rgba(88,28,235,0.15)',
            }}
          >
            <span>🌙</span>
            <span className="text-xs font-semibold text-purple-800">퇴근 시간 외 — 알림 묶음 보관 중</span>
            <span className="text-[10px] text-purple-400 ml-1">
              {workLifeStore.passThreshold} 이상만 즉시 통과 · 나머지는 복귀 시 일괄
            </span>
          </div>
        )}

        {/* List */}
        <div className="space-y-2">
          {simpleFiltered.map((n) => {
            const isUrgentBypass =
              isOutside && workLifeStore.autoMute
                ? workLifeStore.isWhitelistedMessage(n.title + ' ' + n.body)
                : false;
            const isMuted = isOutside && workLifeStore.autoMute && !isUrgentBypass;
            return (
              <SimpleNotificationCard
                key={n.id}
                notification={n}
                isMuted={isMuted}
                isUrgentBypass={isUrgentBypass}
              />
            );
          })}
        </div>

        {simpleFiltered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Bell size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">알림이 없습니다</p>
          </div>
        )}
      </div>
    );
  }

  // ── AI MODE ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-gray-700" />
            <h1 className="text-xl font-bold text-gray-900">알림</h1>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              AI 분류
            </span>
          </div>

          {hasClassified && (
            <button
              onClick={runClassification}
              disabled={isClassifying}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={cn(isClassifying && 'animate-spin')} />
              재분류
            </button>
          )}
        </div>

        {/* Stats */}
        {hasClassified && !isClassifying && (
          <p className="text-sm text-gray-500">
            긴급{' '}
            <span className="font-semibold" style={{ color: '#2563eb' }}>
              {aiCounts.urgent}
            </span>{' '}
            / 중요{' '}
            <span className="font-semibold text-amber-500">{aiCounts.important}</span> / 참고{' '}
            <span className="font-semibold text-gray-500">{aiCounts.info}</span>
          </p>
        )}
      </div>

      {/* Info box */}
      {showInfoBox && <IntegrationInfoBox onDismiss={() => setShowInfoBox(false)} />}

      {/* Loading state */}
      {isClassifying && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4 p-4 rounded-xl bg-purple-50 border border-purple-100">
            <Loader2 size={16} className="animate-spin text-purple-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-purple-800">AI 분류 실행 중</p>
              <p className="text-xs text-purple-500 mt-0.5">
                {initialNotifications.length}개 알림 분석 중...
              </p>
            </div>
          </div>
          <NotificationSkeleton />
        </div>
      )}

      {/* Error state */}
      {classifyError && !isClassifying && (
        <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200">
          <p className="text-sm font-semibold text-red-700 mb-1">AI 분류 실패</p>
          <p className="text-xs text-red-500 mb-3">{classifyError}</p>
          <button
            onClick={runClassification}
            className="text-xs font-medium text-white px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Work-Life 묶음 다이제스트 (AI 심각도 기반) */}
      {hasClassified && !isClassifying && isOutside && workLifeStore.autoMute && (() => {
        const scored = aiNotifications.filter((n) => n.aiSeverity);
        const passed = scored.filter((n) =>
          isAtLeastAsSevere(n.aiSeverity!, workLifeStore.passThreshold)
        ).length;
        const batched = scored.length - passed;
        return (
          <div
            className="mb-5 px-4 py-3 rounded-xl"
            style={{ backgroundColor: 'rgba(88, 28, 235, 0.06)', border: '1px solid rgba(88,28,235,0.15)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span>🌙</span>
              <span className="text-xs font-semibold text-purple-800">
                퇴근 모드 — 심각도 기반 라우팅 적용 중
              </span>
            </div>
            <p className="text-[11px] text-purple-500 leading-relaxed">
              즉시 통과 <span className="font-bold">{passed}</span>건
              ({workLifeStore.passThreshold} 이상) · 묶음 보관{' '}
              <span className="font-bold">{batched}</span>건 (복귀 시 일괄 전달)
            </p>
          </div>
        );
      })()}

      {/* Classified groups */}
      {hasClassified && !isClassifying && (
        <div className="space-y-6">
          {(['urgent', 'important', 'info'] as const).map((priority) => {
            const group = aiGrouped[priority];
            if (group.length === 0) return null;
            const config = priorityConfig[priority];

            return (
              <section key={priority}>
                {/* Group header */}
                <div
                  className="flex items-center justify-between px-3 py-2 rounded-lg mb-2"
                  style={{ backgroundColor: config.headerBg, border: `1px solid ${config.headerBorder}` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{config.emoji}</span>
                    <span className="text-sm font-semibold" style={{ color: config.textColor }}>
                      {config.label}
                    </span>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: config.dotColor }}
                  >
                    {group.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {group.map((n) => (
                    <AINotificationCard
                      key={n.id}
                      notification={n}
                      onPriorityChange={handlePriorityChange}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Empty state when not yet classified and not loading */}
      {!hasClassified && !isClassifying && !classifyError && (
        <div className="text-center py-16 text-gray-400">
          <Sparkles size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm mb-4">AI 분류를 시작하려면 버튼을 클릭하세요</p>
          <button
            onClick={runClassification}
            className="text-sm font-medium text-white px-5 py-2.5 rounded-xl transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            AI 분류 실행
          </button>
        </div>
      )}

      {/* Toast container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
