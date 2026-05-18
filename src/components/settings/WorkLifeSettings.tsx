'use client';

import { useState } from 'react';
import { X, Plus, Clock, Moon, BellOff, MessageSquare, Shield, Timer } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useWorkLifeStore } from '@/store/workLifeStore';

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <span className="text-purple-500">{icon}</span>
      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</span>
    </div>
  );
}

function TagChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
      {label}
      <button
        onClick={onRemove}
        className="text-purple-400 hover:text-purple-700 transition-colors ml-0.5"
        aria-label={`${label} 제거`}
      >
        <X size={10} />
      </button>
    </span>
  );
}

function AddTagInput({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (val: string) => void;
}) {
  const [value, setValue] = useState('');

  const handleAdd = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue('');
  };

  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAdd();
        }}
        placeholder={placeholder}
        className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-200 placeholder-gray-400"
      />
      <button
        onClick={handleAdd}
        className="text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-90 flex items-center gap-1"
        style={{ backgroundColor: '#7c3aed' }}
      >
        <Plus size={12} />
        추가
      </button>
    </div>
  );
}

export function WorkLifeSettings() {
  const {
    workHours,
    weekendOff,
    autoMute,
    autoReply,
    autoReplyMessage,
    whitelist,
    showSenderWarning,
    simulatedTime,
    setWorkHours,
    setWeekendOff,
    setAutoMute,
    setAutoReply,
    setAutoReplyMessage,
    addKeyword,
    removeKeyword,
    addSender,
    removeSender,
    setShowSenderWarning,
    setSimulatedTime,
    isOutsideWorkHours,
  } = useWorkLifeStore();

  const outside = isOutsideWorkHours();

  return (
    <div
      className="mt-4 rounded-2xl border overflow-hidden"
      style={{
        borderColor: outside ? 'rgba(124, 58, 237, 0.25)' : 'rgba(124, 58, 237, 0.15)',
        backgroundColor: outside ? 'rgba(245, 243, 255, 0.6)' : 'rgba(250, 249, 255, 0.5)',
      }}
    >
      {/* Panel Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{
          backgroundColor: outside
            ? 'rgba(124, 58, 237, 0.12)'
            : 'rgba(124, 58, 237, 0.06)',
          borderBottom: '1px solid rgba(124, 58, 237, 0.12)',
        }}
      >
        <Moon size={15} className={outside ? 'text-purple-600' : 'text-purple-400'} />
        <span className="text-sm font-semibold text-purple-800">워크-라이프 밸런스 설정</span>
        <span
          className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={
            outside
              ? { backgroundColor: 'rgba(124, 58, 237, 0.15)', color: '#6d28d9' }
              : { backgroundColor: 'rgba(34, 197, 94, 0.12)', color: '#15803d' }
          }
        >
          {outside ? '🌙 퇴근 시간' : '☀️ 근무 중'}
        </span>
      </div>

      <div className="p-4 space-y-6">
        {/* Work Hours */}
        <div>
          <SectionTitle icon={<Clock size={13} />} label="근무 시간" />
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500">평일</span>
            <input
              type="time"
              value={workHours.start}
              onChange={(e) => setWorkHours(e.target.value, workHours.end)}
              className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
            />
            <span className="text-xs text-gray-400">~</span>
            <input
              type="time"
              value={workHours.end}
              onChange={(e) => setWorkHours(workHours.start, e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
            />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Switch
              checked={weekendOff}
              onCheckedChange={setWeekendOff}
              style={weekendOff ? { backgroundColor: '#7c3aed' } : {}}
            />
            <span className="text-xs text-gray-600">주말 비활성화</span>
          </div>
        </div>

        {/* Off-hours behavior */}
        <div>
          <SectionTitle icon={<BellOff size={13} />} label="근무 시간 외 동작" />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={autoMute}
                onCheckedChange={setAutoMute}
                style={autoMute ? { backgroundColor: '#7c3aed' } : {}}
              />
              <span className="text-xs text-gray-600">알림 자동 무음</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Switch
                  checked={autoReply}
                  onCheckedChange={setAutoReply}
                  style={autoReply ? { backgroundColor: '#7c3aed' } : {}}
                />
                <span className="text-xs text-gray-600">자동 응답 메시지</span>
              </div>
              {autoReply && (
                <textarea
                  value={autoReplyMessage}
                  onChange={(e) => setAutoReplyMessage(e.target.value)}
                  rows={2}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100 resize-none text-gray-700 placeholder-gray-400"
                  placeholder="자동 응답 메시지를 입력하세요"
                />
              )}
            </div>
          </div>
        </div>

        {/* Whitelist */}
        <div>
          <SectionTitle icon={<Shield size={13} />} label="화이트리스트 (긴급 통과)" />
          <div className="space-y-3">
            <div>
              <p className="text-[11px] text-gray-500 mb-1.5">키워드</p>
              <div className="flex flex-wrap gap-1.5">
                {whitelist.keywords.map((kw) => (
                  <TagChip key={kw} label={kw} onRemove={() => removeKeyword(kw)} />
                ))}
              </div>
              <AddTagInput placeholder="키워드 추가..." onAdd={addKeyword} />
            </div>
            <div>
              <p className="text-[11px] text-gray-500 mb-1.5">발신자</p>
              <div className="flex flex-wrap gap-1.5">
                {whitelist.senders.map((s) => (
                  <TagChip key={s} label={s} onRemove={() => removeSender(s)} />
                ))}
              </div>
              <AddTagInput placeholder="이름 추가..." onAdd={addSender} />
            </div>
          </div>
        </div>

        {/* Sender Warning */}
        <div>
          <SectionTitle icon={<MessageSquare size={13} />} label="발신자 경고" />
          <div className="flex items-center gap-2">
            <Switch
              checked={showSenderWarning}
              onCheckedChange={setShowSenderWarning}
              style={showSenderWarning ? { backgroundColor: '#7c3aed' } : {}}
            />
            <span className="text-xs text-gray-600">퇴근 시간에 메시지 보내면 경고 표시</span>
          </div>
        </div>

        {/* Demo Time Simulation */}
        <div>
          <SectionTitle icon={<Timer size={13} />} label="데모 시간 시뮬레이션" />
          <p className="text-[11px] text-gray-400 mb-2.5">
            인터뷰 데모용 — 근무 중/퇴근 후 상태를 즉시 전환합니다
          </p>
          <div className="flex gap-2 flex-wrap">
            {(
              [
                { label: '현재 시간', value: null },
                { label: '14:00 근무 중', value: '14:00' },
                { label: '22:00 퇴근 후', value: '22:00' },
              ] as const
            ).map(({ label, value }) => {
              const isActive = simulatedTime === value;
              return (
                <button
                  key={label}
                  onClick={() => setSimulatedTime(value)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
                  style={
                    isActive
                      ? {
                          backgroundColor: '#7c3aed',
                          color: 'white',
                          borderColor: '#7c3aed',
                          boxShadow: '0 0 0 2px rgba(124,58,237,0.2)',
                        }
                      : {
                          backgroundColor: 'white',
                          color: '#6b7280',
                          borderColor: '#e5e7eb',
                        }
                  }
                >
                  {isActive && '✓ '}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
