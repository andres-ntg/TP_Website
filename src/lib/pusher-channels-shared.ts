export const PUSHER_NOTIFICATION_CREATED_EVENT = "notification-created";

export function getPusherUserNotificationsChannel(userSub: string) {
  const normalized = userSub
    .trim()
    .replace(/[^a-zA-Z0-9_=@,.;-]/g, "-")
    .slice(0, 120);

  return normalized ? `private-user-notifications-${normalized}` : null;
}
