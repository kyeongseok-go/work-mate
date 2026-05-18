'use client';

import { useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, MoreHorizontal, Paperclip, Link as LinkIcon } from 'lucide-react';
import { getChatRoom, chatRooms } from '@/data/messages';
import { getPerson, getMe } from '@/data/people';
import { cn } from '@/lib/utils';
import { SmartCatchup } from '@/components/chat/SmartCatchup';
import { ReplyDraft } from '@/components/chat/ReplyDraft';
import {
  MeetingHeaderButton,
  ActiveMeetingBanner,
  SimulationButton,
} from '@/components/chat/MeetingControls';
import { PinnedNoteBanner } from '@/components/chat/MeetingNotesModal';
import { useMeetingStore } from '@/store/meetingStore';
import { useFeatureStore } from '@/store/featureStore';
import { usePriorityStore, getPriorityTier, PRIORITY_INDICATORS } from '@/store/priorityStore';
import { ReadTrackingToast, useReadTrackingToast } from '@/components/chat/PriorityDashboard';
import { useWorkLifeStore } from '@/store/workLifeStore';

function formatTime(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

function shouldShowDateDivider(curr: string, prev: string | undefined): boolean {
  if (!prev) return true;
  return new Date(curr).toDateString() !== new Date(prev).toDateString();
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500',
    'bg-orange-500', 'bg-teal-500', 'bg-pink-500', 'bg-indigo-500',
  ];
  const colorIdx = name.charCodeAt(0) % colors.length;
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  return (
    <div
      className={`${sizeClass} ${colors[colorIdx]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
    >
      {name.slice(0, 1)}
    </div>
  );
}

export default function ChatPage() {
  const params = useParams();
  const roomId = params.id as string;
  const room = getChatRoom(roomId);
  const me = getMe();
  const { startMeeting } = useMeetingStore();
  const { features } = useFeatureStore();
  const { getPriorityScore } = usePriorityStore();
  const { show: showReadToast, trigger: triggerReadToast } = useReadTrackingToast();
  const [inputValue, setInputValue] = useState('');
  const [sendWarningDismissed, setSendWarningDismissed] = useState(false);

  // Work-life mode
  const workLifeStore = useWorkLifeStore();
  const workLifeOn = features.workLifeMode;
  const isOutside = workLifeOn && workLifeStore.isOutsideWorkHours();
  const showSendWarning =
    isOutside &&
    workLifeStore.showSenderWarning &&
    inputValue.length > 0 &&
    !sendWarningDismissed;

  if (!room) notFound();

  // Priority-sorted room list for header nav (when toggle ON)
  const sortedRooms = features.priorityLearning
    ? [...chatRooms].sort((a, b) => getPriorityScore(b.id) - getPriorityScore(a.id))
    : chatRooms;

  // Last message not sent by current user (for reply draft context)
  const lastReceivedMessage =
    [...room.messages].reverse().find((m) => m.senderId !== me.id) ?? null;

  // Last 5 messages for conversation context
  const conversationContext = room.messages.slice(-5);

  // Sender info for reply draft
  const lastSender = lastReceivedMessage ? getPerson(lastReceivedMessage.senderId) : null;

  const categoryColors: Record<string, string> = {
    project: 'bg-red-500',
    team: 'bg-blue-500',
    executive: 'bg-slate-700',
    casual: 'bg-gray-500',
  };

  const handleSimulate = () => {
    // Start meeting from message index 0 for simulation
    startMeeting(roomId, 0);
  };

  return (
    <div className="flex flex-col h-screen md:h-screen bg-gray-50">
      {/* Chat Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <Link href="/" className="md:hidden text-gray-400 hover:text-gray-600 p-1">
          <ArrowLeft size={18} />
        </Link>

        {/* Room List - Desktop Left Panel */}
        <div className="hidden md:flex items-center gap-2 mr-2">
          {sortedRooms.map((r) => {
            const pScore = features.priorityLearning ? getPriorityScore(r.id) : null;
            const tier = pScore !== null ? getPriorityTier(pScore) : null;
            const indicator = tier ? PRIORITY_INDICATORS[tier] : null;
            return (
              <Link key={r.id} href={`/chat/${r.id}`}>
                <div
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-1',
                    r.id === roomId
                      ? 'text-white'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  )}
                  style={r.id === roomId ? { backgroundColor: 'var(--brand-primary)' } : {}}
                >
                  {indicator && (
                    <span className="text-[10px]" title={`우선순위 ${indicator.label}`}>
                      {indicator.dot}
                    </span>
                  )}
                  {r.name}
                  {r.unreadCount > 0 && r.id !== roomId && (
                    <span
                      className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-0.5 rounded-full text-white text-[10px] font-bold"
                      style={{ backgroundColor: 'var(--brand-primary)' }}
                    >
                      {r.unreadCount}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="flex-1 md:flex-none flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${categoryColors[room.category]} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
            {room.name.slice(0, 1)}
          </div>
          <div>
            <h1 className="font-semibold text-gray-900 text-sm">{room.name}</h1>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Users size={11} />
              <span>{room.memberIds.length}명</span>
              <span className="mx-1">·</span>
              <span className="truncate max-w-[180px]">{room.description}</span>
            </div>
          </div>
        </div>

        {/* Meeting controls — visible only when toggle is ON */}
        <div className="flex items-center gap-2 ml-auto">
          <SimulationButton
            roomId={roomId}
            messageCount={room.messages.length}
            onSimulate={handleSimulate}
          />
          <MeetingHeaderButton
            roomId={roomId}
            messages={room.messages}
            memberIds={room.memberIds}
          />
          <button className="text-gray-400 hover:text-gray-600 p-1">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </header>

      {/* Active meeting banner — shows when meeting is in progress */}
      <ActiveMeetingBanner roomId={roomId} />

      {/* Smart Catchup — renders only when feature toggle is ON */}
      <SmartCatchup roomId={roomId} messages={room.messages} />

      {/* Pinned meeting notes — renders only when a note is pinned */}
      <PinnedNoteBanner roomId={roomId} />

      {/* Work-Life off-hours banner */}
      {isOutside && workLifeStore.autoMute && (
        <div
          className="flex-shrink-0 px-4 py-2.5 flex flex-col gap-1"
          style={{
            backgroundColor: 'rgba(88, 28, 235, 0.06)',
            borderBottom: '1px solid rgba(88,28,235,0.12)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">🌙</span>
            <span className="text-xs font-semibold text-purple-800">
              {workLifeStore.simulatedTime ?? new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })} — 근무 시간 외
            </span>
            <span className="text-[10px] text-purple-500 ml-1">받은 메시지가 자동 무음 처리됨</span>
          </div>
          {workLifeStore.autoReply && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-purple-400">자동 응답 발송:</span>
              <span className="text-[10px] text-purple-600 italic">
                &apos;{workLifeStore.autoReplyMessage}&apos;
              </span>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {room.messages.map((msg, idx) => {
          const sender = getPerson(msg.senderId);
          const isMe = msg.senderId === me.id;
          const prev = room.messages[idx - 1];
          const showDate = shouldShowDateDivider(msg.timestamp, prev?.timestamp);
          const isSameSenderAsPrev =
            prev &&
            prev.senderId === msg.senderId &&
            !shouldShowDateDivider(msg.timestamp, prev.timestamp);

          // Work-life: determine if this received message is whitelisted (urgent bypass)
          const isWhitelisted =
            isOutside && !isMe && sender
              ? workLifeStore.isWhitelistedMessage(msg.content, sender.name)
              : false;
          // Muted = off hours + autoMute + not whitelisted + not from me
          const isMuted = isOutside && workLifeStore.autoMute && !isMe && !isWhitelisted;

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium px-2">
                    {formatDate(msg.timestamp)}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}

              <div
                className={cn(
                  'flex gap-2.5',
                  isMe ? 'flex-row-reverse' : 'flex-row',
                  isSameSenderAsPrev ? 'mt-0.5' : 'mt-3',
                  isMuted ? 'opacity-50' : ''
                )}
              >
                {/* Avatar */}
                {!isMe && (
                  <div className={isSameSenderAsPrev ? 'w-9 flex-shrink-0' : ''}>
                    {!isSameSenderAsPrev && sender && (
                      <Avatar name={sender.name} />
                    )}
                  </div>
                )}

                <div className={cn('flex flex-col', isMe ? 'items-end' : 'items-start', 'max-w-[70%]')}>
                  {/* Sender name + urgent/muted badge */}
                  {!isMe && !isSameSenderAsPrev && sender && (
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-xs font-semibold text-gray-700">{sender.name}</span>
                      <span className="text-[10px] text-gray-400">{sender.role}</span>
                      {isWhitelisted && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
                          🔴 긴급
                        </span>
                      )}
                      {isMuted && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">
                          🔕 무음
                        </span>
                      )}
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className={cn(
                      'px-3 py-2 rounded-2xl text-sm leading-relaxed break-words',
                      isMe
                        ? 'rounded-tr-md text-white'
                        : 'rounded-tl-md bg-white text-gray-800 border border-gray-100 shadow-sm',
                      features.priorityLearning && !isMe ? 'cursor-pointer' : '',
                      isWhitelisted ? 'ring-1 ring-red-300' : ''
                    )}
                    style={isMe ? { backgroundColor: 'var(--brand-primary)' } : {}}
                    onClick={features.priorityLearning && !isMe ? triggerReadToast : undefined}
                  >
                    {/* Mention highlight */}
                    {msg.mentionIds && msg.mentionIds.includes('me') ? (
                      <span>
                        {msg.content.replace('@고연구원', '')}
                        {msg.content.includes('@고연구원') && (
                          <span
                            className={cn(
                              'font-semibold rounded px-0.5',
                              isMe ? 'bg-red-700 text-red-100' : 'bg-red-50 text-red-600'
                            )}
                          >
                            @고연구원
                          </span>
                        )}
                      </span>
                    ) : (
                      msg.content
                    )}

                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.attachments.map((att, i) => (
                          <div
                            key={i}
                            className={cn(
                              'flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg',
                              isMe
                                ? 'bg-red-700/40 text-red-100'
                                : 'bg-gray-50 text-gray-600 border border-gray-100'
                            )}
                          >
                            {att.type === 'link' ? (
                              <LinkIcon size={11} />
                            ) : (
                              <Paperclip size={11} />
                            )}
                            <span className="truncate">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reactions + Time */}
                  <div className={cn('flex items-center gap-2 mt-0.5', isMe ? 'flex-row-reverse' : 'flex-row')}>
                    <span className="text-[10px] text-gray-400">{formatTime(msg.timestamp)}</span>
                    {msg.reactions && msg.reactions.map((r, i) => (
                      <span
                        key={i}
                        className="text-xs bg-white border border-gray-100 rounded-full px-1.5 py-0.5 shadow-sm cursor-pointer hover:bg-gray-50"
                      >
                        {r.emoji} {r.count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Read tracking toast — renders only when priorityLearning is ON */}
      <ReadTrackingToast show={showReadToast} />

      {/* Reply Draft — renders only when smartReply toggle is ON */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 pt-2">
        <ReplyDraft
          lastReceivedMessage={lastReceivedMessage}
          conversationContext={conversationContext}
          userName={me.name}
          senderName={lastSender?.name}
          senderRole={lastSender?.role}
          onSelectDraft={(text) => setInputValue(text)}
        />

        {/* Work-life send warning */}
        {showSendWarning && (
          <div className="mx-4 mb-2 px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50">
            <p className="text-xs font-semibold text-amber-800 mb-2">
              ⚠️ 받는 사람이 현재 근무 시간 외입니다. 정말 보내시겠습니까?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setInputValue('');
                  setSendWarningDismissed(false);
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => setSendWarningDismissed(true)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#2563eb' }}
              >
                그래도 보내기
              </button>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="px-4 pb-3">
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 border"
            style={
              isOutside && workLifeStore.showSenderWarning
                ? {
                    backgroundColor: 'rgba(245, 243, 255, 0.8)',
                    borderColor: 'rgba(124, 58, 237, 0.25)',
                  }
                : { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }
            }
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setSendWarningDismissed(false);
              }}
              placeholder="메시지를 입력하세요..."
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
            />
            <button
              className="text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
