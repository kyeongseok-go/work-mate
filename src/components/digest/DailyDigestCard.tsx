'use client';

import { useState, useEffect, useCallback } from 'react';
import { Newspaper, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { chatRooms } from '@/data/messages';
import { notifications } from '@/data/notifications';
import { SEVERITY_META } from '@/lib/severity';
import type { DailyDigest, DigestContext, DigestResponse } from '@/app/api/digest/route';

function buildContext(): DigestContext {
  return {
    notifications: notifications
      .filter((n) => !n.isRead)
      .slice(0, 12)
      .map((n) => ({ title: n.title, body: n.body })),
    rooms: chatRooms.map((r) => {
      const last = r.messages[r.messages.length - 1];
      return { name: r.name, lastMessage: last?.content ?? '메시지 없음' };
    }),
    actions: notifications
      .filter((n) => n.priority === 'urgent' && !n.isRead)
      .slice(0, 6)
      .map((n) => ({ task: n.title })),
  };
}

export function DailyDigestCard() {
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: buildContext() }),
      });
      const json = (await res.json()) as DigestResponse;
      if (!json.success || !json.data) {
        throw new Error(json.error ?? '브리핑 생성에 실패했습니다.');
      }
      setDigest(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '브리핑 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <div
      className="mb-6 rounded-2xl border shadow-sm overflow-hidden"
      style={{ borderColor: '#bfdbfe', background: 'linear-gradient(135deg, #eef4ff 0%, #ffffff 55%)' }}
    >
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <Newspaper size={16} style={{ color: 'var(--brand-primary)' }} />
          <span className="text-sm font-bold text-gray-900">AI 데일리 브리핑</span>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            에이전트
          </span>
        </div>
        <button
          onClick={run}
          disabled={isLoading}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      <div className="px-5 pb-5">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center">
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--brand-primary)' }} />
            오늘의 업무를 종합하는 중...
          </div>
        )}

        {error && !isLoading && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
            {error}
            <button onClick={run} className="ml-2 underline">다시 시도</button>
          </div>
        )}

        {digest && !isLoading && !error && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-900 leading-snug">{digest.headline}</p>

            {digest.mustKnow.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  꼭 알아야 할 것
                </p>
                <div className="space-y-1.5">
                  {digest.mustKnow.map((m, i) => {
                    const meta = SEVERITY_META[m.severity];
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: meta.color }}
                          title={meta.desc}
                        >
                          {m.severity}
                        </span>
                        <p className="text-sm text-gray-700 leading-snug flex-1">
                          {m.title}
                          {m.sourceRef && (
                            <span className="text-gray-400 text-xs ml-1.5">· {m.sourceRef}</span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {digest.pendingActions.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                  처리 대기
                </p>
                <div className="space-y-1">
                  {digest.pendingActions.map((a, i) => (
                    <div key={i} className="text-sm text-gray-700 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                      <span>{a.task}</span>
                      {a.owner && <span className="text-xs text-gray-400">· {a.owner}</span>}
                      {a.due && <span className="text-xs text-gray-400">· {a.due}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {digest.suggestedFocus && (
              <div
                className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                style={{ backgroundColor: 'rgba(37,99,235,0.06)' }}
              >
                <Sparkles size={13} style={{ color: 'var(--brand-primary)' }} className="flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-700 leading-relaxed">
                  <span className="font-semibold" style={{ color: 'var(--brand-primary)' }}>
                    추천 집중:{' '}
                  </span>
                  {digest.suggestedFocus}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
