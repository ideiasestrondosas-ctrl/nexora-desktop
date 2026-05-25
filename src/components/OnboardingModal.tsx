import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open as dialogOpen } from '@tauri-apps/plugin-dialog';
import { useTranslation } from 'react-i18next';
import { CheckCircle, FolderOpen } from 'lucide-react';

const STORAGE_KEY = 'nexora_onboarding_complete';

interface Props {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [outputDir, setOutputDir] = useState('');
  const [telemetryEnabled, setTelemetryEnabled] = useState(false);
  const TOTAL_STEPS = 4;

  // Carregar output_dir actual como sugestão
  useEffect(() => {
    invoke<Record<string, string>>('get_settings')
      .then((s) => setOutputDir(s.output_dir ?? ''))
      .catch(() => {});
  }, []);

  const handleChooseFolder = async () => {
    const selected = await dialogOpen({ directory: true, multiple: false });
    if (!selected) return;
    const path = typeof selected === 'string' ? selected : selected[0];
    setOutputDir(path);
  };

  const handleComplete = async () => {
    // Guardar output_dir
    if (outputDir) {
      await invoke('update_settings', { key: 'output_dir', value: outputDir }).catch(() => {});
    }
    // Guardar preferência de telemetria
    await invoke('update_settings', {
      key: 'telemetry_enabled',
      value: telemetryEnabled ? 'true' : 'false',
    }).catch(() => {});
    // Marcar onboarding como concluído
    localStorage.setItem(STORAGE_KEY, '1');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-primary border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-brand transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Step indicator */}
          <p className="text-xs text-text-muted mb-6 text-center">
            {t('onboarding.stepOf', { current: step, total: TOTAL_STEPS })}
          </p>

          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-brand" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-3">
                {t('onboarding.step1Title')}
              </h2>
              <p className="text-sm text-text-muted leading-relaxed">{t('onboarding.step1Desc')}</p>
            </div>
          )}

          {/* Step 2: Output folder */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-text-primary mb-3">
                {t('onboarding.step2Title')}
              </h2>
              <p className="text-sm text-text-muted mb-4">{t('onboarding.step2Desc')}</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={outputDir}
                  readOnly
                  className="flex-1 px-3 py-2 rounded-lg bg-bg-secondary border border-border text-sm text-text-primary truncate"
                  placeholder="/path/to/output"
                />
                <button
                  onClick={handleChooseFolder}
                  className="px-3 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors flex items-center gap-1.5"
                >
                  <FolderOpen size={14} />
                  {t('onboarding.step2Choose')}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Privacy/Telemetry */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-text-primary mb-3">
                {t('onboarding.step3Title')}
              </h2>
              <p className="text-sm text-text-muted mb-6">{t('onboarding.step3Desc')}</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setTelemetryEnabled((v) => !v)}
                  className={`w-10 h-6 rounded-full transition-colors ${telemetryEnabled ? 'bg-brand' : 'bg-muted'} relative flex-shrink-0`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${telemetryEnabled ? 'translate-x-5' : 'translate-x-1'}`}
                  />
                </div>
                <span className="text-sm text-text-primary">{t('onboarding.step3Toggle')}</span>
              </label>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-3">
                {t('onboarding.step4Title')}
              </h2>
              <p className="text-sm text-text-muted leading-relaxed">{t('onboarding.step4Desc')}</p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2 rounded-lg text-sm text-text-muted hover:bg-muted transition-colors"
              >
                {t('onboarding.back')}
              </button>
            ) : (
              <div />
            )}
            {step < TOTAL_STEPS ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="px-5 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors"
              >
                {t('onboarding.next')}
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="px-5 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
              >
                {t('onboarding.start')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function useOnboarding() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setShow(true);
    }
  }, []);
  return { show, complete: () => setShow(false) };
}
