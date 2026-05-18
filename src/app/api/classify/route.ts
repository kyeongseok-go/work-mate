export const runtime = 'edge';

import { callClaude } from '@/lib/claude';
import { type Notification } from '@/data/notifications';
import {
  type Severity,
  toSeverity,
  clampUrgency,
  legacyFromSeverity,
} from '@/lib/severity';

export type RecommendedAction = 'reply_now' | 'schedule' | 'delegate' | 'ignore';

const VALID_ACTIONS: ReadonlySet<string> = new Set<RecommendedAction>([
  'reply_now',
  'schedule',
  'delegate',
  'ignore',
]);

export interface ClassifiedNotification {
  id: string;
  priority: 'urgent' | 'important' | 'info'; // 하위호환 (severity 에서 도출 — 기존 그룹핑 UI 유지)
  severity: Severity; // P0~P3 공유 모델
  urgencyScore: number; // 0~10
  recommendedAction: RecommendedAction; // 추천 액션
  reason: string;
  confidence: number;
}

interface ClassifyResponse {
  success: boolean;
  data?: ClassifiedNotification[];
  error?: string;
}

const SYSTEM_PROMPT = `당신은 기업 메신저 알림을 분류하고 다음 행동까지 라우팅하는 AI입니다.
각 알림을 분석해 심각도·긴급도·추천 액션을 판단하고 아래 JSON 형식으로 반환하세요.

**심각도(severity) 기준:**
- P0: 서버 장애, 보안 사고, 임원 직접 요청, 즉각 조치 (긴급도 9~10)
- P1: 코드 리뷰·PR 승인, 멘션, 업무 할당, 예산 승인, 회의 초대 (긴급도 6~8)
- P2: 일정 공지, 일반 협의, 진행 공유 (긴급도 3~5)
- P3: 이벤트 안내, 완료 알림, 잡담, 위키 편집 (긴급도 0~2)

**추천 액션(recommendedAction):**
- reply_now: 지금 바로 답장/조치해야 함
- schedule: 일정을 잡아 처리 (회의·리뷰 등)
- delegate: 위임 검토가 적절 (담당 아님/분산 가능)
- ignore: 별도 조치 불필요 (참고·자동완료)

**중요 지침:**
- 반드시 유효한 JSON만 반환하세요. \`\`\`json 블록으로 감싸도 됩니다.
- reason은 한국어로 간결하게 (30자 이내)
- urgencyScore는 0~10 정수, confidence는 0.0~1.0

반환 JSON 형식:
[
  {
    "id": "알림 ID",
    "severity": "P0" | "P1" | "P2" | "P3",
    "urgencyScore": 0~10,
    "recommendedAction": "reply_now" | "schedule" | "delegate" | "ignore",
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
    const severity = toSeverity(entry.severity);
    const recommendedAction: RecommendedAction =
      typeof entry.recommendedAction === 'string' &&
      VALID_ACTIONS.has(entry.recommendedAction)
        ? (entry.recommendedAction as RecommendedAction)
        : 'reply_now';

    return {
      id: String(entry.id ?? ''),
      priority: legacyFromSeverity(severity), // 기존 그룹핑 UI 호환 — severity 에서 일관 도출
      severity,
      urgencyScore: clampUrgency(entry.urgencyScore),
      recommendedAction,
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
