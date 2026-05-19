export const runtime = 'edge';

import { callClaude } from '@/lib/claude';
import { parseLenientJson } from '@/lib/json';
import { type Severity, toSeverity } from '@/lib/severity';

/** 데일리 브리핑 — 채팅·알림·액션을 종합한 "오늘 알아야 할 것" 에이전트 */
export interface DigestMustKnow {
  title: string;
  severity: Severity;
  sourceRef: string; // 출처 (예: "알림", "프로젝트A 채팅방")
}

export interface DigestAction {
  task: string;
  owner?: string;
  due?: string;
}

export interface DailyDigest {
  generatedAt: string;
  headline: string; // 오늘 한 줄
  mustKnow: DigestMustKnow[]; // 3~5
  pendingActions: DigestAction[];
  suggestedFocus: string; // 추천 집중
}

export interface DigestResponse {
  success: boolean;
  data?: DailyDigest;
  error?: string;
}

export interface DigestContext {
  notifications: { title: string; body: string }[];
  rooms: { name: string; lastMessage: string }[];
  actions: { task: string; owner?: string }[];
}

const SYSTEM_PROMPT = `당신은 그룹웨어 사용자의 하루를 종합하는 AI 에이전트입니다.
흩어진 채팅·알림·미완료 액션을 분석해 "오늘 사용자가 반드시 알아야 할 것"을
한 장의 브리핑으로 종합합니다. 단순 나열이 아니라 우선순위와 행동을 제시하세요.

**지침:**
- 반드시 유효한 JSON만 반환하세요. \`\`\`json 블록으로 감싸도 됩니다.
- headline: 오늘 상황을 한 문장으로 (한국어)
- mustKnow: 가장 중요한 3~5개. 각 항목에 severity(P0~P3)와 sourceRef(출처) 포함
  - P0=즉시 / P1=중요 / P2=보통 / P3=참고
- pendingActions: 처리 대기 액션 (task, owner 선택, due 선택)
- suggestedFocus: 오늘 무엇에 집중하면 좋을지 1~2문장 추천

반환 JSON 형식:
{
  "headline": "오늘 한 줄 요약",
  "mustKnow": [ { "title": "...", "severity": "P0", "sourceRef": "출처" } ],
  "pendingActions": [ { "task": "...", "owner": "담당자(선택)", "due": "마감(선택)" } ],
  "suggestedFocus": "추천 집중 1~2문장"
}`;

function buildUserMessage(ctx: DigestContext): string {
  const notif = ctx.notifications
    .map((n) => `- ${n.title}: ${n.body}`)
    .join('\n');
  const rooms = ctx.rooms
    .map((r) => `- [${r.name}] ${r.lastMessage}`)
    .join('\n');
  const actions = ctx.actions
    .map((a) => `- ${a.task}${a.owner ? ` (담당: ${a.owner})` : ''}`)
    .join('\n');

  return `오늘의 업무 컨텍스트입니다. 종합 브리핑을 작성하세요.

[알림]
${notif || '(없음)'}

[채팅방 최근 메시지]
${rooms || '(없음)'}

[미완료 액션]
${actions || '(없음)'}`;
}

function parseDigest(raw: string): DailyDigest {
  // Tolerates ```json fences and token-limit truncation (see src/lib/json.ts).
  const { value: parsed } = parseLenientJson<Record<string, unknown>>(raw);

  const mustKnow: DigestMustKnow[] = Array.isArray(parsed.mustKnow)
    ? parsed.mustKnow.map((m: Record<string, unknown>) => ({
        title: typeof m.title === 'string' ? m.title : '',
        severity: toSeverity(m.severity),
        sourceRef: typeof m.sourceRef === 'string' ? m.sourceRef : '',
      }))
    : [];

  const pendingActions: DigestAction[] = Array.isArray(parsed.pendingActions)
    ? parsed.pendingActions.map((a: Record<string, unknown>) => ({
        task: typeof a.task === 'string' ? a.task : '',
        owner: typeof a.owner === 'string' ? a.owner : undefined,
        due: typeof a.due === 'string' ? a.due : undefined,
      }))
    : [];

  return {
    generatedAt: new Date().toISOString(),
    headline: typeof parsed.headline === 'string' ? parsed.headline : '오늘의 브리핑',
    mustKnow,
    pendingActions,
    suggestedFocus:
      typeof parsed.suggestedFocus === 'string' ? parsed.suggestedFocus : '',
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { context } = body as { context: DigestContext };

    if (
      !context ||
      !Array.isArray(context.notifications) ||
      !Array.isArray(context.rooms) ||
      !Array.isArray(context.actions)
    ) {
      return Response.json(
        { success: false, error: 'context(notifications, rooms, actions) 필드가 필요합니다.' } satisfies DigestResponse,
        { status: 400 }
      );
    }

    const userMessage = buildUserMessage(context);
    const rawResult = await callClaude(SYSTEM_PROMPT, userMessage);
    const digest = parseDigest(rawResult);

    return Response.json({ success: true, data: digest } satisfies DigestResponse);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    return Response.json(
      { success: false, error: message } satisfies DigestResponse,
      { status: 500 }
    );
  }
}
