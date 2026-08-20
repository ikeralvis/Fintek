'use server';

import webpush from 'web-push';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:noreply@fintek.app';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function subscribeToPush(subscription: PushSubscriptionJSON) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: 'endpoint' }
  );

  if (error) return { error: error.message };

  await supabase.from('notification_settings').upsert(
    { user_id: user.id, push_enabled: true },
    { onConflict: 'user_id' }
  );

  revalidatePath('/dashboard/configuracion');
  return { error: null };
}

export async function unsubscribeFromPush(endpoint: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint);

  const { count } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (!count) {
    await supabase.from('notification_settings').update({ push_enabled: false }).eq('user_id', user.id);
  }

  revalidatePath('/dashboard/configuracion');
  return { error: null };
}

export async function getNotificationSettings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { data } = await supabase.from('notification_settings').select('*').eq('user_id', user.id).maybeSingle();

  return {
    data: data || {
      user_id: user.id,
      push_enabled: false,
      budget_alerts: true,
      budget_threshold_percent: 90,
      subscription_reminders: true,
      ai_estimate_alerts: true,
      investment_reminders: false,
    },
  };
}

export async function updateNotificationSettings(partial: Partial<{
  budget_alerts: boolean;
  budget_threshold_percent: number;
  subscription_reminders: boolean;
  ai_estimate_alerts: boolean;
  investment_reminders: boolean;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { error } = await supabase.from('notification_settings').upsert(
    { user_id: user.id, ...partial },
    { onConflict: 'user_id' }
  );

  revalidatePath('/dashboard/configuracion');
  return { error: error?.message || null };
}

export async function sendTestPush() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', user.id);
  if (!subs || subs.length === 0) return { error: 'No hay suscripciones activas en este dispositivo' };

  const payload = JSON.stringify({
    title: 'Fintek',
    body: 'Notificaciones activadas correctamente ✅',
    url: '/dashboard/configuracion',
  });

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent++;
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
      }
    }
  }

  return sent > 0 ? { error: null } : { error: 'No se pudo enviar la notificación de prueba' };
}
