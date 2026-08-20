'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateNotificationSettings } from '@/lib/actions/push';
import PushNotificationSetup from './PushNotificationSetup';

type Settings = {
  push_enabled: boolean;
  budget_alerts: boolean;
  budget_threshold_percent: number;
  subscription_reminders: boolean;
  ai_estimate_alerts: boolean;
  investment_reminders: boolean;
};

const TOGGLES: { key: keyof Settings; label: string; description: string }[] = [
  { key: 'budget_alerts', label: 'Alertas de presupuesto', description: 'Avisa cuando un presupuesto supera el umbral configurado' },
  { key: 'subscription_reminders', label: 'Recordatorio de cobros', description: 'Avisa el día antes de que se cobre una suscripción' },
  { key: 'ai_estimate_alerts', label: 'Estimación IA', description: 'Avisa si la predicción de gasto de una categoría va a superar su presupuesto' },
  { key: 'investment_reminders', label: 'Recordatorio de inversión', description: 'Avisa si llevas varios días sin registrar el valor de tus inversiones' },
];

export default function NotificationSettingsManager({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [isPending, startTransition] = useTransition();

  const persist = (partial: Partial<Settings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    startTransition(async () => {
      const result = await updateNotificationSettings(partial);
      if (result.error) toast.error('Error al guardar: ' + result.error);
    });
  };

  return (
    <div className="space-y-4">
      <PushNotificationSetup initiallyEnabled={settings.push_enabled} />

      <div className={`space-y-2 transition-opacity ${settings.push_enabled ? '' : 'opacity-40 pointer-events-none'}`}>
        {TOGGLES.map(t => (
          <div key={t.key} className="bg-white border border-neutral-100 rounded-xl p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-900">{t.label}</p>
              <p className="text-xs text-neutral-400">{t.description}</p>
            </div>
            <button
              onClick={() => persist({ [t.key]: !settings[t.key] } as Partial<Settings>)}
              disabled={isPending}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${settings[t.key] ? 'bg-neutral-900' : 'bg-neutral-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[t.key] ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        ))}

        {settings.budget_alerts && (
          <div className="bg-white border border-neutral-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-neutral-900">Umbral de aviso</p>
              <span className="text-sm font-bold text-neutral-900 font-mono">{settings.budget_threshold_percent}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={settings.budget_threshold_percent}
              onChange={(e) => persist({ budget_threshold_percent: Number(e.target.value) })}
              className="w-full accent-neutral-900"
            />
            <p className="text-xs text-neutral-400 mt-1">Se avisa cuando el gasto de una categoría llega a este % de su presupuesto</p>
          </div>
        )}
      </div>
    </div>
  );
}
