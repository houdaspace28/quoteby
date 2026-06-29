import type { Metadata } from "next";
import { Josefin_Sans } from "next/font/google";
import "./globals.css";

// next/font downloads Josefin Sans at build time and self-hosts it, so the
// browser never calls Google's servers (faster + private + no layout shift).
// Josefin Sans is a variable font, so we don't pass `weight` — every weight
// from Light (300) to Bold (700) is available. We expose it as a CSS variable
// (`--font-josefin`) that globals.css wires into Tailwind's `font-sans`.
const josefin = Josefin_Sans({
  subsets: ["latin"],
  variable: "--font-josefin",
});

export const metadata: Metadata = {
  title: "quote.by",
  description: "Find real, correctly-attributed quotes by any thinker.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${josefin.variable} antialiased`}>
      <body className="min-h-svh font-sans">{children}</body>
    </html>
  );
}
