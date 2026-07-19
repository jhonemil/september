import type { Metadata } from "next";
import { Playfair_Display, Raleway } from "next/font/google";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600"],
});

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Memory Album",
  description: "A special dynamic space filled with sweet memories, photos and layouts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfairDisplay.variable} ${raleway.variable}`}>
      <body style={{ fontFamily: 'var(--font-raleway), sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
