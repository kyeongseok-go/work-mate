export const runtime = 'edge';

import { callClaude } from '@/lib/claude';
import { type Notification } from '@/data/notifications';

export interface ClassifiedNotification {
  id: string;
  priority: 'urgent' | 'important' | 'info';
  reason: string;
  confidence: number;
}

interface ClassifyResponse {
  success: boolean;
  data?: ClassifiedNotification[];
  error?: string;
}

const SYSTEM_PROMPT = `당신은 기업 메신저 시스템 알림의 우선순위를 분류하는 AI입니다.
각 알림을 분석하여 긴급도를 판단하고 아래 JSON 형식으로 반환하세요.

**분류 기준:**
- urgent(긴급): 서버 장애, 보안 취약점, CEO/임원 직접 요청, 즉각 조치 필요, 마감 변경
- important(중요): 코드 리뷰 요청, 멘션(@태그), 회의 초대, PR 승인/댓글, 업무 할당, 예산 승인
- info(참고): 시스템 업데이트 공지, 위키 편집, 일반 채팅, 완료 알림, 워크샵/이벤트 안내

**중요 지침:**
- 반드시 유효한 JSON만 반환하세요. \`\`\`json 블록으로 감싸도 됩니다.
- reason은 한국어로 간결하게 작성하세요 (30자 이내)
- confidence는 0.0~1.0 사이 숫자

반환 JSON 형식:
[
  {
    "id": "알림 ID",
    "priority": "urgent" | "important" | "info",
    "reason": "판단 근거 (한국어)",
    "confidence": 0.0~1.0
  }
]`;

function parseClassificationResult(raw: string): ClassifiedNotification[] {
  const stripped = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed = JSON.parse(stripped);

  if (!Array.isArray(parsed)) {
    throw new Error('분류 결과가 배열 형식이 아닙니다.');
  }

  return parsed.map((item: unknown) => {
    const entry = item as Record<string, unknown>;
    const priority = entry.priority;
    const validPriority =
      priority === 'urgent' || priority === 'important' || priority === 'info'
        ? priority
        : 'info';

    return {
      id: String(entry.id ?? ''),
      priority: validPriority,
      reason: String(entry.reason ?? '분류 완료'),
      confidence:
        typeof entry.confidence === 'number'
          ? Math.max(0, Math.min(1, entry.confidence))
          : 0.8,
    };
  });
}

function buildUserMessage(notifications: Notification[]): string {
  const formatted = notifications
    .map((n) => `ID: ${n.id}\n제목: ${n.title}\n내용: ${n.body}`)
    .join('\n\n---\n\n');

  return `총 ${notifications.length}개 알림을 분류해주세요:\n\n${formatted}`;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { notifications } = body as { notifications: Notification[] };

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return Response.json(
        { success: false, error: 'notifications 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    const userMessage = buildUserMessage(notifications);
    const rawResult = await callClaude(SYSTEM_PROMPT, userMessage);
    const classified = parseClassificationResult(rawResult);

    const response: ClassifyResponse = { success: true, data: classified };
    return Response.json(response);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

    return Response.json(
      { success: false, error: message } satisfies ClassifyResponse,
      { status: 500 }
    );
  }
}
