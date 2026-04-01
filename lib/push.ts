import webpush from "web-push";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
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
        await webpush.sendNotification(row.subscription, message);
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
        await webpush.sendNotification(row.subscription, message);
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
