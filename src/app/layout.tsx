import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "WriteBox — Creative Workspace",
  description:
    "A modern, offline-first creative workspace for notes and drawings. Write, draw, organize, and sync — no account required.",
  keywords: ["notes", "drawing", "canvas", "offline", "google drive", "sync", "markdown", "sketch"],
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
