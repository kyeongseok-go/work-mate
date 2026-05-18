'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FastReadSender {
  name: string;
  senderId: string;
  role: string;
  avgReadTime: number; // seconds
}

export interface FrequentRoom {
  roomId: string;
  roomName: string;
  viewCount: number; // per day
}

export interface PriorityProfile {
  fastReadSenders: FastReadSender[];
  frequentRooms: FrequentRoom[];
  focusMode: boolean;
  learningDays: number; // 0~30 simulation
  lastUpdated: string;
}

export interface PriorityState {
  profile: PriorityProfile;
  isSimulating: boolean;
  simulationDay: number;
  toggleFocusMode: () => void;
  trackMessageRead: (senderId: string, readTimeSeconds: number) => void;
  getPriorityScore: (roomId: string, senderId?: string) => number; // 0~100
  startSimulation: () => void;
  resetSimulation: () => void;
}

const INITIAL_PROFILE: PriorityProfile = {
  fastReadSenders: [
    { name: '최팀장', senderId: 'choi-lead', role: '직속 상사', avgReadTime: 30 },
    { name: '박매니저', senderId: 'park-pm', role: 'PM', avgReadTime: 60 },
    { name: '김지원', senderId: 'kim-jiwon', role: '동료', avgReadTime: 120 },
  ],
  frequentRooms: [
    { roomId: 'project-a', roomName: '프로젝트A', viewCount: 12 },
    { roomId: 'dev-team', roomName: '개발팀', viewCount: 8 },
    { roomId: 'lunch', roomName: '점심메뉴', viewCount: 2 },
  ],
  focusMode: false,
  learningDays: 30,
  lastUpdated: '2024-04-24T18:00:00',
};

export const usePriorityStore = create<PriorityState>()(
  persist(
    (set, get) => ({
      profile: INITIAL_PROFILE,
      isSimulating: false,
      simulationDay: 30,

      toggleFocusMode: () =>
        set((state) => ({
          profile: {
            ...state.profile,
            focusMode: !state.profile.focusMode,
          },
        })),

      trackMessageRead: (senderId, readTimeSeconds) =>
        set((state) => {
          const existing = state.profile.fastReadSenders.find(
            (s) => s.senderId === senderId
          );
          if (!existing) return state;
          const updated = state.profile.fastReadSenders.map((s) =>
            s.senderId === senderId
              ? {
                  ...s,
                  avgReadTime: Math.round((s.avgReadTime * 0.8 + readTimeSeconds * 0.2)),
                }
              : s
          );
          return {
            profile: {
              ...state.profile,
              fastReadSenders: updated,
              lastUpdated: new Date().toISOString(),
            },
          };
        }),

      getPriorityScore: (roomId, senderId) => {
        const { profile } = get();
        let score = 0;

        // Room frequency score (0~50)
        const roomEntry = profile.frequentRooms.find((r) => r.roomId === roomId);
        if (roomEntry) {
          const maxViews = Math.max(...profile.frequentRooms.map((r) => r.viewCount));
          score += Math.round((roomEntry.viewCount / maxViews) * 50);
        }

        // Sender read-time score (0~50): faster read = higher score
        if (senderId) {
          const senderEntry = profile.fastReadSenders.find(
            (s) => s.senderId === senderId
          );
          if (senderEntry) {
            const maxReadTime = Math.max(
              ...profile.fastReadSenders.map((s) => s.avgReadTime)
            );
            score += Math.round(
              ((maxReadTime - senderEntry.avgReadTime) / maxReadTime) * 50
            );
          }
        }

        return Math.min(100, score);
      },

      startSimulation: () => {
        set({ isSimulating: true, simulationDay: 0 });
      },

      resetSimulation: () => {
        set({
          isSimulating: false,
          simulationDay: 30,
          profile: INITIAL_PROFILE,
        });
      },
    }),
    {
      name: 'workmate-priority-state',
    }
  )
);

// Priority tier based on score
export function getPriorityTier(score: number): 'high' | 'medium' | 'low' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export const PRIORITY_INDICATORS: Record<
  'high' | 'medium' | 'low',
  { dot: string; label: string; color: string }
> = {
  high: { dot: '🔴', label: '높음', color: '#ef4444' },
  medium: { dot: '🟡', label: '중간', color: '#f59e0b' },
  low: { dot: '🔵', label: '낮음', color: '#3b82f6' },
};
