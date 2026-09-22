import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "WriteBox — Offline-First Notes",
  description:
    "A modern, offline-first note-taking application with optional Google Drive synchronization. Write, organize, and sync your notes — no account required.",
  keywords: ["notes", "note-taking", "offline", "google drive", "sync", "markdown"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
