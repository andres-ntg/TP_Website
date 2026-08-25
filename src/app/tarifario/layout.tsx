"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { TarifarioHeader } from "@/components/TarifarioHeader";
import { TarifarioFooter } from "@/components/TarifarioFooter";

export default function TarifarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser({ route: "/api/auth/me" });

  return (
    <>
      {user ? <TarifarioHeader /> : null}
      {children}
      {user ? <TarifarioFooter /> : null}
    </>
  );
}
