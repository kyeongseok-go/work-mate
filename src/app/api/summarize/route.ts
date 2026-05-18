export const runtime = 'edge';

import { callClaude } from '@/lib/claude';
import { Message } from '@/data/messages';

export interface SummaryResult {
  decisions: { title: string; detail: string; by: string }[];
  actionItems: { task: string; assignee: string; deadline?: string }[];
  mentions: { from: string; context: string }[];
  attachments: { name: string; sharedBy: string; context: string }[];
  keyTopics: string[];
  messageCount: number;
  urgencyLevel: 'high' | 'medium' | 'low';
  limitedNote?: string;
}

const SYSTEM_PROMPT = `당신은 기업 메신저 대화를 분석하는 AI 어시스턴트입니다.
주어진 채팅 메시지들을 분석하여 아래 JSON 형식으로 요약해주세요.

**중요 지침:**
- 반드시 유효한 JSON만 반환하세요. \`\`\`json 블록으로 감싸도 됩니다.
- 일상적인 잡담 채팅방(점심, 날씨, 개인 이야기 등)의 경우, 비즈니스적 내용이 없다면 decisions와 actionItems를 최소화하고 limitedNote 필드에 "이 채팅방은 일상 대화가 주를 이루어 AI 요약 효과가 제한적입니다"를 포함하세요.
- '고연구원' 또는 id가 'me'인 사람에 대한 멘션(@고연구원)을 mentions 배열에 포함하세요.
- 파일, 이미지, 링크 공유는 attachments에 포함하세요.
- urgencyLevel은 마감일, 긴급 키워드, 임원 요청 등을 기준으로 판단하세요.

반환 JSON 형식:
{
  "decisions": [
    { "title": "결정 제목", "detail": "상세 내용", "by": "결정한 사람/팀" }
  ],
  "actionItems": [
    { "task": "할 일", "assignee": "담당자", "deadline": "마감일 (선택)" }
  ],
  "mentions": [
    { "from": "언급한 사람", "context": "언급 맥락 요약" }
  ],
  "attachments": [
    { "name": "파일명", "sharedBy": "공유한 사람", "context": "공유 이유/맥락" }
  ],
  "keyTopics": ["핵심 주제 1", "핵심 주제 2"],
  "messageCount": 숫자,
  "urgencyLevel": "high" | "medium" | "low",
  "limitedNote": "일상 채팅방인 경우만 포함"
}`;

function parseSummaryResult(raw: string): SummaryResult {
  // Strip ```json ... ``` fences if present
  const stripped = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed = JSON.parse(stripped);

  return {
    decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
    actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
    mentions: Array.isArray(parsed.mentions) ? parsed.mentions : [],
    attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
    keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [],
    messageCount: typeof parsed.messageCount === 'number' ? parsed.messageCount : 0,
    urgencyLevel:
      parsed.urgencyLevel === 'high' || parsed.urgencyLevel === 'medium'
        ? parsed.urgencyLevel
        : 'low',
    limitedNote: typeof parsed.limitedNote === 'string' ? parsed.limitedNote : undefined,
  };
}

function buildUserMessage(roomId: string, messages: Message[]): string {
  const formatted = messages
    .map((m) => {
      const attachmentNote =
        m.attachments && m.attachments.length > 0
          ? ` [첨부: ${m.attachments.map((a) => a.name).join(', ')}]`
          : '';
      return `[${m.timestamp}] ${m.senderId}: ${m.content}${attachmentNote}`;
    })
    .join('\n');

  return `채팅방 ID: ${roomId}\n총 메시지 수: ${messages.length}\n\n--- 대화 내용 ---\n${formatted}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomId, messages } = body as { roomId: string; messages: Message[] };

    if (!roomId || !Array.isArray(messages)) {
      return Response.json(
        { error: 'roomId와 messages 필드가 필요합니다.' },
        { status: 400 }
      );
    }

    const userMessage = buildUserMessage(roomId, messages);
    const rawResult = await callClaude(SYSTEM_PROMPT, userMessage);
    const summary = parseSummaryResult(rawResult);

    return Response.json({ success: true, data: summary });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
