export const runtime = 'edge';

import { callClaude } from '@/lib/claude';
import { Message } from '@/data/messages';

export interface ReplyDrafts {
  official: string;   // 공식 톤 (존댓말, 격식)
  friendly: string;   // 친근 톤 (반말 또는 가벼운 존댓말)
  concise: string;    // 간결 톤 (10자 이내)
}

interface ReplyDraftRequest {
  receivedMessage: Message;
  conversationContext: Message[];
  userName: string;
  senderName?: string;
  senderRole?: string;
}

const SYSTEM_PROMPT = `당신은 기업 메신저에서 답변 초안을 작성해주는 AI 어시스턴트입니다.
주어진 메시지와 대화 맥락을 분석하여, 3가지 다른 톤의 답변 초안을 JSON 형식으로 생성해주세요.

**답변 생성 원칙:**
- 받은 메시지의 의도와 액션 아이템을 파악하여 적절히 반응
- 발신자의 직급/역할을 고려해 적절한 톤 유지
- 간결하고 실용적인 답변 작성

**톤 기준:**
- official (공식): 격식체 존댓말, 업무적으로 명확하고 정중한 표현
- friendly (친근): 가벼운 존댓말 또는 반말, 자연스럽고 친근한 표현
- concise (간결): 10자 이내로 핵심만 전달, 이모지 허용

반드시 아래 JSON 형식으로만 반환하세요. \`\`\`json 블록으로 감싸도 됩니다:
{
  "official": "공식 톤 답변",
  "friendly": "친근 톤 답변",
  "concise": "간결 톤 답변"
}`;

function buildUserMessage(req: ReplyDraftRequest): string {
  const context = req.conversationContext
    .map((m) => {
      const name = m.senderId === 'me' ? req.userName : (m.senderId);
      return `${name}: ${m.content}`;
    })
    .join('\n');

  const senderInfo = req.senderName
    ? `발신자: ${req.senderName}${req.senderRole ? ` (${req.senderRole})` : ''}`
    : '';

  return `${senderInfo ? senderInfo + '\n' : ''}답변해야 할 메시지: "${req.receivedMessage.content}"

최근 대화 맥락:
${context}

위 메시지에 대한 3가지 톤의 답변 초안을 생성해주세요.`;
}

function parseReplyDrafts(raw: string): ReplyDrafts {
  const stripped = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed = JSON.parse(stripped);

  return {
    official: typeof parsed.official === 'string' ? parsed.official : '확인했습니다.',
    friendly: typeof parsed.friendly === 'string' ? parsed.friendly : '확인했어요!',
    concise: typeof parsed.concise === 'string' ? parsed.concise : 'OK',
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ReplyDraftRequest;
    const { receivedMessage, conversationContext, userName } = body;

    if (!receivedMessage || !Array.isArray(conversationContext) || !userName) {
      return Response.json(
        { success: false, error: 'receivedMessage, conversationContext, userName 필드가 필요합니다.' },
        { status: 400 }
      );
    }

    const userMessage = buildUserMessage(body);
    const rawResult = await callClaude(SYSTEM_PROMPT, userMessage);
    const drafts = parseReplyDrafts(rawResult);

    return Response.json({ success: true, data: drafts });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
