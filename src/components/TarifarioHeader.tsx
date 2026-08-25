"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import Image from "next/image";
import Link from "next/link";
import { IconBell, IconLogout } from "@tabler/icons-react";
import logoTp from "../../public/imgs/logo_white.png"

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function TarifarioHeader() {
  const { user } = useUser({ route: "/api/auth/me" });
  const displayName = (user?.name as string | undefined) ?? "Usuario";
  const picture = user?.picture as string | undefined;

  return (
    <header className="relative overflow-hidden bg-gradient-to-r from-violet-600 to-violet-500">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -bottom-16 h-52 w-52 rounded-full bg-white/10"
      />
      <div className="relative mx-auto flex w-full max-w-[1500px] items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Ir al inicio" className="shrink-0">
          <Image
            src={logoTp}
            alt="Travel Place"
            className="h-16 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-3">
    
          <div className="flex items-center gap-2">
            {picture ? (
              // eslint-disable-next-line @next/next/no-img-element -- avatar comes from Auth0/external providers not configured in next.config images
              <img
                src={picture}
                alt={displayName}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full border-2 border-white/70 object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/70 bg-violet-700 text-xs font-bold text-white">
                {getInitials(displayName)}
              </span>
            )}
            <span className="hidden text-sm font-semibold text-white sm:inline">
              {displayName}
            </span>
          </div>

          <a
            href="/auth/logout"
            aria-label="Cerrar sesión"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
          >
            <IconLogout className="h-5 w-5" />
          </a>
        </div>
      </div>
    </header>
  );
}
