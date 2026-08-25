import Pusher from "pusher";
import {
  getPusherUserNotificationsChannel,
  PUSHER_NOTIFICATION_CREATED_EVENT,
} from "@/lib/pusher-channels-shared";
import type { NotificationItem } from "@/lib/notifications";

let pusherServer: Pusher | null = null;

function getPusherServer() {
  const appId = process.env.PUSHER_APP_ID?.trim();
  const key = process.env.PUSHER_KEY?.trim();
  const secret = process.env.PUSHER_SECRET?.trim();
  const cluster = process.env.PUSHER_CLUSTER?.trim();

  if (!appId || !key || !secret || !cluster) {
    return null;
  }

  pusherServer ??= new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });

  return pusherServer;
}

export function authorizePusherNotificationsChannel(
  socketId: string,
  channelName: string,
) {
  const server = getPusherServer();

  if (!server) {
    throw new Error("Pusher Channels no está configurado.");
  }

  return server.authorizeChannel(socketId, channelName);
}

export async function publishNotificationToPusherChannel(
  userSub: string,
  notification: NotificationItem,
) {
  const server = getPusherServer();
  const channel = getPusherUserNotificationsChannel(userSub);

  if (!server) {
    return { skipped: true, reason: "missing-config" };
  }

  if (!channel) {
    return { skipped: true, reason: "invalid-channel" };
  }

  await server.trigger(channel, PUSHER_NOTIFICATION_CREATED_EVENT, {
    notification,
  });

  return { skipped: false };
}
