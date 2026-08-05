import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import {
  AppearanceProvider,
  APPEARANCE_INIT_SCRIPT,
} from "@/components/appearance/AppearanceProvider";
import { LanguageProvider, type Locale } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atomlet — build apps by talking",
  description:
    "Describe the app you want. An AI agent plans it, writes it, and shows it running live — then publish it with one click.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Cookie name is spelled out here (instead of importing LOCALE_COOKIE) so
  // this Server Component never imports a value from the "use client" module.
  const store = await cookies();
  const locale: Locale = store.get("atomlet_locale")?.value === "zh" ? "zh" : "en";
  return (
    <html
      lang={locale === "zh" ? "zh-CN" : "en"}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_INIT_SCRIPT }} />
        <AppearanceProvider>
          <LanguageProvider initialLocale={locale}>{children}</LanguageProvider>
        </AppearanceProvider>
      </body>
    </html>
  );
}
