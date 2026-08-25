type Claims = Record<string, unknown>;

export type SessionLike = {
  user?: Claims;
  tokenSet?: {
    idToken?: string;
  };
};

function decodeJwtPayload(token: string): Claims | null {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );

    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Claims;
  } catch {
    return null;
  }
}

export function getNtgRolesFromClaims(claims: Claims | null | undefined) {
  if (!claims) {
    return [];
  }

  const roles = new Set<string>();
  const addRole = (role: unknown) => {
    if (typeof role !== "string") {
      return;
    }

    const trimmedRole = role.trim();
    if (trimmedRole) {
      roles.add(trimmedRole);
    }
  };

  [
    claims["https://nationalgt.com/roles"],
    claims["https://ntg.com/roles"],
    claims["https://claims.nationalgt.com/roles"],
    claims["https://api.ntg-rrhh/roles"],
  ].forEach((claim) => {
    if (Array.isArray(claim)) {
      claim.forEach(addRole);
    } else {
      addRole(claim);
    }
  });

  [
    claims["https://nationalgt.com/role"],
    claims["https://ntg.com/role"],
    claims["https://claims.nationalgt.com/role"],
    claims["https://api.ntg-rrhh/role"],
  ].forEach(addRole);

  return [...roles];
}

export function getNtgSessionClaims(session: SessionLike | null | undefined) {
  const userClaims = session?.user ?? {};
  const tokenClaims = session?.tokenSet?.idToken
    ? decodeJwtPayload(session.tokenSet.idToken)
    : null;

  return {
    ...userClaims,
    ...tokenClaims,
  };
}

export function isNtgAdmin(session: SessionLike | null | undefined) {
  const claims = getNtgSessionClaims(session);
  const roles = getNtgRolesFromClaims(claims);

  return (
    roles.some((role) =>
      ["admin", "root"].includes(role.trim().toLowerCase()),
    ) ||
    claims["https://nationalgt.com/is_admin"] === true ||
    claims["https://nationalgt.com/can_manage"] === true
  );
}

export function isNtgRoot(session: SessionLike | null | undefined) {
  const roles = getNtgRolesFromClaims(getNtgSessionClaims(session));

  return roles.some((role) => role.toLowerCase() === "root");
}

export function isNtgAgentSuper(session: SessionLike | null | undefined) {
  const roles = getNtgRolesFromClaims(getNtgSessionClaims(session));

  return roles.some((role) => role.toLowerCase() === "agent_super");
}

export function isNtgAgent(session: SessionLike | null | undefined) {
  const roles = getNtgRolesFromClaims(getNtgSessionClaims(session));

  return roles.some((role) => role.toLowerCase() === "agent");
}

export function isNtgSupervisor(session: SessionLike | null | undefined) {
  const roles = getNtgRolesFromClaims(getNtgSessionClaims(session));

  return roles.some((role) => role.toLowerCase() === "supervisor");
}

/** Encargada(o) de RRHH: aprueba el segundo paso de vacaciones y Fam Trip. */
export function isNtgRrhh(session: SessionLike | null | undefined) {
  const roles = getNtgRolesFromClaims(getNtgSessionClaims(session));

  return roles.some((role) => role.toLowerCase() === "rrhh");
}

export function isNtgMarketing(session: SessionLike | null | undefined) {
  const roles = getNtgRolesFromClaims(getNtgSessionClaims(session));

  return roles.some((role) => role.toLowerCase() === "mkt");
}

export function isNtgConta(session: SessionLike | null | undefined) {
  const roles = getNtgRolesFromClaims(getNtgSessionClaims(session));

  return roles.some((role) => role.toLowerCase() === "conta");
}

export function canApproveProducts(session: SessionLike | null | undefined) {
  return isNtgAdmin(session) || isNtgSupervisor(session);
}

export function canManageTarifario(session: SessionLike | null | undefined) {
  const roles = getNtgRolesFromClaims(getNtgSessionClaims(session));

  return (
    isNtgAdmin(session) ||
    roles.some((role) =>
      ["admin_tp", "tp"].includes(role.trim().toLowerCase()),
    )
  );
}

export function canCreateTarifario(session: SessionLike | null | undefined) {
  const roles = getNtgRolesFromClaims(getNtgSessionClaims(session));

  return (
    isNtgAdmin(session) ||
    roles.some((role) =>
      ["admin_tp", "tp"].includes(role.trim().toLowerCase()),
    )
  );
}

export function canDeleteTarifario(session: SessionLike | null | undefined) {
  const roles = getNtgRolesFromClaims(getNtgSessionClaims(session));

  return (
    isNtgAdmin(session) ||
    roles.some((role) =>
      ["admin_tp"].includes(role.trim().toLowerCase()),
    )
  );
}

export function canViewArchivedProducts(
  session: SessionLike | null | undefined,
) {
  return canArchiveProducts(session);
}

export function canArchiveProducts(session: SessionLike | null | undefined) {
  return isNtgAdmin(session) || isNtgSupervisor(session);
}

export function canViewArchivedTarifario(
  session: SessionLike | null | undefined,
) {
  const roles = getNtgRolesFromClaims(getNtgSessionClaims(session));

  return (
    isNtgAdmin(session) ||
    roles.some((role) =>
      ["admin_tp"].includes(role.trim().toLowerCase()),
    )
  );
}

export function canArchiveTarifario(session: SessionLike | null | undefined) {
  const roles = getNtgRolesFromClaims(getNtgSessionClaims(session));

  return (
    isNtgAdmin(session) ||
    roles.some((role) =>
      ["admin_tp", "tp"].includes(role.trim().toLowerCase()),
    )
  );
}

export function canViewProductApprovalQueue(
  session: SessionLike | null | undefined,
) {
  return !isNtgAgent(session) && !isNtgAgentSuper(session);
}

export function getCurrentUserSub(session: SessionLike | null | undefined) {
  const claims = getNtgSessionClaims(session);
  const sub = claims.sub;

  return typeof sub === "string" && sub.trim() ? sub : null;
}

export function getNtgBranchId(session: SessionLike | null | undefined) {
  const claims = getNtgSessionClaims(session);
  const branchId = claims["https://api.ntg-rrhh/branch_id"];

  return typeof branchId === "string" && branchId.trim()
    ? branchId.trim()
    : null;
}
