import { ObjectId } from "mongodb";
import { getItineraryBuilderDb } from "@/lib/mongodb";
import { publishNotificationToBeamsUser } from "@/lib/pusher-beams-server";
import { publishNotificationToPusherChannel } from "@/lib/pusher-channels-server";

export type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "system";

export type NotificationDocument = {
  _id: ObjectId;
  user_sub: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null;
  metadata?: Record<string, unknown>;
  read_at?: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  link: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type CreateNotificationInput = {
  userSub: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string | null;
  metadata?: Record<string, unknown>;
};

const NOTIFICATION_TYPES = new Set<NotificationType>([
  "info",
  "success",
  "warning",
  "error",
  "system",
]);

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function normalizeNotificationType(value: unknown): NotificationType {
  return typeof value === "string" && NOTIFICATION_TYPES.has(value as NotificationType)
    ? (value as NotificationType)
    : "info";
}

export function serializeNotification(
  notification: NotificationDocument,
): NotificationItem {
  return {
    id: notification._id.toString(),
    title: notification.title,
    message: notification.message,
    type: notification.type,
    link: notification.link ?? null,
    metadata: notification.metadata ?? {},
    readAt: notification.read_at?.toISOString() ?? null,
    createdAt: notification.created_at.toISOString(),
  };
}

export async function ensureNotificationsIndexes() {
  const db = await getItineraryBuilderDb();
  await db
    .collection<NotificationDocument>("Notifications")
    .createIndex({ user_sub: 1, created_at: -1 });
}

export async function createNotification(input: CreateNotificationInput) {
  const userSub = cleanText(input.userSub, 164);
  const title = cleanText(input.title, 140);
  const message = cleanText(input.message, 600);

  if (!userSub) {
    throw new Error("Falta el usuario destino de la notificación.");
  }

  if (!title || !message) {
    throw new Error("La notificación requiere título y mensaje.");
  }

  const now = new Date();
  const db = await getItineraryBuilderDb();
  const document: Omit<NotificationDocument, "_id"> = {
    user_sub: userSub,
    title,
    message,
    type: normalizeNotificationType(input.type),
    link: cleanText(input.link, 500) || null,
    metadata: input.metadata ?? {},
    read_at: null,
    created_at: now,
    updated_at: now,
  };

  const result = await db
    .collection<Omit<NotificationDocument, "_id">>("Notifications")
    .insertOne(document);

  const notification = serializeNotification({ ...document, _id: result.insertedId });

  publishNotificationToBeamsUser(userSub, {
    title: notification.title,
    message: notification.message,
    link: notification.link,
  }).catch((error) => {
    console.error("[Notifications] No se pudo enviar Pusher Beams:", error);
  });

  publishNotificationToPusherChannel(userSub, notification).catch((error) => {
    console.error("[Notifications] No se pudo enviar Pusher Channels:", error);
  });

  return notification;
}

export function toNotificationObjectId(value: string): ObjectId | null {
  try {
    return new ObjectId(value);
  } catch {
    return null;
  }
}
