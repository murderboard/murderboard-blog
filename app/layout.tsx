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
  title: "Murder Board",
  description:
    "A static, markdown-driven Next.js landing page for serialized crime and mystery stories.",
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