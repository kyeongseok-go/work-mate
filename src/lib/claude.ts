/**
 * Claude API wrapper using fetch directly for Edge Runtime compatibility.
 * Do NOT use @anthropic-ai/sdk — it is not compatible with Edge.
 *
 * The Anthropic API returns transient failures (notably 529 overloaded_error,
 * plus 429/5xx) under load. Those are retryable, so this wrapper retries with
 * exponential backoff and only ever surfaces a clean, user-facing message —
 * never the raw error JSON. All six AI routes call through here, so the
 * resilience applies everywhere.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

const MAX_ATTEMPTS = 3; // 1 initial try + 2 retries
const BASE_DELAY_MS = 600;
const MAX_DELAY_MS = 10_000;
const TRANSIENT_STATUSES: ReadonlySet<number> = new Set([
  408, 409, 425, 429, 500, 502, 503, 504, 529,
]);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Backoff: honor a server `retry-after` (seconds) when present, else expo + jitter. */
function backoffDelay(attempt: number, retryAfter: string | null): number {
  const ra = retryAfter ? Number(retryAfter) : NaN;
  if (Number.isFinite(ra) && ra > 0) {
    return Math.min(ra * 1000, MAX_DELAY_MS);
  }
  const expo = BASE_DELAY_MS * 2 ** (attempt - 1);
  const jitter = Math.random() * BASE_DELAY_MS;
  return Math.min(expo + jitter, MAX_DELAY_MS);
}

/** Map an HTTP status to a clean Korean message — raw error JSON never reaches the UI. */
function friendlyError(status: number): Error {
  if (status === 429 || status >= 500) {
    return new Error('AI 서버가 일시적으로 혼잡합니다. 잠시 후 다시 시도해주세요.');
  }
  if (status === 401 || status === 403) {
    return new Error('AI 인증에 실패했습니다. API 키 설정을 확인해주세요.');
  }
  if (status === 400) {
    return new Error('AI 요청이 올바르지 않습니다.');
  }
  return new Error(`AI 호출에 실패했습니다 (${status}).`);
}

export async function callClaude(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.');
  }

  const requestInit: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      // 메시지가 많은 방은 출력이 길어진다. 2048은 잘림(truncation) → "Unterminated
      // string in JSON" 의 직접 원인이었다. 잘림을 줄이고, 그래도 잘리면
      // parseLenientJson 이 부분 복구한다.
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  };

  let lastError: Error = new Error('AI 호출에 실패했습니다.');

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(ANTHROPIC_API_URL, requestInit);
    } catch {
      // Network/connection failure — transient, retry if attempts remain.
      lastError = new Error(
        'AI 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.'
      );
      if (attempt < MAX_ATTEMPTS) {
        await sleep(backoffDelay(attempt, null));
        continue;
      }
      throw lastError;
    }

    if (response.ok) {
      const data = await response.json();
      const content = data?.content?.[0];
      if (!content || content.type !== 'text') {
        throw new Error('Claude API에서 예상치 못한 응답 형식이 반환됐습니다.');
      }
      return content.text as string;
    }

    // Drain the body so the connection can be reused; content is intentionally
    // not surfaced to the user.
    await response.text().catch(() => '');

    if (TRANSIENT_STATUSES.has(response.status) && attempt < MAX_ATTEMPTS) {
      lastError = friendlyError(response.status);
      await sleep(backoffDelay(attempt, response.headers.get('retry-after')));
      continue;
    }

    throw friendlyError(response.status);
  }

  throw lastError;
}
