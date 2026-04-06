import webpush from "web-push";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

function getWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;

  if (!publicKey || !privateKey || !email) {
    return null;
  }

  try {
    webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
    return webpush;
  } catch {
    return null;
  }
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const wp = getWebPush();
  if (!wp) return;

  const admin = createSupabaseAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("user_id", userId);

  if (!subs?.length) return;

  const message = JSON.stringify(payload);
  const expired: string[] = [];

  await Promise.allSettled(
    subs.map(async (row) => {
      try {
        await wp.sendNotification(row.subscription, message);
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) expired.push(row.id);
      }
    })
  );

  if (expired.length) {
    await admin.from("push_subscriptions").delete().in("id", expired);
  }
}

export async function sendPushToAll(payload: PushPayload) {
  const wp = getWebPush();
  if (!wp) return;

  const admin = createSupabaseAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, subscription");

  if (!subs?.length) return;

  const message = JSON.stringify(payload);
  const expired: string[] = [];

  await Promise.allSettled(
    subs.map(async (row) => {
      try {
        await wp.sendNotification(row.subscription, message);
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) expired.push(row.id);
      }
    })
  );

  if (expired.length) {
    await admin.from("push_subscriptions").delete().in("id", expired);
  }
}
