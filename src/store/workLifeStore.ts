'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Severity, isAtLeastAsSevere } from '@/lib/severity';

export interface BatchedNotification {
  id: string;
  title: string;
  severity: Severity;
  ts: string;
}

export interface WorkLifeState {
  workHours: { start: string; end: string };
  weekendOff: boolean;
  autoMute: boolean;
  autoReply: boolean;
  autoReplyMessage: string;
  whitelist: {
    keywords: string[];
    senders: string[];
  };
  showSenderWarning: boolean;
  simulatedTime: string | null;

  // 알림 묶음 + 심각도 기반 통과
  batchedQueue: BatchedNotification[];
  passThreshold: Severity; // 이 심각도 이상은 근무외에도 즉시 통과 (기본 P1)

  // Actions
  setWorkHours: (start: string, end: string) => void;
  setWeekendOff: (val: boolean) => void;
  setAutoMute: (val: boolean) => void;
  setAutoReply: (val: boolean) => void;
  setAutoReplyMessage: (msg: string) => void;
  addKeyword: (kw: string) => void;
  removeKeyword: (kw: string) => void;
  addSender: (sender: string) => void;
  removeSender: (sender: string) => void;
  setShowSenderWarning: (val: boolean) => void;
  setSimulatedTime: (time: string | null) => void;
  setPassThreshold: (s: Severity) => void;

  // 묶음/통과 액션
  routeNotification: (n: BatchedNotification) => 'passed' | 'batched';
  flushBatch: () => BatchedNotification[];
  clearBatch: () => void;

  // Computed helpers
  isOutsideWorkHours: () => boolean;
  isWhitelistedMessage: (content: string, senderName?: string) => boolean;
}

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

export const useWorkLifeStore = create<WorkLifeState>()(
  persist(
    (set, get) => ({
      workHours: { start: '09:00', end: '18:00' },
      weekendOff: true,
      autoMute: true,
      autoReply: true,
      autoReplyMessage: '퇴근했습니다. 내일 오전 확인하겠습니다.',
      whitelist: {
        keywords: ['긴급', '장애', '사고'],
        senders: ['최팀장', '박매니저'],
      },
      showSenderWarning: true,
      simulatedTime: null,
      batchedQueue: [],
      passThreshold: 'P1',

      setWorkHours: (start, end) =>
        set((s) => ({ workHours: { ...s.workHours, start, end } })),
      setWeekendOff: (val) => set({ weekendOff: val }),
      setAutoMute: (val) => set({ autoMute: val }),
      setAutoReply: (val) => set({ autoReply: val }),
      setAutoReplyMessage: (msg) => set({ autoReplyMessage: msg }),
      addKeyword: (kw) =>
        set((s) => ({
          whitelist: {
            ...s.whitelist,
            keywords: s.whitelist.keywords.includes(kw)
              ? s.whitelist.keywords
              : [...s.whitelist.keywords, kw],
          },
        })),
      removeKeyword: (kw) =>
        set((s) => ({
          whitelist: {
            ...s.whitelist,
            keywords: s.whitelist.keywords.filter((k) => k !== kw),
          },
        })),
      addSender: (sender) =>
        set((s) => ({
          whitelist: {
            ...s.whitelist,
            senders: s.whitelist.senders.includes(sender)
              ? s.whitelist.senders
              : [...s.whitelist.senders, sender],
          },
        })),
      removeSender: (sender) =>
        set((s) => ({
          whitelist: {
            ...s.whitelist,
            senders: s.whitelist.senders.filter((x) => x !== sender),
          },
        })),
      setShowSenderWarning: (val) => set({ showSenderWarning: val }),
      setSimulatedTime: (time) => set({ simulatedTime: time }),
      setPassThreshold: (s) => set({ passThreshold: s }),

      routeNotification: (n) => {
        const st = get();
        // 근무 중이거나 자동 무음 OFF → 정상 전달
        if (!st.isOutsideWorkHours() || !st.autoMute) return 'passed';
        // 근무 외 + 자동 무음: 임계 이상 심각도만 즉시 통과, 나머지는 묶음
        if (isAtLeastAsSevere(n.severity, st.passThreshold)) return 'passed';
        set((s) => ({ batchedQueue: [...s.batchedQueue, n] }));
        return 'batched';
      },
      flushBatch: () => {
        const q = get().batchedQueue;
        set({ batchedQueue: [] });
        return q;
      },
      clearBatch: () => set({ batchedQueue: [] }),

      isOutsideWorkHours: () => {
        const { workHours, weekendOff, simulatedTime } = get();

        let now: Date;
        if (simulatedTime) {
          // Use today's date but override the time
          now = new Date();
          const [h, m] = simulatedTime.split(':').map(Number);
          now.setHours(h, m ?? 0, 0, 0);
        } else {
          now = new Date();
        }

        const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
        if (weekendOff && (dayOfWeek === 0 || dayOfWeek === 6)) return true;

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const startMinutes = parseTime(workHours.start);
        const endMinutes = parseTime(workHours.end);

        return currentMinutes < startMinutes || currentMinutes >= endMinutes;
      },

      isWhitelistedMessage: (content, senderName) => {
        const { whitelist } = get();
        const hasKeyword = whitelist.keywords.some((kw) => content.includes(kw));
        const hasSender = senderName
          ? whitelist.senders.some((s) => senderName.includes(s))
          : false;
        return hasKeyword || hasSender;
      },
    }),
    {
      name: 'workmate-work-life',
      version: 1,
      // 기존 localStorage 상태에 신규 필드 안전 주입 (하위호환)
      migrate: (persisted: unknown): WorkLifeState => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        return {
          ...p,
          batchedQueue: Array.isArray(p.batchedQueue) ? p.batchedQueue : [],
          passThreshold:
            p.passThreshold === 'P0' ||
            p.passThreshold === 'P1' ||
            p.passThreshold === 'P2' ||
            p.passThreshold === 'P3'
              ? p.passThreshold
              : 'P1',
        } as unknown as WorkLifeState;
      },
    }
  )
);
