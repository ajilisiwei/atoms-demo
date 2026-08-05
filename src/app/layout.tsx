import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {
  AppearanceProvider,
  APPEARANCE_INIT_SCRIPT,
} from "@/components/appearance/AppearanceProvider";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_INIT_SCRIPT }} />
        <AppearanceProvider>{children}</AppearanceProvider>
      </body>
    </html>
  );
}
