'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FeatureConfig {
  key: string;
  nameKo: string;
  nameEn: string;
  description: string;
  phase: 1 | 2;
  icon: string;
}

export const FEATURE_CONFIGS: FeatureConfig[] = [
  {
    key: 'smartCatchup',
    nameKo: 'AI 메시지 요약',
    nameEn: 'Smart Catch-up',
    description: '놓친 채팅을 AI가 핵심만 요약해드립니다. 긴 대화도 30초 만에 파악하세요.',
    phase: 1,
    icon: '📋',
  },
  {
    key: 'notificationAI',
    nameKo: '알림 우선순위 분류',
    nameEn: 'Notification AI',
    description: 'AI가 알림 중요도를 자동으로 판단해 긴급·중요·참고로 분류합니다.',
    phase: 1,
    icon: '🔔',
  },
  {
    key: 'meetingNotes',
    nameKo: '회의록 자동 생성',
    nameEn: 'Meeting Notes',
    description: '채팅 대화를 분석해 결정사항, 액션 아이템, 담당자를 자동으로 추출합니다.',
    phase: 1,
    icon: '📝',
  },
  {
    key: 'smartReply',
    nameKo: '답변 초안 생성',
    nameEn: 'Smart Reply',
    description: '메시지 맥락을 파악해 적절한 답변 초안을 3가지 제안합니다.',
    phase: 2,
    icon: '💬',
  },
  {
    key: 'semanticSearch',
    nameKo: '의미 기반 검색',
    nameEn: 'Semantic Search',
    description: '키워드가 아닌 의미로 검색. "지난 주 마이그레이션 결정사항"도 찾아드립니다.',
    phase: 2,
    icon: '🔍',
  },
  {
    key: 'priorityLearning',
    nameKo: '우선순위 학습',
    nameEn: 'Priority Learning',
    description: '사용 패턴을 학습해 나에게 중요한 메시지를 더 정확하게 구분합니다.',
    phase: 2,
    icon: '🧠',
  },
  {
    key: 'workLifeMode',
    nameKo: '워크-라이프 모드',
    nameEn: 'Work-Life Mode',
    description: '업무 시간 외 알림을 스마트하게 필터링. 진짜 긴급한 것만 전달합니다.',
    phase: 2,
    icon: '⚖️',
  },
];

export interface FeatureToggleState {
  features: {
    smartCatchup: boolean;
    notificationAI: boolean;
    meetingNotes: boolean;
    smartReply: boolean;
    semanticSearch: boolean;
    priorityLearning: boolean;
    workLifeMode: boolean;
  };
  toggleFeature: (key: keyof FeatureToggleState['features']) => void;
  getActiveCount: () => number;
}

export const useFeatureStore = create<FeatureToggleState>()(
  persist(
    (set, get) => ({
      features: {
        smartCatchup: false,
        notificationAI: false,
        meetingNotes: false,
        smartReply: false,
        semanticSearch: false,
        priorityLearning: false,
        workLifeMode: false,
      },
      toggleFeature: (key) =>
        set((state) => ({
          features: {
            ...state.features,
            [key]: !state.features[key],
          },
        })),
      getActiveCount: () => {
        const { features } = get();
        return Object.values(features).filter(Boolean).length;
      },
    }),
    {
      name: 'workmate-ai-features',
    }
  )
);
