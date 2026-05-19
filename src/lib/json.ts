/**
 * Lenient JSON extraction for LLM responses.
 *
 * Models occasionally wrap JSON in ```json fences, or get cut off at the
 * output-token limit and return a truncated, unparseable string (which
 * surfaces as "Unterminated string in JSON at position ..."). This module
 * extracts the JSON object and, when the response was truncated, repairs it
 * by trimming back to the last structurally-safe point and closing any open
 * containers — so callers get a usable (possibly partial) object instead of
 * a hard crash.
 */

export interface LenientParseResult<T> {
  value: T;
  /** true when the input was malformed/truncated and had to be repaired. */
  recovered: boolean;
}

function stripFences(raw: string): string {
  return raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

/**
 * Trim a (possibly truncated) JSON string back to the last point at which
 * the document can still be closed validly, then append the missing
 * closers. The only positions guaranteed safe — without a full parse — are
 * right after an opening/closing bracket or just before a comma, because at
 * each of those the preceding tokens form a complete value or pair.
 */
function repairTruncatedJson(json: string): string {
  let inString = false;
  let escaped = false;
  let safeEnd = 0;

  for (let i = 0; i < json.length; i++) {
    const c = json[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }

    if (c === '"') {
      inString = true;
    } else if (c === '{' || c === '[') {
      safeEnd = i + 1; // empty container is completable
    } else if (c === '}' || c === ']') {
      safeEnd = i + 1; // container just completed
    } else if (c === ',') {
      safeEnd = i; // cut before the comma → keep the previous element
    }
  }

  const prefix = json.slice(0, safeEnd).replace(/[,\s]+$/, '');

  // Recompute open containers for the trimmed prefix and close them in order.
  const closers: string[] = [];
  let s = false;
  let e = false;
  for (let i = 0; i < prefix.length; i++) {
    const c = prefix[i];
    if (s) {
      if (e) e = false;
      else if (c === '\\') e = true;
      else if (c === '"') s = false;
      continue;
    }
    if (c === '"') s = true;
    else if (c === '{') closers.push('}');
    else if (c === '[') closers.push(']');
    else if (c === '}' || c === ']') closers.pop();
  }

  let result = prefix;
  while (closers.length > 0) result += closers.pop();
  return result;
}

/**
 * Parse JSON from an LLM response, tolerating code fences and truncation.
 * Never throws on a truncated body — degrades to a partial (or empty)
 * object with `recovered: true`. Throws only when no JSON object is present.
 */
export function parseLenientJson<T = unknown>(
  raw: string
): LenientParseResult<T> {
  const cleaned = stripFences(raw);

  // Root can be an object or a top-level array — start at whichever appears
  // first so array-rooted responses (e.g. notification classification) parse.
  const objIdx = cleaned.indexOf('{');
  const arrIdx = cleaned.indexOf('[');
  const start =
    objIdx === -1
      ? arrIdx
      : arrIdx === -1
        ? objIdx
        : Math.min(objIdx, arrIdx);
  if (start === -1) {
    throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');
  }
  const json = cleaned.slice(start);
  // Type-aware empty value so an array caller never receives an object.
  const emptyRoot = (cleaned[start] === '[' ? [] : {}) as T;

  // Fast path: well-formed response.
  try {
    return { value: JSON.parse(json) as T, recovered: false };
  } catch {
    // Truncated or malformed — fall through to structural repair.
  }

  try {
    return { value: JSON.parse(repairTruncatedJson(json)) as T, recovered: true };
  } catch {
    // Last resort so callers can degrade gracefully instead of 500-ing.
    return { value: emptyRoot, recovered: true };
  }
}
