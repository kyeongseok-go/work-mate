'use client';

import { useState, useEffect, useRef } from 'react';
import { Brain, Target, Zap } from 'lucide-react';
import { useFeatureStore } from '@/store/featureStore';
import { usePriorityStore } from '@/store/priorityStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatReadTime(seconds: number): string {
  if (seconds < 60) return `평균 ${seconds}초 내`;
  return `평균 ${Math.round(seconds / 60)}분 내`;
}

function ReadTimeBar({ seconds, maxSeconds }: { seconds: number; maxSeconds: number }) {
  const pct = Math.max(8, Math.round(((maxSeconds - seconds) / maxSeconds) * 100));
  return (
    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${pct}%`,
          backgroundColor: 'var(--brand-primary)',
          opacity: 0.8,
        }}
      />
    </div>
  );
}

function ViewCountBar({ count, maxCount }: { count: number; maxCount: number }) {
  const pct = Math.max(8, Math.round((count / maxCount) * 100));
  return (
    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${pct}%`,
          backgroundColor: '#3b82f6',
          opacity: 0.8,
        }}
      />
    </div>
  );
}

// ─── Simulation progress overlay ─────────────────────────────────────────────

interface SimProgressProps {
  day: number;
  onComplete: () => void;
}

function SimProgress({ day, onComplete }: SimProgressProps) {
  useEffect(() => {
    if (day >= 30) {
      const timer = setTimeout(onComplete, 1200);
      return () => clearTimeout(timer);
    }
  }, [day, onComplete]);

  const pct = Math.round((day / 30) * 100);

  return (
    <div className="absolute inset-0 rounded-2xl bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-4 px-6">
      <Brain size={28} style={{ color: 'var(--brand-primary)' }} className="animate-pulse" />
      <p className="text-sm font-semibold text-gray-800 text-center">
        30일 학습 시뮬레이션 진행 중...
      </p>
      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Day {day}</span>
          <span>Day 30</span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: 'var(--brand-primary)' }}
          />
        </div>
      </div>
      {day >= 30 && (
        <p className="text-xs text-green-600 font-semibold animate-in fade-in duration-500">
          학습 완료! 개인화 우선순위가 적용되었습니다 ✅
        </p>
      )}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastProps {
  show: boolean;
}

function ReadTrackingToast({ show }: ToastProps) {
  if (!show) return null;
  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-white text-xs font-medium animate-in slide-in-from-bottom-4 duration-300"
      style={{ backgroundColor: 'rgba(30,30,30,0.88)' }}
    >
      <span>📊</span>
      <span>읽기 패턴 기록 중</span>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function PriorityDashboard() {
  const { features } = useFeatureStore();
  const {
    profile,
    toggleFocusMode,
    startSimulation,
    resetSimulation,
  } = usePriorityStore();

  const [simDay, setSimDay] = useState(0);
  const [runningSimulation, setRunningSimulation] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Feature gate
  if (!features.priorityLearning) return null;

  const maxReadTime = Math.max(...profile.fastReadSenders.map((s) => s.avgReadTime));
  const maxViewCount = Math.max(...profile.frequentRooms.map((r) => r.viewCount));

  const handleSimulate = () => {
    if (runningSimulation) return;
    setRunningSimulation(true);
    setSimDay(0);
    startSimulation();

    let day = 0;
    intervalRef.current = setInterval(() => {
      day += 1;
      setSimDay(day);
      if (day >= 30) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 120); // ~3.6s total
  };

  const handleSimComplete = () => {
    setRunningSimulation(false);
    resetSimulation();
  };

  const handleFocusModeClick = () => {
    toggleFocusMode();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <>
      <div
        className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden relative"
        style={{ borderColor: 'rgba(37, 99, 235, 0.15)' }}
      >
        {/* Simulation overlay */}
        {runningSimulation && (
          <SimProgress day={simDay} onComplete={handleSimComplete} />
        )}

        {/* Header */}
        <div
          className="px-4 py-3 border-b flex items-center gap-2"
          style={{
            borderColor: 'rgba(37, 99, 235, 0.12)',
            background: 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(37,99,235,0.02) 100%)',
          }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(37, 99, 235, 0.12)' }}
          >
            <Brain size={14} style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">본인의 메시지 우선순위</p>
            <p className="text-[10px] text-gray-400">
              {profile.learningDays}일 학습 완료 · {profile.lastUpdated.slice(0, 10)} 업데이트
            </p>
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white flex-shrink-0"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            학습 중
          </span>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-4">
          {/* Fast-read senders */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
              <Target size={11} />
              자주 빠르게 읽는 사람
            </p>
            <div className="space-y-2">
              {profile.fastReadSenders.map((sender, idx) => (
                <div key={sender.senderId} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-3 flex-shrink-0 font-medium">
                    {idx + 1}
                  </span>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: idx === 0 ? 'var(--brand-primary)' : idx === 1 ? '#f59e0b' : '#6b7280' }}
                  >
                    {sender.name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-xs font-medium text-gray-800 truncate">{sender.name}</span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">({sender.role})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ReadTimeBar seconds={sender.avgReadTime} maxSeconds={maxReadTime} />
                      <span className="text-[10px] text-gray-500 flex-shrink-0 w-16 text-right">
                        {formatReadTime(sender.avgReadTime)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-50" />

          {/* Frequent rooms */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
              <Zap size={11} />
              자주 보는 채팅방
            </p>
            <div className="space-y-2">
              {profile.frequentRooms.map((room, idx) => (
                <div key={room.roomId} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-3 flex-shrink-0 font-medium">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-xs font-medium text-gray-800 truncate">{room.roomName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ViewCountBar count={room.viewCount} maxCount={maxViewCount} />
                      <span className="text-[10px] text-gray-500 flex-shrink-0 w-14 text-right">
                        {room.viewCount}회/일
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-50" />

          {/* Focus mode */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-xs font-semibold text-gray-800">🎯 집중 모드</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                우선순위 낮은 알림은 1시간 단위로 묶음 표시
              </p>
            </div>
            <button
              onClick={handleFocusModeClick}
              className="flex items-center gap-1.5 flex-shrink-0 transition-all"
              aria-label="집중 모드 토글"
            >
              <div
                className="relative w-9 h-5 rounded-full transition-colors duration-200"
                style={{
                  backgroundColor: profile.focusMode ? 'var(--brand-primary)' : '#d1d5db',
                }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                  style={{
                    left: profile.focusMode ? '18px' : '2px',
                  }}
                />
              </div>
              <span
                className="text-[10px] font-semibold"
                style={{ color: profile.focusMode ? 'var(--brand-primary)' : '#9ca3af' }}
              >
                {profile.focusMode ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-3">
          <button
            onClick={handleSimulate}
            disabled={runningSimulation}
            className="w-full py-2 rounded-xl text-xs font-semibold border transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-1.5"
            style={{
              borderColor: 'rgba(37, 99, 235, 0.3)',
              color: 'var(--brand-primary)',
              backgroundColor: 'rgba(37, 99, 235, 0.04)',
            }}
          >
            <Brain size={12} />
            30일 학습 시뮬레이션 보기
          </button>
        </div>
      </div>

      {/* Toast */}
      <ReadTrackingToast show={showToast} />
    </>
  );
}

// ─── Exported toast for use in chat ──────────────────────────────────────────

export function useReadTrackingToast() {
  const [show, setShow] = useState(false);

  const trigger = () => {
    setShow(true);
    setTimeout(() => setShow(false), 1800);
  };

  return { show, trigger };
}

export { ReadTrackingToast };
