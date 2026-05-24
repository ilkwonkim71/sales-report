// In-memory token blacklist. Tokens are invalidated on logout.
// Note: this does not survive process restarts and is not shared across
// multiple instances. For production multi-instance deployments, replace
// with a Redis-backed store.
const blacklist = new Set<string>()

export function addToBlacklist(token: string): void {
  blacklist.add(token)
}

export function isBlacklisted(token: string): boolean {
  return blacklist.has(token)
}
