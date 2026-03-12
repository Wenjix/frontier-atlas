/**
 * Parses a Telegram Mini App `startapp` parameter into an internal route.
 *
 * Convention (matches the routing table in the Telegram integration plan):
 *   - Underscore `_` separates path segments
 *   - Floor identifiers use the Floor model's `number` field (e.g. "9", "B")
 *     and are prefixed with "floor-" in the resulting route
 *
 * | startapp value       | Route                              |
 * |----------------------|------------------------------------|
 * | (empty/none)         | null (caller decides default)      |
 * | onboarding           | /tg/onboarding                     |
 * | onboarding_floor9    | /tg/onboarding?floor=floor-9       |
 * | floor_9              | /tg/floors/floor-9                 |
 * | floor_9_people       | /tg/floors/floor-9/people          |
 */
export function parseStartParam(startParam: string): string | null {
  if (!startParam) return null

  if (startParam === "onboarding") {
    return "/tg/onboarding"
  }

  const onboardingMatch = startParam.match(/^onboarding_floor(.+)$/)
  if (onboardingMatch) {
    return `/tg/onboarding?floor=floor-${onboardingMatch[1]}`
  }

  // floor_X_people must be checked before floor_X (more specific first)
  const floorPeopleMatch = startParam.match(/^floor_(.+)_people$/)
  if (floorPeopleMatch) {
    return `/tg/floors/floor-${floorPeopleMatch[1]}/people`
  }

  const floorMatch = startParam.match(/^floor_(.+)$/)
  if (floorMatch) {
    return `/tg/floors/floor-${floorMatch[1]}`
  }

  return null
}
