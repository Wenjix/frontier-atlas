import crypto from "crypto"
import type { TelegramInitData, TelegramUser } from "./types"

const MAX_AUTH_AGE_SECONDS = 300

/**
 * Validates Telegram Mini App initData using HMAC-SHA-256 per
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Returns parsed data if valid, null otherwise.
 */
export function validateTelegramInitData(
  initDataString: string,
  botToken: string
): TelegramInitData | null {
  if (!initDataString || !botToken) return null

  const params = new URLSearchParams(initDataString)
  const hash = params.get("hash")
  if (!hash) return null

  // Build the data-check-string: sorted key=value pairs, excluding "hash"
  const entries: [string, string][] = []
  for (const [key, value] of params.entries()) {
    if (key !== "hash") {
      entries.push([key, value])
    }
  }
  entries.sort(([a], [b]) => a.localeCompare(b))
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n")

  // HMAC: secret_key = HMAC-SHA-256("WebAppData", bot_token)
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest()

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex")

  // Timing-safe comparison to prevent side-channel attacks
  const computedBuffer = Buffer.from(computedHash, "hex")
  const receivedBuffer = Buffer.from(hash, "hex")
  if (
    computedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(computedBuffer, receivedBuffer)
  ) {
    return null
  }

  // Check auth_date freshness
  const authDateStr = params.get("auth_date")
  if (!authDateStr) return null
  const authDate = parseInt(authDateStr, 10)
  if (isNaN(authDate)) return null

  const now = Math.floor(Date.now() / 1000)
  if (now - authDate > MAX_AUTH_AGE_SECONDS) return null

  // Parse user
  const userStr = params.get("user")
  if (!userStr) return null

  let user: TelegramUser
  try {
    user = JSON.parse(userStr)
  } catch {
    return null
  }

  if (!user.id || !user.first_name) return null

  return {
    user,
    auth_date: authDate,
    hash,
    query_id: params.get("query_id") ?? undefined,
    start_param: params.get("start_param") ?? undefined,
  }
}
