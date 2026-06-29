import type { Metadata } from "next";
import {
  IM_Fell_English,
  Playfair_Display,
  Special_Elite,
} from "next/font/google";

import "./globals.css";

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});

const typewriter = Special_Elite({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-typewriter",
});

const serif = IM_Fell_English({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: {
    default: "Murder Board — Serialized Mysteries & Thrillers",
    template: "%s — Murder Board",
  },
  description:
    "Murder Board publishes serialized mysteries and thrillers for readers who can't stop at one chapter. Each episode ends on the board — clues, suspects, red string. Pull the thread.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${typewriter.variable} ${serif.variable}`}
      >
        {children}
      </body>
    </html>
  );
}