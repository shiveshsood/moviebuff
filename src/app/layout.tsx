import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CineCanvas",
  description: "Infinite canvas for your movie taste",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
