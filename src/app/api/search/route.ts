export const runtime = 'edge';

import { callClaude } from '@/lib/claude';
import { parseLenientJson } from '@/lib/json';
import { Message } from '@/data/messages';

export interface SearchResult {
  messageId: string;
  relevance: number; // 0-100 의미 관련도
  rerankScore: number; // 0-100 재랭킹 점수 (검색 품질 신호 — 관련도와 분리)
  matchedTerms: string[]; // 쿼리 의미 해석상 매칭된 키워드
  reasoning: string; // 왜 관련있는지 (한국어)
  roomName: string;
  roomId: string;
  sender: string;
  content: string;
  timestamp: string;
}

export interface SearchSynthesis {
  text: string; // 상위 결과 근거 합성 답변 (1~3문장)
  citations: string[]; // 근거 messageId[]
}

export interface SearchResponse {
  success: boolean;
  data?: SearchResult[];
  synthesizedAnswer?: SearchSynthesis; // 검색 결과 기반 한 줄 답 + 출처
  queryInterpretation?: string; // 쿼리 의미 해석 (검색 품질 가시화)
  error?: string;
}

interface MessageWithContext extends Message {
  roomId: string;
  roomName: string;
  senderName: string;
}

const SYSTEM_PROMPT = `당신은 기업 메신저의 검색 품질을 책임지는 AI 검색 엔진입니다.
단순 키워드 매칭이 아닌, 쿼리의 의도를 해석하고 의미적으로 재랭킹하며 근거 기반 답변을 합성합니다.

**수행 단계:**
1. queryInterpretation: 사용자가 실제로 찾으려는 바를 한 문장으로 해석
2. results: 의미적으로 관련 높은 메시지 최대 5개. 각 결과마다
   - relevance(0~100): 의미 관련도
   - rerankScore(0~100): 맥락·최신성·신뢰도까지 반영한 최종 재랭킹 점수
   - matchedTerms: 쿼리 해석상 이 메시지가 매칭된 의미 키워드 (1~4개)
   - reasoning: 왜 관련있는지 한국어 1~2문장
3. synthesizedAnswer: 상위 결과들을 근거로 사용자 질문에 대한 직접 답변(1~3문장)과
   그 근거가 된 messageId 목록(citations)

**지침:**
- 반드시 유효한 JSON만 반환하세요. \`\`\`json 블록으로 감싸도 됩니다.
- 키워드가 아닌 의미로 판단하세요.
- 관련 메시지가 없으면 results는 빈 배열, synthesizedAnswer.text는 "관련 정보를 찾지 못했습니다".

반환 JSON 형식:
{
  "queryInterpretation": "쿼리 의미 해석",
  "results": [
    { "messageId": "ID", "relevance": 0~100, "rerankScore": 0~100, "matchedTerms": ["키워드"], "reasoning": "이유" }
  ],
  "synthesizedAnswer": { "text": "근거 기반 답변", "citations": ["messageId", ...] }
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
  rerankScore: number;
  matchedTerms: string[];
  reasoning: string;
}

interface ParsedSearch {
  queryInterpretation: string;
  results: RawSearchResult[];
  synthesizedAnswer: SearchSynthesis;
}

function clampPct(n: unknown, fallback = 0): number {
  return typeof n === 'number' && Number.isFinite(n)
    ? Math.min(100, Math.max(0, Math.round(n)))
    : fallback;
}

function parseSearch(raw: string): ParsedSearch {
  // Tolerates ```json fences and token-limit truncation (see src/lib/json.ts).
  const { value: parsed } = parseLenientJson<Record<string, unknown>>(raw);

  const rawResults = Array.isArray(parsed.results) ? parsed.results : [];
  const results: RawSearchResult[] = rawResults.map((r: Partial<RawSearchResult>) => {
    const relevance = clampPct(r.relevance, 0);
    return {
      messageId: typeof r.messageId === 'string' ? r.messageId : '',
      relevance,
      rerankScore: clampPct(r.rerankScore, relevance),
      matchedTerms: Array.isArray(r.matchedTerms)
        ? r.matchedTerms.filter((t): t is string => typeof t === 'string').slice(0, 4)
        : [],
      reasoning: typeof r.reasoning === 'string' ? r.reasoning : '',
    };
  });

  const rawSynth = parsed.synthesizedAnswer;
  const synthesizedAnswer: SearchSynthesis =
    rawSynth && typeof rawSynth === 'object'
      ? {
          text:
            typeof (rawSynth as Record<string, unknown>).text === 'string'
              ? String((rawSynth as Record<string, unknown>).text)
              : '',
          citations: Array.isArray((rawSynth as Record<string, unknown>).citations)
            ? ((rawSynth as Record<string, unknown>).citations as unknown[]).filter(
                (c): c is string => typeof c === 'string'
              )
            : [],
        }
      : { text: '', citations: [] };

  return {
    queryInterpretation:
      typeof parsed.queryInterpretation === 'string' ? parsed.queryInterpretation : '',
    results,
    synthesizedAnswer,
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { query, messages } = body as { query: string; messages: MessageWithContext[] };

    if (!query || typeof query !== 'string' || !Array.isArray(messages)) {
      return Response.json(
        { success: false, error: 'query와 messages 필드가 필요합니다.' } satisfies SearchResponse,
        { status: 400 }
      );
    }

    if (query.trim().length === 0) {
      return Response.json(
        { success: false, error: '검색어를 입력하세요.' } satisfies SearchResponse,
        { status: 400 }
      );
    }

    const userMessage = buildUserMessage(query.trim(), messages);
    const rawResult = await callClaude(SYSTEM_PROMPT, userMessage);
    const { queryInterpretation, results, synthesizedAnswer } = parseSearch(rawResult);

    const messageMap = new Map(messages.map((m) => [m.id, m]));
    const enriched: SearchResult[] = results
      .filter((r) => r.messageId && messageMap.has(r.messageId))
      .map((r) => {
        const msg = messageMap.get(r.messageId)!;
        return {
          messageId: r.messageId,
          relevance: r.relevance,
          rerankScore: r.rerankScore,
          matchedTerms: r.matchedTerms,
          reasoning: r.reasoning,
          roomName: msg.roomName,
          roomId: msg.roomId,
          sender: msg.senderName,
          content: msg.content,
          timestamp: msg.timestamp,
        };
      })
      .sort((a, b) => b.rerankScore - a.rerankScore);

    // citations 는 실제 결과에 존재하는 messageId 로만 한정
    const validIds = new Set(enriched.map((e) => e.messageId));
    const safeSynth: SearchSynthesis = {
      text: synthesizedAnswer.text,
      citations: synthesizedAnswer.citations.filter((c) => validIds.has(c)),
    };

    const response: SearchResponse = {
      success: true,
      data: enriched,
      queryInterpretation,
      synthesizedAnswer: safeSynth.text ? safeSynth : undefined,
    };
    return Response.json(response);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

    return Response.json(
      { success: false, error: message } satisfies SearchResponse,
      { status: 500 }
    );
  }
}
