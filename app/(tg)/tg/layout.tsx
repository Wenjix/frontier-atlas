import Script from "next/script"
import { Toaster } from "@/components/ui/sonner"
import { TelegramProvider } from "@/lib/telegram/telegram-context"

export const metadata = {
  title: "Frontier Atlas",
}

export default function TelegramLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <TelegramProvider>
        <main className="min-h-screen bg-[var(--tg-bg-color,white)] text-[var(--tg-text-color,#000)]">
          {children}
        </main>
        <Toaster />
      </TelegramProvider>
    </>
  )
}
