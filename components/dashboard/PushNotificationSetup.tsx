'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { subscribeToPush, unsubscribeFromPush, sendTestPush } from '@/lib/actions/push';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function PushNotificationSetup({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      if (Notification.permission === 'denied') {
        toast.error('Bloqueaste las notificaciones para esta web. Actívalas desde los ajustes del navegador.');
        return;
      }
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('No se concedió permiso para notificaciones');
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        toast.error('Notificaciones no configuradas en el servidor');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const result = await subscribeToPush(subscription.toJSON() as any);
      if (result.error) throw new Error(result.error);

      setEnabled(true);
      toast.success('Notificaciones activadas');
    } catch (err: any) {
      console.error(err);
      toast.error('No se pudieron activar las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setEnabled(false);
      toast.success('Notificaciones desactivadas');
    } catch (err) {
      console.error(err);
      toast.error('Error al desactivar las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    try {
      const result = await sendTestPush();
      if (result.error) throw new Error(result.error);
      toast.success('Notificación de prueba enviada');
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar la prueba');
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 text-sm text-neutral-500">
        Tu navegador no soporta notificaciones push. Prueba desde Chrome, Edge o instalando la app en el móvil.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-white border border-neutral-100 rounded-xl p-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-400'}`}>
        {enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900">Notificaciones push</p>
        <p className="text-xs text-neutral-400">{enabled ? 'Activadas en este dispositivo' : 'Desactivadas en este dispositivo'}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {enabled && (
          <button onClick={handleTest} disabled={loading} className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors" title="Enviar prueba">
            <Send className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={enabled ? handleDisable : handleEnable}
          disabled={loading}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${enabled ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200' : 'bg-neutral-900 text-white hover:bg-neutral-800'}`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : enabled ? 'Desactivar' : 'Activar'}
        </button>
      </div>
    </div>
  );
}
