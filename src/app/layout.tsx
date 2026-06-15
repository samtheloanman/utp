import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SmoothScroll } from "@/components/ui/SmoothScroll";

export const metadata: Metadata = {
  title: "UTP — Universal Transaction Protocol",
  description: "Decentralized governance, event voting, BTC-backed stablecoin, world news, and global legislature tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <SmoothScroll>
            {children}
          </SmoothScroll>
        </Providers>
      </body>
    </html>
  );
}
