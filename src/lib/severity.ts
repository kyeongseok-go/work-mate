/**
 * 공유 심각도 모델 — P0~P3 단일 소스.
 *
 * 알림 라우팅(F3) · Work-Life 통과(F4) · 데일리 브리핑(F2)이 모두 이 모델을
 * 소비한다. 심각도 정의가 기능별로 갈라지지 않도록 여기 한 곳에서만 정의한다.
 *
 * 기존 3단계(urgent/important/info) UI 와의 하위호환:
 *   legacyFromSeverity / severityFromLegacy 로 무손실 매핑하여
 *   기존 그룹핑 UI 재작성 없이 공존한다.
 */

export type Severity = 'P0' | 'P1' | 'P2' | 'P3';

export type LegacyPriority = 'urgent' | 'important' | 'info';

export interface SeverityMeta {
  /** 사용자 표시 라벨 */
  label: string;
  /** 이 레벨로 분류되는 긴급도 점수 하한 (0~10) */
  minScore: number;
  /** 기존 3단계 매핑 */
  legacy: LegacyPriority;
  /** UI 배지 색 (semantic — 브랜드 색과 독립) */
  color: string;
  /** 짧은 설명 */
  desc: string;
}

export const SEVERITY_ORDER: Severity[] = ['P0', 'P1', 'P2', 'P3'];

export const SEVERITY_META: Record<Severity, SeverityMeta> = {
  P0: { label: 'P0 · 즉시', minScore: 9, legacy: 'urgent', color: '#dc2626', desc: '서버 장애·보안·임원 직접 요청 — 즉각 조치' },
  P1: { label: 'P1 · 중요', minScore: 6, legacy: 'important', color: '#ea580c', desc: '리뷰·승인·멘션·업무 할당 — 당일 처리' },
  P2: { label: 'P2 · 보통', minScore: 3, legacy: 'info', color: '#ca8a04', desc: '공지·일정·일반 협의 — 여유 있게' },
  P3: { label: 'P3 · 참고', minScore: 0, legacy: 'info', color: '#6b7280', desc: '이벤트·잡담·완료 알림 — 참고용' },
};

const VALID_SEVERITIES = new Set<string>(SEVERITY_ORDER);

/** 0~10 정수로 보정 (LLM 응답 방어) */
export function clampUrgency(n: unknown): number {
  const num = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(10, Math.round(num)));
}

/** enum 검증 + fallback 'P3' (LLM 응답 방어) */
export function toSeverity(v: unknown): Severity {
  return typeof v === 'string' && VALID_SEVERITIES.has(v) ? (v as Severity) : 'P3';
}

/** 긴급도 점수(0~10) → 심각도 */
export function severityFromScore(score: number): Severity {
  const s = clampUrgency(score);
  if (s >= SEVERITY_META.P0.minScore) return 'P0';
  if (s >= SEVERITY_META.P1.minScore) return 'P1';
  if (s >= SEVERITY_META.P2.minScore) return 'P2';
  return 'P3';
}

/** 기존 3단계 → 심각도 */
export function severityFromLegacy(p: LegacyPriority): Severity {
  if (p === 'urgent') return 'P0';
  if (p === 'important') return 'P1';
  return 'P2';
}

/** 심각도 → 기존 3단계 (기존 그룹핑 UI 호환) */
export function legacyFromSeverity(s: Severity): LegacyPriority {
  return SEVERITY_META[s].legacy;
}

/** a 가 b 와 같거나 더 긴급한가 (P0 가 가장 긴급) */
export function isAtLeastAsSevere(a: Severity, b: Severity): boolean {
  return SEVERITY_ORDER.indexOf(a) <= SEVERITY_ORDER.indexOf(b);
}
