import Script from "next/script"
import { Geist, Instrument_Serif } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { TelegramProvider } from "@/lib/telegram/telegram-context"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
})

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
        <main className={`${geist.variable} ${instrumentSerif.variable} font-sans min-h-screen bg-[var(--tg-bg-color,white)] text-[var(--tg-text-color,#000)]`}>
          {children}
        </main>
        <Toaster />
      </TelegramProvider>
    </>
  )
}
