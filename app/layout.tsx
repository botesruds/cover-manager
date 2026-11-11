import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cover Manager",
  description: "Track who has covered, and who is next, on the cover rota.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
