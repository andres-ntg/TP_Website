import { getItineraryBuilderDb } from "@/lib/mongodb";
import { getNtgRolesFromClaims, getNtgSessionClaims } from "@/lib/auth-roles";

type SessionLike = Parameters<typeof getNtgSessionClaims>[0];

export type AppUserDocument = {
  _id: string;
  sub: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
  roles: string[];
  role_keys: string[];
  last_seen_at: Date;
  updated_at: Date;
  created_at: Date;
};

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeRoleKey(role: string) {
  return role.trim().toLowerCase();
}

export async function ensureAppUserIndexes() {
  const db = await getItineraryBuilderDb();
  await Promise.all([
    db.collection<AppUserDocument>("AppUsers").createIndex({ sub: 1 }),
    db.collection<AppUserDocument>("AppUsers").createIndex({ role_keys: 1 }),
  ]);
}

export async function upsertAppUserFromSession(session: SessionLike) {
  const claims = getNtgSessionClaims(session);
  const sub = getString(claims.sub);

  if (!sub) {
    return null;
  }

  const roles = getNtgRolesFromClaims(claims);
  const roleKeys = [...new Set(roles.map(normalizeRoleKey).filter(Boolean))];
  const now = new Date();
  const db = await getItineraryBuilderDb();

  await ensureAppUserIndexes();

  await db.collection<AppUserDocument>("AppUsers").updateOne(
    { _id: sub },
    {
      $set: {
        sub,
        email: getString(claims.email),
        name: getString(claims.name) || getString(claims.nickname),
        picture: getString(claims.picture),
        roles,
        role_keys: roleKeys,
        last_seen_at: now,
        updated_at: now,
      },
      $setOnInsert: {
        created_at: now,
      },
    },
    { upsert: true },
  );

  return { sub, roles, roleKeys };
}

export async function getUsersByAnyRole(roleKeys: string[]) {
  const normalizedRoleKeys = [
    ...new Set(roleKeys.map(normalizeRoleKey).filter(Boolean)),
  ];

  if (normalizedRoleKeys.length === 0) {
    return [];
  }

  await ensureAppUserIndexes();

  const db = await getItineraryBuilderDb();
  return db
    .collection<AppUserDocument>("AppUsers")
    .find({ role_keys: { $in: normalizedRoleKeys } })
    .project<AppUserDocument>({
      _id: 1,
      sub: 1,
      email: 1,
      name: 1,
      picture: 1,
      roles: 1,
      role_keys: 1,
      last_seen_at: 1,
      updated_at: 1,
      created_at: 1,
    })
    .toArray();
}

export async function getUsersWithoutAnyRole(roleKeys: string[]) {
  const normalizedRoleKeys = [
    ...new Set(roleKeys.map(normalizeRoleKey).filter(Boolean)),
  ];

  if (normalizedRoleKeys.length === 0) {
    return [];
  }

  await ensureAppUserIndexes();

  const db = await getItineraryBuilderDb();
  return db
    .collection<AppUserDocument>("AppUsers")
    .find({ role_keys: { $nin: normalizedRoleKeys } })
    .project<AppUserDocument>({
      _id: 1,
      sub: 1,
      email: 1,
      name: 1,
      picture: 1,
      roles: 1,
      role_keys: 1,
      last_seen_at: 1,
      updated_at: 1,
      created_at: 1,
    })
    .toArray();
}

export async function getAllAppUsers() {
  await ensureAppUserIndexes();

  const db = await getItineraryBuilderDb();
  return db
    .collection<AppUserDocument>("AppUsers")
    .find({})
    .project<AppUserDocument>({
      _id: 1,
      sub: 1,
      email: 1,
      name: 1,
      picture: 1,
      roles: 1,
      role_keys: 1,
      last_seen_at: 1,
      updated_at: 1,
      created_at: 1,
    })
    .sort({ name: 1, email: 1, last_seen_at: -1 })
    .toArray();
}

export async function getAppUserBySub(userSub: string) {
  const sub = getString(userSub);
  if (!sub) {
    return null;
  }

  await ensureAppUserIndexes();

  const db = await getItineraryBuilderDb();
  return db.collection<AppUserDocument>("AppUsers").findOne({ _id: sub });
}
