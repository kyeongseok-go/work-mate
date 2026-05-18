/**
 * Claude API wrapper using fetch directly for Edge Runtime compatibility.
 * Do NOT use @anthropic-ai/sdk — it is not compatible with Edge.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-3-5-haiku-20241022';

export async function callClaude(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.');
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(
      `Claude API 오류 (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  const content = data?.content?.[0];
  if (!content || content.type !== 'text') {
    throw new Error('Claude API에서 예상치 못한 응답 형식이 반환됐습니다.');
  }

  return content.text as string;
}
