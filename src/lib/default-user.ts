/**
 * The active user: the stored choice if that user still exists, otherwise the first user who owns a portfolio
 * (a profile without one has nothing to show), otherwise the first user. `portfolioOwners` is null when the owners
 * could not be read, which falls through to the first user rather than blocking the app.
 */
export function pickUserId(
  users: readonly { user_id: string }[],
  stored: string | null,
  portfolioOwners: ReadonlySet<string> | null,
): string | null {
  if (stored && users.some((u) => u.user_id === stored)) return stored
  const owner = portfolioOwners ? users.find((u) => portfolioOwners.has(u.user_id)) : undefined
  return (owner ?? users[0])?.user_id ?? null
}
