"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { setTelegramToken } from "./telegram-api-client"
import type { TelegramWebApp } from "./types"

interface TelegramUser {
  telegramUserId: string
  userId: string | null
  memberId: string | null
  telegramJoinStatus: string
}

interface TelegramContextValue {
  webApp: TelegramWebApp | null
  token: string | null
  user: TelegramUser | null
  startParam: string | null
  isLinked: boolean
  memberId: string | null
  isLoading: boolean
  error: string | null
  refreshUser: () => Promise<void>
}

const TelegramContext = createContext<TelegramContextValue>({
  webApp: null,
  token: null,
  user: null,
  startParam: null,
  isLinked: false,
  memberId: null,
  isLoading: true,
  error: null,
  refreshUser: async () => {},
})

export function useTelegram() {
  return useContext(TelegramContext)
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<TelegramUser | null>(null)
  const [startParam, setStartParam] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshUser = useCallback(async () => {
    // Re-verify initData to get fresh user state
    const tg = window.Telegram?.WebApp
    if (!tg?.initData) return

    try {
      const res = await fetch("/api/telegram/auth/verify-init-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: tg.initData }),
      })
      const json = await res.json()
      if (json.success) {
        setToken(json.data.token)
        setTelegramToken(json.data.token)
        setUser(json.data.user)
      }
    } catch {
      // Keep existing state on refresh failure
    }
  }, [])

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) {
      setIsLoading(false)
      setError("Not running inside Telegram")
      return
    }

    setWebApp(tg)
    tg.ready()
    tg.expand()

    // Apply Telegram theme
    if (tg.themeParams.bg_color) {
      document.documentElement.style.setProperty("--tg-bg-color", tg.themeParams.bg_color)
    }
    if (tg.themeParams.text_color) {
      document.documentElement.style.setProperty("--tg-text-color", tg.themeParams.text_color)
    }

    const initData = tg.initData
    if (!initData) {
      setIsLoading(false)
      setError("No initData available")
      return
    }

    // Read start_param from initDataUnsafe (available before verification)
    if (tg.initDataUnsafe?.start_param) {
      setStartParam(tg.initDataUnsafe.start_param)
    }

    // Verify with backend
    fetch("/api/telegram/auth/verify-init-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setToken(json.data.token)
          setTelegramToken(json.data.token)
          setUser(json.data.user)
          if (json.data.startParam) {
            setStartParam(json.data.startParam)
          }
        } else {
          setError(json.error?.message ?? "Auth failed")
        }
      })
      .catch(() => {
        setError("Failed to verify Telegram session")
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  return (
    <TelegramContext.Provider
      value={{
        webApp,
        token,
        user,
        startParam,
        isLinked: !!user?.userId,
        memberId: user?.memberId ?? null,
        isLoading,
        error,
        refreshUser,
      }}
    >
      {children}
    </TelegramContext.Provider>
  )
}
