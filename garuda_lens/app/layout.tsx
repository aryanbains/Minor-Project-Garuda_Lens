import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const garudaSans = Space_Grotesk({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const garudaMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Garuda Lens",
    template: "%s | Garuda Lens",
  },
  description:
    "Protected satellite change detection workspace with NDVI overlays, timeline playback, PDF reports, saved history, and admin controls.",
  applicationName: "Garuda Lens",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${garudaSans.variable} ${garudaMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
