export const runtime = 'edge';

import { callClaude } from '@/lib/claude';
import { Message } from '@/data/messages';

export interface AgendaItem {
  topic: string;
  discussion: string;
  decision?: string;
  actionItem?: { task: string; assignee: string; deadline?: string };
}

export interface MeetingNotes {
  title: string;
  date: string;
  duration: string;
  participants: string[];
  summary: string;
  agendaItems: AgendaItem[];
  nextSteps: string[];
  keyDecisions: string[];
}

const SYSTEM_PROMPT = `당신은 기업 채팅 메시지를 분석하여 회의록을 작성하는 AI입니다.
주어진 채팅 메시지들을 바탕으로 구조화된 회의록을 아래 JSON 형식으로 작성해주세요.

**지침:**
- 반드시 유효한 JSON만 반환하세요. \`\`\`json 블록으로 감싸도 됩니다.
- title은 대화 주제를 함축하는 한국어 제목 (예: "마이그레이션 아키텍처 검토 회의")
- summary는 2~3문장으로 핵심 내용 요약
- agendaItems는 논의된 주요 안건들 (최소 2개, 최대 6개)
- decision이 있는 경우에만 포함, 없으면 생략
- actionItem이 있는 경우에만 포함, 없으면 생략
- nextSteps는 향후 할 일 목록 (2~5개)
- keyDecisions는 가장 중요한 결정사항 요약 (1~4개, 간결하게)
- participants는 대화에 등장한 실제 참여자 이름 목록

반환 JSON 형식:
{
  "title": "회의 제목",
  "date": "날짜 문자열",
  "duration": "약 XX분",
  "participants": ["참여자1", "참여자2"],
  "summary": "2~3문장 요약",
  "agendaItems": [
    {
      "topic": "안건 제목",
      "discussion": "논의 내용 요약",
      "decision": "결정사항 (선택)",
      "actionItem": { "task": "할 일", "assignee": "담당자", "deadline": "마감일 (선택)" }
    }
  ],
  "nextSteps": ["다음 할 일 1", "다음 할 일 2"],
  "keyDecisions": ["핵심 결정 1", "핵심 결정 2"]
}`;

function parseMeetingNotes(raw: string): MeetingNotes {
  const stripped = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed = JSON.parse(stripped);

  return {
    title: typeof parsed.title === 'string' ? parsed.title : '회의록',
    date: typeof parsed.date === 'string' ? parsed.date : new Date().toLocaleDateString('ko-KR'),
    duration: typeof parsed.duration === 'string' ? parsed.duration : '알 수 없음',
    participants: Array.isArray(parsed.participants) ? parsed.participants : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    agendaItems: Array.isArray(parsed.agendaItems)
      ? parsed.agendaItems.map((item: Record<string, unknown>) => ({
          topic: typeof item.topic === 'string' ? item.topic : '',
          discussion: typeof item.discussion === 'string' ? item.discussion : '',
          decision: typeof item.decision === 'string' ? item.decision : undefined,
          actionItem:
            item.actionItem && typeof item.actionItem === 'object'
              ? {
                  task: String((item.actionItem as Record<string, unknown>).task ?? ''),
                  assignee: String((item.actionItem as Record<string, unknown>).assignee ?? ''),
                  deadline:
                    typeof (item.actionItem as Record<string, unknown>).deadline === 'string'
                      ? String((item.actionItem as Record<string, unknown>).deadline)
                      : undefined,
                }
              : undefined,
        }))
      : [],
    nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
    keyDecisions: Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions : [],
  };
}

function buildUserMessage(
  roomId: string,
  messages: Message[],
  participants: string[]
): string {
  const formatted = messages
    .map((m) => {
      const attachmentNote =
        m.attachments && m.attachments.length > 0
          ? ` [첨부: ${m.attachments.map((a) => a.name).join(', ')}]`
          : '';
      return `[${m.timestamp}] ${m.senderId}: ${m.content}${attachmentNote}`;
    })
    .join('\n');

  return `채팅방 ID: ${roomId}
참여자: ${participants.join(', ')}
총 메시지 수: ${messages.length}
시작 시간: ${messages[0]?.timestamp ?? '알 수 없음'}
종료 시간: ${messages[messages.length - 1]?.timestamp ?? '알 수 없음'}

--- 대화 내용 ---
${formatted}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomId, messages, participants } = body as {
      roomId: string;
      messages: Message[];
      participants: string[];
    };

    if (!roomId || !Array.isArray(messages) || !Array.isArray(participants)) {
      return Response.json(
        { error: 'roomId, messages, participants 필드가 필요합니다.' },
        { status: 400 }
      );
    }

    const userMessage = buildUserMessage(roomId, messages, participants);
    const rawResult = await callClaude(SYSTEM_PROMPT, userMessage);
    const notes = parseMeetingNotes(rawResult);

    return Response.json({ success: true, data: notes });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
