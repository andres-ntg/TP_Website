export function getPusherBeamsUserInterest(userSub: string) {
  const normalized = userSub
    .trim()
    .replace(/[^a-zA-Z0-9_=@,.;-]/g, "-")
    .slice(0, 120);

  return normalized ? `user-${normalized}` : null;
}
