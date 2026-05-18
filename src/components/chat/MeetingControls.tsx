'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video } from 'lucide-react';
import { useFeatureStore } from '@/store/featureStore';
import { useMeetingStore } from '@/store/meetingStore';
import { MeetingNotes } from '@/app/api/meeting-notes/route';
import { MeetingNotesModal, MeetingNotesLoading } from './MeetingNotesModal';
import { Message } from '@/data/messages';
import { getPerson } from '@/data/people';
import { cn } from '@/lib/utils';

interface MeetingControlsProps {
  roomId: string;
  messages: Message[];
  memberIds?: string[];
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function MeetingHeaderButton({ roomId, messages }: MeetingControlsProps) {
  const { features } = useFeatureStore();
  const { activeMeetings, startMeeting, endMeeting } = useMeetingStore();
  const meeting = activeMeetings[roomId];
  const isActive = Boolean(meeting?.isActive);

  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [loadProgress, setLoadProgress] = useState(0);
  const [meetingNotes, setMeetingNotes] = useState<MeetingNotes | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (!features.meetingNotes) return null;

  const handleStart = () => {
    startMeeting(roomId, messages.length);
    setLoadState('idle');
    setMeetingNotes(null);
  };

  const handleEnd = async () => {
    if (!meeting) return;

    const meetingMessages = messages.slice(meeting.startMessageIndex);
    const participantIds = Array.from(new Set(meetingMessages.map((m) => m.senderId)));
    const participantNames = participantIds.map((id) => {
      const person = getPerson(id);
      return person ? person.name : id;
    });

    endMeeting(roomId);

    // Start loading animation
    setLoadState('loading');
    setLoadProgress(0);

    // Simulate progress over 5 seconds
    progressTimerRef.current = setInterval(() => {
      setLoadProgress((prev) => {
        if (prev >= 90) {
          if (progressTimerRef.current) clearInterval(progressTimerRef.current);
          return 90;
        }
        return prev + 18;
      });
    }, 1000);

    try {
      const res = await fetch('/api/meeting-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          messages: meetingMessages,
          participants: participantNames,
        }),
      });

      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setLoadProgress(100);

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '회의록 생성 중 오류가 발생했습니다.');
      }

      setMeetingNotes(json.data as MeetingNotes);
      setTimeout(() => setLoadState('done'), 300);
    } catch (err: unknown) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      const msg = err instanceof Error ? err.message : '회의록 생성 중 오류가 발생했습니다.';
      setErrorMsg(msg);
      setLoadState('error');
    }
  };

  return (
    <>
      {/* Header button */}
      {isActive ? (
        <button
          onClick={handleEnd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 animate-pulse"
          style={{ backgroundColor: '#dc2626' }}
        >
          <MicOff size={12} />
          회의 종료
        </button>
      ) : (
        <button
          onClick={handleStart}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90',
            loadState === 'error' ? 'bg-orange-500' : 'bg-green-600'
          )}
        >
          <Mic size={12} />
          {loadState === 'error' ? '오류 — 재시도' : '회의 시작'}
        </button>
      )}

      {/* Loading overlay */}
      {loadState === 'loading' && <MeetingNotesLoading progress={loadProgress} />}

      {/* Error toast */}
      {loadState === 'error' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg max-w-xs text-center">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Meeting notes modal */}
      {loadState === 'done' && meetingNotes && (
        <MeetingNotesModal
          roomId={roomId}
          notes={meetingNotes}
          onClose={() => {
            setLoadState('idle');
            setMeetingNotes(null);
          }}
        />
      )}
    </>
  );
}

// ── Active Meeting Banner ─────────────────────────────────────────────────────

interface ActiveMeetingBannerProps {
  roomId: string;
}

export function ActiveMeetingBanner({ roomId }: ActiveMeetingBannerProps) {
  const { features } = useFeatureStore();
  const { activeMeetings } = useMeetingStore();
  const meeting = activeMeetings[roomId];
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!meeting?.isActive) return;
    const interval = setInterval(() => {
      const diff = Math.floor(
        (Date.now() - new Date(meeting.startedAt).getTime()) / 1000
      );
      setElapsed(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [meeting]);

  if (!features.meetingNotes || !meeting?.isActive) return null;

  const startTime = new Date(meeting.startedAt).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2 flex-shrink-0"
      style={{ backgroundColor: 'rgba(220, 38, 38, 0.08)', borderBottom: '1px solid rgba(220,38,38,0.15)' }}
    >
      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor: '#dc2626' }}
        />
        <span
          className="relative inline-flex rounded-full h-2.5 w-2.5"
          style={{ backgroundColor: '#dc2626' }}
        />
      </span>
      <span className="text-xs font-semibold text-red-700">
        회의 진행 중
      </span>
      <span className="text-xs text-red-500">
        시작: {startTime}
      </span>
      <span
        className="ml-auto text-xs font-mono font-bold text-red-700 tabular-nums"
      >
        {formatElapsed(elapsed)}
      </span>
      <Video size={12} className="text-red-400" />
    </div>
  );
}

// ── Simulation Button (프로젝트A only) ─────────────────────────────────────────

interface SimulationButtonProps {
  roomId: string;
  messageCount: number;
  onSimulate: () => void;
}

export function SimulationButton({ roomId, messageCount, onSimulate }: SimulationButtonProps) {
  const { features } = useFeatureStore();
  const { activeMeetings } = useMeetingStore();
  const isActive = Boolean(activeMeetings[roomId]?.isActive);

  if (!features.meetingNotes || roomId !== 'project-a' || isActive) return null;

  return (
    <button
      onClick={onSimulate}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
      title={`${messageCount}개 메시지로 회의 시뮬레이션`}
    >
      <Video size={12} />
      시뮬레이션
    </button>
  );
}
