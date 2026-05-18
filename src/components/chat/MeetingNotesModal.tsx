'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X,
  Edit3,
  Pin,
  Download,
  CheckSquare,
  ChevronRight,
  FileText,
  Users,
  Clock,
  Calendar,
  Loader2,
} from 'lucide-react';
import { MeetingNotes } from '@/app/api/meeting-notes/route';
import { useMeetingStore } from '@/store/meetingStore';
import { cn } from '@/lib/utils';

interface MeetingNotesModalProps {
  roomId: string;
  notes: MeetingNotes;
  onClose: () => void;
}

export function MeetingNotesModal({ roomId, notes, onClose }: MeetingNotesModalProps) {
  const { pinNote } = useMeetingStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState<MeetingNotes>(notes);
  const [pinned, setPinned] = useState(false);
  const [copied, setCopied] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditedNotes(notes);
  }, [notes]);

  const handlePin = () => {
    pinNote({
      roomId,
      title: editedNotes.title,
      summary: editedNotes.summary,
      date: editedNotes.date,
      participants: editedNotes.participants,
      keyDecisions: editedNotes.keyDecisions,
      pinnedAt: new Date().toISOString(),
    });
    setPinned(true);
    setTimeout(() => setPinned(false), 2000);
  };

  const handleCopy = async () => {
    const text = formatNotesAsText(editedNotes);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing silently
    }
  };

  const handleEditToggle = () => {
    setIsEditing((v) => !v);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, white 60%)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(37,99,235,0.12)' }}
            >
              <FileText size={15} style={{ color: 'var(--brand-primary)' }} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                AI 회의록
              </p>
              <p className="text-sm font-bold text-gray-900 leading-tight">
                {editedNotes.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Meta info row */}
        <div className="flex items-center gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0 flex-wrap gap-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar size={12} />
            <span>{editedNotes.date}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock size={12} />
            <span>{editedNotes.duration}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Users size={12} />
            <span>{editedNotes.participants.join(', ')}</span>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Summary */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
              회의 요약
            </h3>
            <div
              ref={summaryRef}
              contentEditable={isEditing}
              suppressContentEditableWarning
              onBlur={(e) =>
                setEditedNotes((prev) => ({
                  ...prev,
                  summary: e.currentTarget.textContent ?? prev.summary,
                }))
              }
              className={cn(
                'text-sm text-gray-700 leading-relaxed rounded-xl p-3',
                isEditing
                  ? 'bg-amber-50 border border-amber-200 outline-none focus:ring-2 focus:ring-amber-300'
                  : 'bg-gray-50'
              )}
            >
              {editedNotes.summary}
            </div>
          </section>

          {/* Key Decisions */}
          {editedNotes.keyDecisions.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                핵심 결정사항
              </h3>
              <div className="space-y-2">
                {editedNotes.keyDecisions.map((decision, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
                    style={{ backgroundColor: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.2)' }}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: 'var(--brand-primary)' }}
                    >
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-800 leading-snug">{decision}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Agenda Items */}
          {editedNotes.agendaItems.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                안건 및 논의 내용
              </h3>
              <div className="space-y-3">
                {editedNotes.agendaItems.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <ChevronRight size={13} className="text-gray-400" />
                      <span className="text-xs font-bold text-gray-500 mr-1">{i + 1}</span>
                      <span className="text-sm font-semibold text-gray-800">{item.topic}</span>
                    </div>
                    <div className="px-4 py-3 space-y-2.5">
                      <p className="text-sm text-gray-600 leading-relaxed">{item.discussion}</p>
                      {item.decision && (
                        <div
                          className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
                          style={{ backgroundColor: 'rgba(37,99,235,0.06)', color: '#1d4ed8' }}
                        >
                          <span className="font-bold flex-shrink-0">결정:</span>
                          <span>{item.decision}</span>
                        </div>
                      )}
                      {item.actionItem && (
                        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-50 text-xs">
                          <CheckSquare size={12} className="text-blue-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-blue-800 font-medium">{item.actionItem.task}</span>
                            {item.actionItem.assignee && (
                              <span className="ml-2 font-bold text-blue-600">
                                → {item.actionItem.assignee}
                              </span>
                            )}
                            {item.actionItem.deadline && (
                              <span className="ml-2 text-blue-400">({item.actionItem.deadline})</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Next Steps */}
          {editedNotes.nextSteps.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                다음 단계
              </h3>
              <div className="space-y-1.5">
                {editedNotes.nextSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <div
                      className="w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5"
                      style={{ borderColor: 'rgba(37,99,235,0.5)' }}
                    />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex-shrink-0 flex items-center gap-2 px-5 py-4 border-t border-gray-100 bg-white">
          <button
            onClick={handleEditToggle}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              isEditing
                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <Edit3 size={14} />
            {isEditing ? '편집 완료' : '편집'}
          </button>

          <button
            onClick={handlePin}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              pinned
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <Pin size={14} />
            {pinned ? '공지 게시됨!' : '공지로 게시'}
          </button>

          <button
            onClick={handleCopy}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              copied
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <Download size={14} />
            {copied ? '복사됨!' : '다운로드'}
          </button>

          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Loading overlay ────────────────────────────────────────────────────────────

interface MeetingNotesLoadingProps {
  progress: number;
}

export function MeetingNotesLoading({ progress }: MeetingNotesLoadingProps) {
  const steps = [
    '대화 내용 분석 중...',
    '주요 안건 추출 중...',
    '결정사항 정리 중...',
    '액션 아이템 정리 중...',
    '회의록 완성 중...',
  ];
  const stepIdx = Math.min(Math.floor(progress / 20), steps.length - 1);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-8 shadow-2xl flex flex-col items-center gap-5">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: 'rgba(37,99,235,0.1)' }}
        >
          <Loader2
            size={32}
            className="animate-spin"
            style={{ color: 'var(--brand-primary)' }}
          />
        </div>
        <div className="text-center space-y-1">
          <p className="font-bold text-gray-900">회의록 생성 중</p>
          <p className="text-sm text-gray-500">{steps[stepIdx]}</p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              backgroundColor: 'var(--brand-primary)',
            }}
          />
        </div>
        <p className="text-xs text-gray-400">AI가 대화를 분석하고 있습니다</p>
      </div>
    </div>
  );
}

// ── Pinned meeting note banner ─────────────────────────────────────────────────

interface PinnedNoteBannerProps {
  roomId: string;
}

export function PinnedNoteBanner({ roomId }: PinnedNoteBannerProps) {
  const { pinnedNotes, clearPinnedNote } = useMeetingStore();
  const note = pinnedNotes[roomId];
  const [expanded, setExpanded] = useState(false);

  if (!note) return null;

  return (
    <div
      className="mx-4 mt-3 mb-1 rounded-xl border overflow-hidden"
      style={{
        borderColor: 'rgba(37,99,235,0.3)',
        backgroundColor: 'rgba(37,99,235,0.04)',
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-red-50/50 transition-colors"
      >
        <Pin size={12} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
        <span className="text-xs font-semibold flex-1 truncate" style={{ color: 'var(--brand-primary)' }}>
          📋 공지: {note.title}
        </span>
        <span className="text-[10px] text-gray-400 flex-shrink-0">{note.date}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            clearPinnedNote(roomId);
          }}
          className="text-gray-300 hover:text-gray-500 transition-colors ml-1 flex-shrink-0"
        >
          <X size={12} />
        </button>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2 border-t border-red-100">
          <p className="text-xs text-gray-600 leading-relaxed pt-2">{note.summary}</p>
          {note.keyDecisions.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">핵심 결정</p>
              {note.keyDecisions.map((d, i) => (
                <div key={i} className="text-xs text-gray-700 flex items-start gap-1.5 mb-1">
                  <span
                    className="w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    {i + 1}
                  </span>
                  {d}
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-gray-400">
            참여자: {note.participants.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatNotesAsText(notes: MeetingNotes): string {
  const lines: string[] = [
    `# ${notes.title}`,
    `날짜: ${notes.date} | 시간: ${notes.duration} | 참여자: ${notes.participants.join(', ')}`,
    '',
    '## 회의 요약',
    notes.summary,
    '',
  ];

  if (notes.keyDecisions.length > 0) {
    lines.push('## 핵심 결정사항');
    notes.keyDecisions.forEach((d, i) => lines.push(`${i + 1}. ${d}`));
    lines.push('');
  }

  if (notes.agendaItems.length > 0) {
    lines.push('## 안건 및 논의 내용');
    notes.agendaItems.forEach((item, i) => {
      lines.push(`### ${i + 1}. ${item.topic}`);
      lines.push(item.discussion);
      if (item.decision) lines.push(`결정: ${item.decision}`);
      if (item.actionItem) {
        lines.push(
          `액션: ${item.actionItem.task} → ${item.actionItem.assignee}${item.actionItem.deadline ? ` (${item.actionItem.deadline})` : ''}`
        );
      }
      lines.push('');
    });
  }

  if (notes.nextSteps.length > 0) {
    lines.push('## 다음 단계');
    notes.nextSteps.forEach((s) => lines.push(`- [ ] ${s}`));
  }

  return lines.join('\n');
}
