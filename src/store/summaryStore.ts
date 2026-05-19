'use client';

/**
 * In-memory summary cache, keyed by room.
 *
 * "AI 요약 보기"를 누를 때마다 매번 재요약(API 호출)하지 않도록, 방별로 마지막
 * 요약 결과를 보관한다. 캐시 유효성은 `signature`(방 + 안읽음 수 + 요약 대상
 * 메시지 구간)로 판단한다 — 대화가 그대로면 캐시를 그대로 보여주고, 새 메시지가
 * 생기면 signature 가 달라져 자연히 무효화된다.
 *
 * persist 를 쓰지 않으므로 SPA 네비게이션(요약창 ↔ 채팅창) 동안에는 유지되고,
 * 하드 리로드 시에는 비워진다("잠깐 캐시").
 */

import { create } from 'zustand';
import type { SummaryResult } from '@/app/api/summarize/route';

interface CacheEntry {
  signature: string;
  summary: SummaryResult;
}

interface SummaryCacheState {
  entries: Record<string, CacheEntry>;
  /** signature 가 일치할 때만 캐시된 요약을 반환, 아니면 null */
  lookup: (roomId: string, signature: string) => SummaryResult | null;
  save: (roomId: string, signature: string, summary: SummaryResult) => void;
}

export const useSummaryCache = create<SummaryCacheState>((set, getState) => ({
  entries: {},
  lookup: (roomId, signature) => {
    const entry = getState().entries[roomId];
    return entry && entry.signature === signature ? entry.summary : null;
  },
  save: (roomId, signature, summary) =>
    set((state) => ({
      entries: { ...state.entries, [roomId]: { signature, summary } },
    })),
}));
