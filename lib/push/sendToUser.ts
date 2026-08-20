import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:noreply@fintek.app';

let configured = false;
function ensureConfigured() {
  if (configured || !vapidPublicKey || !vapidPrivateKey) return;
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  configured = true;
}

type PushPayload = { title: string; body: string; url?: string; tag?: string };

/**
 * Uso desde los cron jobs (admin client, sin sesión de usuario).
 * Envía un push a todas las suscripciones de un usuario y limpia las que hayan expirado.
 */
export async function sendPushToUser(adminClient: SupabaseClient, userId: string, payload: PushPayload) {
  if (!vapidPublicKey || !vapidPrivateKey) return;
  ensureConfigured();

  const { data: subs } = await adminClient.from('push_subscriptions').select('*').eq('user_id', userId);
  if (!subs || subs.length === 0) return;

  const body = JSON.stringify(payload);

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body
      );
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await adminClient.from('push_subscriptions').delete().eq('id', sub.id);
      }
    }
  }
}
