'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, X, RotateCcw } from 'lucide-react';
import { useFeatureStore } from '@/store/featureStore';
import { Message } from '@/data/messages';
import { ReplyDrafts } from '@/app/api/reply-draft/route';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReplyDraftProps {
  /** The last message received (not from the current user) */
  lastReceivedMessage: Message | null;
  /** Last 5 messages for context */
  conversationContext: Message[];
  /** Current user's display name */
  userName: string;
  /** Name of the sender of the received message */
  senderName?: string;
  /** Role of the sender */
  senderRole?: string;
  /** Callback when a draft is selected — inserts text into input */
  onSelectDraft: (text: string) => void;
}

type LoadState = 'idle' | 'loading' | 'success' | 'error';

// ─── Draft Card ───────────────────────────────────────────────────────────────

interface DraftCardProps {
  icon: string;
  label: string;
  text: string;
  accentClass: string;
  iconBgClass: string;
  onSelect: () => void;
  isSelected: boolean;
}

function DraftCard({
  icon,
  label,
  text,
  accentClass,
  iconBgClass,
  onSelect,
  isSelected,
}: DraftCardProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200',
        isSelected
          ? 'border-[#2563eb]/60 bg-[#2563eb]/5 shadow-sm'
          : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-sm',
          iconBgClass
        )}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-[10px] font-semibold mb-1', accentClass)}>{label}</p>
        <p className="text-sm text-gray-700 leading-relaxed break-words">{text}</p>
      </div>

      {/* Select button */}
      <button
        onClick={onSelect}
        className={cn(
          'flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all duration-150 mt-0.5',
          isSelected
            ? 'text-white bg-[#2563eb]'
            : 'text-[#2563eb] border border-[#2563eb]/30 hover:bg-[#2563eb] hover:text-white'
        )}
      >
        선택
      </button>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DraftSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-white">
          <div className="w-7 h-7 rounded-lg bg-gray-100 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-2.5 bg-gray-100 rounded w-12" />
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-2/3" />
          </div>
          <div className="w-10 h-7 bg-gray-100 rounded-lg flex-shrink-0" />
        </div>
      ))}
      <p className="text-center text-xs text-gray-400 py-1">AI가 답변을 준비 중...</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReplyDraft({
  lastReceivedMessage,
  conversationContext,
  userName,
  senderName,
  senderRole,
  onSelectDraft,
}: ReplyDraftProps) {
  const { features } = useFeatureStore();
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [drafts, setDrafts] = useState<ReplyDrafts | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Feature gate
  if (!features.smartReply) return null;

  // No point showing the button if there's no received message
  if (!lastReceivedMessage) return null;

  // Reset when lastReceivedMessage changes
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setIsOpen(false);
    setDrafts(null);
    setLoadState('idle');
    setSelectedKey(null);
  }, [lastReceivedMessage?.id]);

  // Close on outside click
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const fetchDrafts = async () => {
    setLoadState('loading');
    setErrorMessage('');
    setIsOpen(true);

    try {
      const res = await fetch('/api/reply-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receivedMessage: lastReceivedMessage,
          conversationContext,
          userName,
          senderName,
          senderRole,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'AI 답변 생성 중 오류가 발생했습니다.');
      }

      setDrafts(json.data as ReplyDrafts);
      setLoadState('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI 답변 생성 중 오류가 발생했습니다.';
      setErrorMessage(msg);
      setLoadState('error');
    }
  };

  const handleSelect = (key: string, text: string) => {
    setSelectedKey(key);
    // Brief visual feedback before sending to input
    setTimeout(() => {
      onSelectDraft(text);
      setIsOpen(false);
      setSelectedKey(null);
    }, 180);
  };

  const draftItems: { key: keyof ReplyDrafts; icon: string; label: string; accentClass: string; iconBgClass: string }[] = [
    {
      key: 'official',
      icon: '📝',
      label: '공식',
      accentClass: 'text-blue-600',
      iconBgClass: 'bg-blue-50',
    },
    {
      key: 'friendly',
      icon: '😊',
      label: '친근',
      accentClass: 'text-green-600',
      iconBgClass: 'bg-green-50',
    },
    {
      key: 'concise',
      icon: '⚡',
      label: '간결',
      accentClass: 'text-amber-600',
      iconBgClass: 'bg-amber-50',
    },
  ];

  return (
    <div ref={panelRef} className="relative">
      {/* ── Trigger button ── */}
      {!isOpen && (
        <div className="px-4 pb-2">
          <button
            onClick={fetchDrafts}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#2563eb] hover:bg-[#2563eb]/8 transition-colors px-3 py-1.5 rounded-lg border border-[#2563eb]/25 hover:border-[#2563eb]/40"
          >
            <Sparkles size={12} />
            ✨ AI 답변 추천
          </button>
        </div>
      )}

      {/* ── Draft panel (slides up) ── */}
      {isOpen && (
        <div className="mx-4 mb-2 rounded-2xl border border-gray-100 bg-gray-50 shadow-md overflow-hidden animate-in slide-in-from-bottom-3 duration-250">
          {/* Panel header */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-gray-100">
            <Sparkles size={13} style={{ color: '#2563eb' }} />
            <span className="flex-1 text-xs font-semibold text-gray-700">
              답변 초안
              {loadState === 'success' && (
                <span className="text-gray-400 font-normal ml-1">
                  (마음에 드는 것 클릭)
                </span>
              )}
            </span>
            {loadState === 'success' && (
              <button
                onClick={() => {
                  setDrafts(null);
                  fetchDrafts();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-50"
                title="다시 생성"
              >
                <RotateCcw size={12} />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-50"
              aria-label="닫기"
            >
              <X size={14} />
            </button>
          </div>

          {/* Panel body */}
          <div className="p-3 space-y-2">
            {/* Loading */}
            {loadState === 'loading' && <DraftSkeleton />}

            {/* Error */}
            {loadState === 'error' && (
              <div className="flex items-center gap-3 px-3 py-3 rounded-xl border border-red-100 bg-red-50">
                <span className="text-red-500 flex-shrink-0 text-base">⚠️</span>
                <span className="flex-1 text-xs text-red-700">{errorMessage}</span>
                <button
                  onClick={fetchDrafts}
                  className="text-xs text-red-600 font-semibold underline flex-shrink-0"
                >
                  다시 시도
                </button>
              </div>
            )}

            {/* Success: draft cards */}
            {loadState === 'success' && drafts && (
              <>
                {draftItems.map(({ key, icon, label, accentClass, iconBgClass }) => (
                  <DraftCard
                    key={key}
                    icon={icon}
                    label={label}
                    text={drafts[key]}
                    accentClass={accentClass}
                    iconBgClass={iconBgClass}
                    onSelect={() => handleSelect(key, drafts[key])}
                    isSelected={selectedKey === key}
                  />
                ))}
              </>
            )}
          </div>

          {/* Principle footer */}
          {loadState === 'success' && (
            <div className="px-4 py-2 bg-white border-t border-gray-100">
              <p className="text-[10px] text-gray-400 text-center">
                💡 AI는 초안, 사람은 최종 검토
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
