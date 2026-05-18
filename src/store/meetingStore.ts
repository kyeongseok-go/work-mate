'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MeetingSession {
  isActive: boolean;
  startedAt: string;
  startMessageIndex: number;
}

export interface PinnedMeetingNote {
  roomId: string;
  title: string;
  summary: string;
  date: string;
  participants: string[];
  keyDecisions: string[];
  pinnedAt: string;
}

export interface MeetingState {
  activeMeetings: Record<string, MeetingSession>;
  pinnedNotes: Record<string, PinnedMeetingNote>;
  startMeeting: (roomId: string, messageIndex: number) => void;
  endMeeting: (roomId: string) => void;
  pinNote: (note: PinnedMeetingNote) => void;
  clearPinnedNote: (roomId: string) => void;
}

export const useMeetingStore = create<MeetingState>()(
  persist(
    (set) => ({
      activeMeetings: {},
      pinnedNotes: {},
      startMeeting: (roomId, messageIndex) =>
        set((state) => ({
          activeMeetings: {
            ...state.activeMeetings,
            [roomId]: {
              isActive: true,
              startedAt: new Date().toISOString(),
              startMessageIndex: messageIndex,
            },
          },
        })),
      endMeeting: (roomId) =>
        set((state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [roomId]: _removed, ...rest } = state.activeMeetings;
          return { activeMeetings: rest };
        }),
      pinNote: (note) =>
        set((state) => ({
          pinnedNotes: {
            ...state.pinnedNotes,
            [note.roomId]: note,
          },
        })),
      clearPinnedNote: (roomId) =>
        set((state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [roomId]: _removed, ...rest } = state.pinnedNotes;
          return { pinnedNotes: rest };
        }),
    }),
    {
      name: 'workmate-meeting-state',
    }
  )
);
