export const runtime = 'edge';

import { callClaude } from '@/lib/claude';
import { Message } from '@/data/messages';

export interface SearchResult {
  messageId: string;
  relevance: number; // 0-100
  reasoning: string; // why this is relevant (Korean)
  roomName: string;
  roomId: string;
  sender: string;
  content: string;
  timestamp: string;
}

interface MessageWithContext extends Message {
  roomId: string;
  roomName: string;
  senderName: string;
}

const SYSTEM_PROMPT = `당신은 기업 메신저 메시지를 검색하는 AI 어시스턴트입니다.
사용자의 자연어 검색 쿼리에 가장 관련 높은 메시지 5개를 찾으세요.

**지침:**
- 반드시 유효한 JSON만 반환하세요. \`\`\`json 블록으로 감싸도 됩니다.
- 키워드 매칭이 아닌 의미적 관련성으로 판단하세요.
- 예: "마감일 관련" → 날짜/기한을 포함한 결정사항이나 일정 메시지를 찾음
- relevance는 0~100 사이 정수로, 관련성이 높을수록 높은 점수
- reasoning은 한국어로 왜 이 메시지가 관련있는지 설명 (1~2문장)
- 관련 메시지가 5개 미만이면 그만큼만 반환

반환 JSON 형식:
{
  "results": [
    {
      "messageId": "메시지 ID",
      "relevance": 숫자,
      "reasoning": "관련성 이유 설명"
    }
  ]
}`;

function buildUserMessage(query: string, messages: MessageWithContext[]): string {
  const formatted = messages
    .map((m) => {
      const attachmentNote =
        m.attachments && m.attachments.length > 0
          ? ` [첨부: ${m.attachments.map((a) => a.name).join(', ')}]`
          : '';
      return `[ID:${m.id}] [채팅방:${m.roomName}] [보낸사람:${m.senderName}] [시간:${m.timestamp}] ${m.content}${attachmentNote}`;
    })
    .join('\n');

  return `검색 쿼리: "${query}"\n\n--- 메시지 목록 ---\n${formatted}`;
}

interface RawSearchResult {
  messageId: string;
  relevance: number;
  reasoning: string;
}

function parseSearchResults(raw: string): RawSearchResult[] {
  const stripped = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed = JSON.parse(stripped);
  const results = Array.isArray(parsed.results) ? parsed.results : [];

  return results.map((r: Partial<RawSearchResult>) => ({
    messageId: typeof r.messageId === 'string' ? r.messageId : '',
    relevance: typeof r.relevance === 'number' ? Math.min(100, Math.max(0, r.relevance)) : 0,
    reasoning: typeof r.reasoning === 'string' ? r.reasoning : '',
  }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, messages } = body as { query: string; messages: MessageWithContext[] };

    if (!query || typeof query !== 'string' || !Array.isArray(messages)) {
      return Response.json(
        { error: 'query와 messages 필드가 필요합니다.' },
        { status: 400 }
      );
    }

    if (query.trim().length === 0) {
      return Response.json(
        { error: '검색어를 입력하세요.' },
        { status: 400 }
      );
    }

    const userMessage = buildUserMessage(query.trim(), messages);
    const rawResult = await callClaude(SYSTEM_PROMPT, userMessage);
    const rawResults = parseSearchResults(rawResult);

    // Enrich results with full message data
    const messageMap = new Map(messages.map((m) => [m.id, m]));
    const enriched: SearchResult[] = rawResults
      .filter((r) => r.messageId && messageMap.has(r.messageId))
      .map((r) => {
        const msg = messageMap.get(r.messageId)!;
        return {
          messageId: r.messageId,
          relevance: r.relevance,
          reasoning: r.reasoning,
          roomName: msg.roomName,
          roomId: msg.roomId,
          sender: msg.senderName,
          content: msg.content,
          timestamp: msg.timestamp,
        };
      })
      .sort((a, b) => b.relevance - a.relevance);

    return Response.json({ success: true, data: enriched });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
