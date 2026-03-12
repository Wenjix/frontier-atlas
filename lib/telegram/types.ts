export interface TelegramUser {
  id: number | string
  is_bot?: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

export interface TelegramInitData {
  user: TelegramUser
  auth_date: number
  hash: string
  query_id?: string
  start_param?: string
}

/**
 * Window augmentation for Telegram Web App SDK.
 * Only available inside a Telegram Mini App webview.
 */
export interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: TelegramUser
    auth_date?: number
    hash?: string
    query_id?: string
    start_param?: string
  }
  version: string
  platform: string
  colorScheme: "light" | "dark"
  themeParams: Record<string, string>
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  ready: () => void
  expand: () => void
  close: () => void
  requestWriteAccess: (callback?: (granted: boolean) => void) => void
  BackButton: {
    isVisible: boolean
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
  }
  MainButton: {
    text: string
    color: string
    textColor: string
    isVisible: boolean
    isActive: boolean
    isProgressVisible: boolean
    setText: (text: string) => void
    show: () => void
    hide: () => void
    enable: () => void
    disable: () => void
    showProgress: (leaveActive?: boolean) => void
    hideProgress: () => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
  }
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}
