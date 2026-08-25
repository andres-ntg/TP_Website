import { getUsersWithoutAnyRole } from "@/lib/app-users";
import { createNotification } from "@/lib/notifications";

type TarifarioNotificationInput = {
  tarifarioId: string;
  title: string;
  destinations: string;
  dates: string;
  createdBySub?: string | null;
};

export async function notifyNonTpUsersOfNewTarifario(
  input: TarifarioNotificationInput,
) {
  const users = await getUsersWithoutAnyRole(["tp"]);
  const recipientSubs = [
    ...new Set(
      users
        .map((user) => user.sub)
        .filter((sub) => sub && sub !== input.createdBySub),
    ),
  ];
  const details = [input.destinations, input.dates].filter(Boolean).join(" - ");
  const message = details
    ? `Se agregó "${input.title}" en tarifario. ${details}.`
    : `Se agregó "${input.title}" en tarifario.`;

  const results = await Promise.allSettled(
    recipientSubs.map((userSub) =>
      createNotification({
        userSub,
        title: "Nuevo tarifario disponible",
        message,
        type: "info",
        link: "/tarifario",
        metadata: {
          source: "tarifario_created",
          tarifarioId: input.tarifarioId,
          createdBySub: input.createdBySub ?? null,
        },
      }),
    ),
  );

  const created = results.filter((result) => result.status === "fulfilled")
    .length;
  const failed = results.length - created;

  if (failed > 0) {
    console.error("[Tarifario notifications] Fallaron destinatarios", {
      tarifarioId: input.tarifarioId,
      failed,
    });
  }

  return {
    created,
    failed,
    recipients: recipientSubs.length,
  };
}
