# Workmate AI Lab

> 그룹웨어 메신저에 적용 가능한 7가지 AI 기능을, 토글 ON/OFF 비교로 즉시 체험하는 단일 웹앱 데모.

## 컨셉

협업 그룹웨어의 메신저에는 하루 수백 개의 메시지·알림이 쌓이지만, 중요 정보 필터링은 대부분 수동입니다. 요약·분류·검색·회의록처럼 **AI로 해결 가능한 반복 업무가 메신저 안에 집중**되어 있습니다.

Workmate AI Lab은 그 위에 AI를 더했을 때 만들어지는 가치를 검증하는 컨셉 프로토타입입니다. 모든 AI 기능에 **ON/OFF 토글**이 있어, OFF에서는 "기존 메신저 경험 그대로", ON에서는 "AI 활성화" 상태를 같은 화면에서 직접 비교할 수 있습니다. 토글 상태는 `localStorage`로 영속화됩니다.

## 7가지 AI 기능

| # | 기능 | 설명 | 영역 |
|---|------|------|------|
| 1 | **AI 메시지 요약** | 자리 비운 사이 쌓인 메시지를 핵심만 요약 | Smart Catch-up |
| 2 | **알림 우선순위 분류** | 시스템·결재·멘션 알림을 긴급/중요/참고로 자동 분류 | Notification AI |
| 3 | **회의록 자동 생성** | 단체 채팅 대화 → 결정사항·액션아이템·담당자 구조화 | Meeting Notes |
| 4 | **답변 초안 제안** | 맥락 기반 3가지 톤(공식/친근/간결) 답변 초안 | Smart Reply |
| 5 | **의미 기반 검색** | 키워드가 아닌 의미로 메시지 검색 | Semantic Search |
| 6 | **우선순위 학습** | 읽기 패턴 학습으로 개인화 알림 큐레이션 | Priority Learning |
| 7 | **워크-라이프 모드** | 근무 시간 외 자동 무음 + 자동 응답 + 발신 경고 | Work-Life Mode |

## 화이트라벨 — 회사별 커스터마이즈

이 데모는 특정 벤더에 종속되지 않습니다. **기능은 그대로 두고, 디자인과 아이덴티티만 회사별로 교체**할 수 있도록 커스텀 지점을 두 곳으로 한정했습니다.

| 커스텀 대상 | 파일 | 바꾸는 것 |
|-------------|------|-----------|
| **디자인 톤** | [src/app/globals.css](src/app/globals.css) | `--brand-primary` / `--sidebar-*` 색상 토큰 |
| **아이덴티티** | [src/config/brand.ts](src/config/brand.ts) | 앱명·로고·슬로건·메타·고지 문구 |
| **기능 구성** | [src/store/featureStore.ts](src/store/featureStore.ts) | `FEATURE_CONFIGS`에서 AI 기능 유지/추가/제외 |

색상 변수 1개와 `brand.ts` 상수만 바꾸면 다른 메신저/오피스 환경에 맞춘 데모로 즉시 재구성됩니다. 컴포넌트 로직과 API는 건드리지 않습니다.

## 기술 스택

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui (CSS 변수 기반 토큰)
- **AI**: Anthropic Claude API (claude-3-5-haiku) — 5개 Edge API Route
- **State**: Zustand (persist middleware)
- **Deploy**: Cloudflare Pages

## 시작하기

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.local.example .env.local
# .env.local에 ANTHROPIC_API_KEY 입력

# 개발 서버 시작
npm run dev
```

http://localhost:3000 에서 확인.

## 프로젝트 구조

```
src/
├── app/
│   ├── api/           # 5개 Edge API Routes
│   │   ├── summarize/      # 기능1: 메시지 요약
│   │   ├── classify/       # 기능2: 알림 분류
│   │   ├── meeting-notes/  # 기능3: 회의록
│   │   ├── reply-draft/    # 기능4: 답변 초안
│   │   └── search/         # 기능5: 의미 검색
│   ├── chat/[id]/     # 채팅방
│   ├── notifications/ # 알림 페이지
│   ├── search/        # 검색 페이지
│   └── settings/      # 설정 + 토글
├── components/
│   ├── chat/          # SmartCatchup, MeetingNotesModal, ReplyDraft, PriorityDashboard
│   ├── layout/        # Sidebar, MobileSidebar
│   └── settings/      # WorkLifeSettings
├── config/
│   └── brand.ts       # 회사별 아이덴티티 (화이트라벨)
├── data/              # Mock 데이터 (채팅방·메시지·알림)
└── store/             # Zustand stores (feature, meeting, priority, workLife)
```

## 만든 사람

고경석 — 오피스 SW 엔진 + AI 협업 서비스 개발

## Disclaimer

특정 그룹웨어 제품과 무관한 컨셉 프로토타입이며, 데모 목적으로만 동작합니다. 실제 사내 시스템 연동은 포함되지 않습니다.
