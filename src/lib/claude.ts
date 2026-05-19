/**
 * Claude API wrapper using fetch directly for Edge Runtime compatibility.
 * Do NOT use @anthropic-ai/sdk — it is not compatible with Edge.
 *
 * Resilience model:
 *  - Transient failures (429 / 5xx / 529 overloaded) are retried with
 *    exponential backoff.
 *  - The model is env-overridable and falls back to a verified-good model.
 *    Diagnosis (2026-05): `claude-haiku-4-5(-20251001)` returns a *persistent*
 *    529 overloaded for this account/key — even a 1-token ping — so it is not
 *    usable here and retrying never helps. `claude-sonnet-4-5` returns 200 for
 *    the same key, so it is the safe default/anchor.
 *  - Raw Anthropic error JSON is never surfaced to the UI.
 *
 * All six AI routes call through here, so this applies everywhere.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Override per environment without a code change (e.g. point back to a cheaper
// model once it is healthy for this key). Default is a model verified to work.
const PRIMARY_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-5';
// Verified-good anchor; tried if the primary is unavailable/overloaded.
const FALLBACK_MODEL = 'claude-sonnet-4-5';
const MODELS: readonly string[] =
  PRIMARY_MODEL === FALLBACK_MODEL
    ? [PRIMARY_MODEL]
    : [PRIMARY_MODEL, FALLBACK_MODEL];

const MAX_ATTEMPTS = 3; // per model: 1 initial try + 2 retries
const BASE_DELAY_MS = 600;
const MAX_DELAY_MS = 10_000;
const TRANSIENT_STATUSES: ReadonlySet<number> = new Set([
  408, 409, 425, 429, 500, 502, 503, 504, 529,
]);

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

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

function buildRequestInit(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string
): RequestInit {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      // 메시지가 많은 방은 출력이 길어진다. 2048은 잘림(truncation) → "Unterminated
      // string in JSON" 의 직접 원인이었다. 잘림을 줄이고, 그래도 잘리면
      // parseLenientJson 이 부분 복구한다.
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  };
}

export async function callClaude(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.');
  }

  let lastError: Error = new Error('AI 호출에 실패했습니다.');

  for (let mi = 0; mi < MODELS.length; mi++) {
    const requestInit = buildRequestInit(
      apiKey,
      MODELS[mi],
      systemPrompt,
      userMessage
    );

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let response: Response;
      try {
        response = await fetch(ANTHROPIC_API_URL, requestInit);
      } catch {
        // Network/connection failure — transient.
        lastError = new Error(
          'AI 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.'
        );
        if (attempt < MAX_ATTEMPTS) {
          await sleep(backoffDelay(attempt, null));
          continue;
        }
        break; // exhausted attempts → try next model
      }

      if (response.ok) {
        const data = await response.json();
        const content = data?.content?.[0];
        if (!content || content.type !== 'text') {
          throw new Error('Claude API에서 예상치 못한 응답 형식이 반환됐습니다.');
        }
        return content.text as string;
      }

      // Drain the body for connection reuse; content is not surfaced.
      await response.text().catch(() => '');
      const status = response.status;

      // Auth / malformed request: no other model or retry will help.
      if (status === 400 || status === 401 || status === 403) {
        throw friendlyError(status);
      }

      // Model unavailable for this key: skip straight to the next model.
      if (status === 404) {
        lastError = friendlyError(status);
        break;
      }

      // Transient (429 / 5xx / 529): retry, then fall through to next model.
      if (TRANSIENT_STATUSES.has(status) && attempt < MAX_ATTEMPTS) {
        lastError = friendlyError(status);
        await sleep(backoffDelay(attempt, response.headers.get('retry-after')));
        continue;
      }

      lastError = friendlyError(status);
      break; // attempts exhausted for this model → try next model
    }
  }

  throw lastError;
}
