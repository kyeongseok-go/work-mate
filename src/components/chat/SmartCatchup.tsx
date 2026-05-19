'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Sparkles, X, Layers } from 'lucide-react';
import { useFeatureStore } from '@/store/featureStore';
import { Message } from '@/data/messages';
import { SummaryResult } from '@/app/api/summarize/route';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { BRAND } from '@/config/brand';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SmartCatchupProps {
  roomId: string;
  messages: Message[];
  /** 이 방의 안 읽은 메시지 수 — 요약을 "안 본 구간"으로 한정하는 데 사용 */
  unreadCount: number;
}

type LoadState = 'idle' | 'loading' | 'success' | 'error';

// Catch-up window: summarize only what the user hasn't seen. This matches the
// feature's intent ("따라잡기") and keeps input/output within the model's
// token budget so summaries don't get truncated.
const MAX_SUMMARIZE = 120; // hard ceiling so very large backlogs stay bounded
const MIN_RECENT = 30; // when nothing is unread, still give recent context

// ─── Helpers ──────────────────────────────────────────────────────────────────

function urgencyLabel(level: SummaryResult['urgencyLevel']) {
  const map = {
    high: { label: '긴급', className: 'bg-red-100 text-red-700 border-red-200' },
    medium: { label: '중요', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    low: { label: '참고', className: 'bg-green-100 text-green-700 border-green-200' },
  };
  return map[level];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryLoadingCard() {
  return (
    <div className="mx-4 mt-3 mb-1 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm px-4 py-5 flex items-center gap-4">
        {/* Brand logo with a soft pulsing halo — signals "thinking" */}
        <div className="relative flex-shrink-0">
          <span
            className="absolute inset-0 rounded-xl animate-ping opacity-20"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          />
          <div
            className="relative w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {BRAND.appNameShort}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <Sparkles
              size={14}
              className="animate-pulse"
              style={{ color: 'var(--brand-primary)' }}
            />
            AI가 메시지를 요약하고 있어요
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            대화 맥락을 분석하는 중입니다… 잠시만 기다려 주세요
          </p>
          <div className="mt-2.5 h-1 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full w-1/3 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  icon: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({
  title,
  icon,
  count,
  children,
  defaultOpen = true,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (count === 0) return null;

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-base leading-none">{icon}</span>
        <span className="flex-1 text-sm font-medium text-gray-700">{title}</span>
        <span className="text-xs text-gray-400 font-medium mr-1">{count}건</span>
        {open ? (
          <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="divide-y divide-gray-50">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Comparison Demo ──────────────────────────────────────────────────────────

interface ComparisonDemoProps {
  messages: Message[];
  summary: SummaryResult;
  onClose: () => void;
}

function ComparisonDemo({ messages, summary, onClose }: ComparisonDemoProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Layers size={18} style={{ color: 'var(--brand-primary)' }} />
            <span className="font-semibold text-gray-900 text-sm">AI ON vs OFF 비교</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex gap-0 divide-x divide-gray-100">
          {/* OFF side */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                  AI OFF
                </span>
                <span className="text-xs text-gray-400">{messages.length}개 메시지 스크롤</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {messages.slice(0, 20).map((msg) => (
                <div key={msg.id} className="text-xs text-gray-600 leading-relaxed">
                  <span className="font-medium text-gray-800">{msg.senderId}:</span>{' '}
                  <span className="text-gray-600">{msg.content.slice(0, 80)}{msg.content.length > 80 ? '...' : ''}</span>
                </div>
              ))}
              {messages.length > 20 && (
                <div className="text-xs text-gray-400 italic text-center pt-2">
                  ... 외 {messages.length - 20}개 메시지 더
                </div>
              )}
            </div>
          </div>

          {/* ON side */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-2.5 bg-red-50 border-b border-red-100">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold text-white px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  <Sparkles size={10} />
                  AI ON
                </span>
                <span className="text-xs text-gray-400">구조화된 요약</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {summary.decisions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">🎯 결정사항</p>
                  <div className="space-y-1">
                    {summary.decisions.map((d, i) => (
                      <div key={i} className="text-xs bg-red-50 rounded-lg px-3 py-2 text-gray-700">
                        <span className="font-medium">{d.title}</span>
                        {d.by && <span className="text-gray-400 ml-1">— {d.by}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {summary.actionItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">✅ 액션 아이템</p>
                  <div className="space-y-1">
                    {summary.actionItems.map((a, i) => (
                      <div key={i} className="text-xs bg-blue-50 rounded-lg px-3 py-2 text-gray-700">
                        <span className="font-medium">{a.task}</span>
                        {a.assignee && <span className="text-blue-600 ml-1">→ {a.assignee}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {summary.mentions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">📢 나에 대한 멘션</p>
                  <div className="space-y-1">
                    {summary.mentions.map((m, i) => (
                      <div key={i} className="text-xs bg-purple-50 rounded-lg px-3 py-2 text-gray-700">
                        <span className="text-purple-600 font-medium">{m.from}</span>
                        {': '}{m.context}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {summary.limitedNote && (
                <div className="text-xs text-gray-400 italic px-1">{summary.limitedNote}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SmartCatchup({
  roomId,
  messages,
  unreadCount,
}: SmartCatchupProps) {
  const { features } = useFeatureStore();
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showComparison, setShowComparison] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Only summarize the unseen tail (fallback to recent context when fully
  // read), then hard-cap so an enormous backlog still fits the token budget.
  const catchup = useMemo(() => {
    const base =
      unreadCount > 0
        ? messages.slice(-unreadCount)
        : messages.slice(-MIN_RECENT);
    return base.slice(-MAX_SUMMARIZE);
  }, [messages, unreadCount]);
  const wasCapped = unreadCount > MAX_SUMMARIZE;

  // Feature gate — render nothing when toggle is OFF
  if (!features.smartCatchup) return null;

  // Don't show if too few messages
  if (messages.length < 5) return null;

  // Don't show banner after dismissed
  if (dismissed && loadState === 'idle') return null;

  const handleSummarize = async () => {
    setLoadState('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, messages: catchup }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'AI 요약 중 오류가 발생했습니다.');
      }

      setSummary(json.data as SummaryResult);
      setLoadState('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI 요약 중 오류가 발생했습니다.';
      setErrorMessage(msg);
      setLoadState('error');
    }
  };

  const urgency = summary ? urgencyLabel(summary.urgencyLevel) : null;

  return (
    <>
      {/* ── Loading skeleton ── */}
      {loadState === 'loading' && <SummaryLoadingCard />}

      {/* ── Idle banner ── */}
      {loadState === 'idle' && (
        <div className="mx-4 mt-3 mb-1">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm"
            style={{
              backgroundColor: 'rgba(37, 99, 235, 0.06)',
              borderColor: 'rgba(37, 99, 235, 0.25)',
            }}
          >
            <Sparkles size={16} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
            <span className="flex-1 text-gray-700">
              {unreadCount > 0 ? (
                <>
                  안 읽은 메시지{' '}
                  <span className="font-semibold">
                    {wasCapped ? unreadCount : catchup.length}개
                  </span>
                  {wasCapped && (
                    <>
                      {' '}중 최근{' '}
                      <span className="font-semibold">{catchup.length}개</span>
                    </>
                  )}
                </>
              ) : (
                <>
                  최근 메시지{' '}
                  <span className="font-semibold">{catchup.length}개</span>
                </>
              )}
            </span>
            <button
              onClick={handleSummarize}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90 flex-shrink-0"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              AI 요약 보기
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
              aria-label="닫기"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Error state ── */}
      {loadState === 'error' && (
        <div className="mx-4 mt-3 mb-1">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm">
            <span className="text-red-500 flex-shrink-0">⚠️</span>
            <span className="flex-1 text-red-700 text-xs">{errorMessage}</span>
            <button
              onClick={handleSummarize}
              className="text-xs text-red-600 font-medium underline flex-shrink-0"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* ── Success: Summary Card ── */}
      {loadState === 'success' && summary && (
        <div
          className="mx-4 mt-3 mb-1 animate-in slide-in-from-top-2 duration-300"
          style={{ animationDuration: '300ms' }}
        >
          <Card className="border border-gray-100 shadow-sm bg-white ring-0">
            <CardHeader className="border-b border-gray-50 pb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)' }}
                >
                  <Sparkles size={14} style={{ color: 'var(--brand-primary)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">
                    AI 메시지 요약
                  </p>
                  <p className="text-xs text-gray-400">
                    {summary.messageCount}개 메시지 분석
                  </p>
                </div>
                {urgency && (
                  <span
                    className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full border',
                      urgency.className
                    )}
                  >
                    {urgency.label}
                  </span>
                )}
                {/* Comparison button */}
                <button
                  onClick={() => setShowComparison(true)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2 py-1 transition-colors ml-1"
                  title="AI ON vs OFF 비교"
                >
                  <Layers size={11} />
                  <span className="hidden sm:inline">비교</span>
                </button>
                <button
                  onClick={() => {
                    setSummary(null);
                    setLoadState('idle');
                    setDismissed(false);
                  }}
                  className="text-gray-300 hover:text-gray-500 transition-colors p-0.5"
                  aria-label="닫기"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Key topics */}
              {summary.keyTopics.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {summary.keyTopics.map((topic, i) => (
                    <span
                      key={i}
                      className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}

              {/* Limited note for casual rooms */}
              {summary.limitedNote && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                  💡 {summary.limitedNote}
                </p>
              )}
            </CardHeader>

            <CardContent className="pt-3 space-y-2.5">
              {/* Decisions */}
              <CollapsibleSection
                title="핵심 결정사항"
                icon="🎯"
                count={summary.decisions.length}
              >
                {summary.decisions.map((d, i) => (
                  <div key={i} className="px-3 py-2.5 text-sm">
                    <p className="font-medium text-gray-800">{d.title}</p>
                    {d.detail && (
                      <p className="text-xs text-gray-500 mt-0.5">{d.detail}</p>
                    )}
                    {d.by && (
                      <p className="text-xs text-gray-400 mt-0.5">— {d.by}</p>
                    )}
                  </div>
                ))}
              </CollapsibleSection>

              {/* Action Items */}
              <CollapsibleSection
                title="액션 아이템"
                icon="✅"
                count={summary.actionItems.length}
              >
                {summary.actionItems.map((a, i) => (
                  <div key={i} className="px-3 py-2.5 flex items-start gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800">{a.task}</p>
                      {a.deadline && (
                        <p className="text-xs text-gray-400 mt-0.5">마감: {a.deadline}</p>
                      )}
                    </div>
                    {a.assignee && (
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 rounded-full px-2 py-0.5 flex-shrink-0">
                        {a.assignee}
                      </span>
                    )}
                  </div>
                ))}
              </CollapsibleSection>

              {/* Mentions */}
              <CollapsibleSection
                title="나에 대한 멘션"
                icon="📢"
                count={summary.mentions.length}
              >
                {summary.mentions.map((m, i) => (
                  <div key={i} className="px-3 py-2.5 text-sm">
                    <span
                      className="text-xs font-semibold rounded px-1 py-0.5 mr-1"
                      style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--brand-primary)' }}
                    >
                      {m.from}
                    </span>
                    <span className="text-gray-600">{m.context}</span>
                  </div>
                ))}
              </CollapsibleSection>

              {/* Attachments */}
              <CollapsibleSection
                title="공유된 파일"
                icon="📎"
                count={summary.attachments.length}
                defaultOpen={false}
              >
                {summary.attachments.map((att, i) => (
                  <div key={i} className="px-3 py-2.5 text-sm">
                    <p className="font-medium text-gray-800 truncate">{att.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {att.sharedBy} · {att.context}
                    </p>
                  </div>
                ))}
              </CollapsibleSection>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Comparison modal */}
      {showComparison && summary && (
        <ComparisonDemo
          messages={catchup}
          summary={summary}
          onClose={() => setShowComparison(false)}
        />
      )}
    </>
  );
}
