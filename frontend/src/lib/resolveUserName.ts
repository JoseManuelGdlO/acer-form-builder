export function resolveUserName(
  userId: string | null | undefined,
  users: Array<{ id: string; name: string }>,
): string | null {
  if (!userId || !userId.trim()) return null;
  if (!Array.isArray(users) || users.length === 0) return null;
  const match = users.find((user) => user.id === userId);
  const name = match?.name?.trim();
  return name ? name : null;
}
