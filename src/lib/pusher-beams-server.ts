import { getPusherBeamsUserInterest } from "@/lib/pusher-beams-shared";

type PushNotificationPayload = {
  title: string;
  message: string;
  link?: string | null;
};

const DEFAULT_BEAMS_INSTANCE_ID = "42f8ceb3-6193-4e43-ab66-54771d2f5c7f";

function getDeepLink(link?: string | null) {
  const value = link?.trim() || "/";

  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}${url.hash}` || "/";
  } catch {
    return value.startsWith("/") ? value : `/${value}`;
  }
}

export async function publishNotificationToBeamsInterest(
  interest: string,
  notification: PushNotificationPayload,
) {
  const instanceId =
    process.env.PUSHER_BEAMS_INSTANCE_ID?.trim() || DEFAULT_BEAMS_INSTANCE_ID;
  const secretKey = process.env.PUSHER_BEAMS_SECRET_KEY?.trim();

  if (!secretKey) {
    return { skipped: true, reason: "missing-secret-key" };
  }

  const response = await fetch(
    `https://${instanceId}.pushnotifications.pusher.com/publish_api/v1/instances/${instanceId}/publishes/interests`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        interests: [interest],
        web: {
          notification: {
            title: notification.title,
            body: notification.message,
            deep_link: getDeepLink(notification.link),
          },
        },
      }),
    },
  );

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `Pusher Beams publish failed with ${response.status}: ${body}`,
    );
  }

  return {
    skipped: false,
    response: body ? JSON.parse(body) : null,
  };
}

export async function publishNotificationToBeamsUser(
  userSub: string,
  notification: PushNotificationPayload,
) {
  const interest = getPusherBeamsUserInterest(userSub);

  if (!interest) {
    return { skipped: true, reason: "invalid-user-interest" };
  }

  return publishNotificationToBeamsInterest(interest, notification);
}
