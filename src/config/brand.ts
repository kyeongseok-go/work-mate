/**
 * 브랜드 아이덴티티 — 회사별 커스텀 레이어.
 *
 * 이 데모는 특정 벤더에 종속되지 않는 "그룹웨어 메신저 AI" 컨셉 프로토타입입니다.
 * 타깃 회사별로 바꾸는 것은 단 두 곳뿐입니다:
 *   1) 디자인 톤  → src/app/globals.css 의 --brand-primary / --sidebar-* 값
 *   2) 아이덴티티 → 이 파일의 문자열 상수
 *
 * 기능(AI 7종)은 src/store/featureStore.ts 의 FEATURE_CONFIGS 에서
 * 회사별로 유지/추가/제외할 수 있습니다. 이 파일은 기능에 관여하지 않습니다.
 */

export interface BrandConfig {
  /** 앱 정식 명칭 (헤더·설정·메타데이터) */
  appName: string;
  /** 로고 약어 (사이드바 정사각 로고) */
  appNameShort: string;
  /** 앱 명칭 하단 보조 라벨 */
  orgLabel: string;
  /** 한 줄 슬로건 */
  tagline: string;
  /** 브라우저 탭 타이틀 */
  metaTitle: string;
  /** 메타 설명 */
  metaDescription: string;
  /** 푸터 고지 문구 */
  disclaimer: string;
}

export const BRAND: BrandConfig = {
  appName: 'Workmate AI Lab',
  appNameShort: 'W',
  orgLabel: 'Groupware',
  tagline: '그룹웨어 메신저에 AI를 입히다',
  metaTitle: 'Workmate AI Lab — 그룹웨어 메신저 AI',
  metaDescription: '그룹웨어 메신저에 AI를 입히다. 7가지 AI 기능을 토글 ON/OFF로 비교 체험하는 데모.',
  disclaimer: 'Concept Prototype — Demo only',
};
