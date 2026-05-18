'use client';

import { Settings, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useFeatureStore, FEATURE_CONFIGS } from '@/store/featureStore';
import { WorkLifeSettings } from '@/components/settings/WorkLifeSettings';
import { BRAND } from '@/config/brand';

export default function SettingsPage() {
  const { features, toggleFeature, getActiveCount } = useFeatureStore();
  const activeCount = getActiveCount();

  const phase1 = FEATURE_CONFIGS.filter(c => c.phase === 1);
  const phase2 = FEATURE_CONFIGS.filter(c => c.phase === 2);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Settings size={20} className="text-gray-700" />
          <h1 className="text-xl font-bold text-gray-900">설정</h1>
        </div>
        <p className="text-sm text-gray-500">AI 기능을 켜고 끌 수 있습니다</p>
      </div>

      {/* Summary Card */}
      <div
        className="mb-8 rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ backgroundColor: 'var(--brand-primary)' }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={18} />
            <span className="font-semibold">{BRAND.appName}</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {activeCount}
            <span className="text-lg font-normal text-red-200"> / 7</span>
          </div>
          <p className="text-red-100 text-sm">
            {activeCount === 0
              ? 'AI 기능이 모두 비활성화 상태입니다'
              : `${activeCount}개의 AI 기능이 활성화됐습니다`}
          </p>
        </div>
        {/* Background decoration */}
        <div
          className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10"
          style={{ backgroundColor: 'white' }}
        />
        <div
          className="absolute -right-2 -bottom-12 w-40 h-40 rounded-full opacity-10"
          style={{ backgroundColor: 'white' }}
        />
      </div>

      {/* Phase 1 Features */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-semibold text-gray-800">Phase 1</h2>
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 border-green-200"
          >
            출시됨
          </Badge>
        </div>

        <div className="space-y-3">
          {phase1.map((cfg) => {
            const isOn = features[cfg.key as keyof typeof features];

            return (
              <div
                key={cfg.key}
                className="flex items-start gap-4 p-4 rounded-xl bg-white border transition-all duration-200"
                style={{
                  borderColor: isOn ? 'rgba(29, 78, 216, 0.2)' : '#e5e7eb',
                  boxShadow: isOn ? '0 0 0 1px rgba(29, 78, 216, 0.1)' : 'none',
                }}
              >
                <div className="text-2xl flex-shrink-0 mt-0.5">{cfg.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-gray-900">{cfg.nameKo}</span>
                    <span className="text-[10px] text-gray-400">{cfg.nameEn}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{cfg.description}</p>
                  {isOn && (
                    <div
                      className="inline-flex items-center gap-1 mt-2 text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                      style={{ backgroundColor: 'rgba(37, 99, 235, 0.08)', color: 'var(--brand-primary)' }}
                    >
                      <span className="w-1 h-1 rounded-full bg-current" />
                      활성화됨
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 mt-0.5">
                  <Switch
                    checked={isOn}
                    onCheckedChange={() =>
                      toggleFeature(cfg.key as keyof typeof features)
                    }
                    style={isOn ? { backgroundColor: 'var(--brand-primary)' } : {}}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Phase 2 Features */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-semibold text-gray-800">Phase 2</h2>
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 border-blue-200"
          >
            출시됨
          </Badge>
        </div>

        <div className="space-y-3">
          {phase2.map((cfg) => {
            const isOn = features[cfg.key as keyof typeof features];
            const isWorkLife = cfg.key === 'workLifeMode';

            return (
              <div key={cfg.key}>
                <div
                  className="flex items-start gap-4 p-4 rounded-xl bg-white border transition-all duration-200"
                  style={{
                    borderColor: isOn ? 'rgba(29, 78, 216, 0.2)' : '#e5e7eb',
                    boxShadow: isOn ? '0 0 0 1px rgba(29, 78, 216, 0.1)' : 'none',
                  }}
                >
                  <div className="text-2xl flex-shrink-0 mt-0.5">{cfg.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm text-gray-900">{cfg.nameKo}</span>
                      <span className="text-[10px] text-gray-400">{cfg.nameEn}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{cfg.description}</p>
                    {isOn && (
                      <div
                        className="inline-flex items-center gap-1 mt-2 text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                        style={{ backgroundColor: 'rgba(37, 99, 235, 0.08)', color: 'var(--brand-primary)' }}
                      >
                        <span className="w-1 h-1 rounded-full bg-current" />
                        활성화됨
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 mt-0.5">
                    <Switch
                      checked={isOn}
                      onCheckedChange={() =>
                        toggleFeature(cfg.key as keyof typeof features)
                      }
                      style={isOn ? { backgroundColor: 'var(--brand-primary)' } : {}}
                    />
                  </div>
                </div>

                {/* WorkLife expanded settings panel */}
                {isWorkLife && isOn && <WorkLifeSettings />}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer Note */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="font-medium text-gray-700">{BRAND.appName}</span>은 그룹웨어 메신저에
          AI 기능을 통합하는 컨셉 데모입니다. 7개 기능 모두 Claude API로 동작합니다.
          설정은 브라우저에 저장됩니다.
        </p>
      </div>
    </div>
  );
}
