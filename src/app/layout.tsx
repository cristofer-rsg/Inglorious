import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./ghost-hunt-base.css";
import "./ghost-hunt-home.css";
import "./ghost-hunt-gold.css";
import "./ghost-hunt-readable.css";
import "./ghost-hunt-rules.css";
import "./ghost-hunt-tenure.css";
import "./ghost-hunt-parity.css";
import AnalyticsTracker from "@/components/analytics-tracker";
import BottomNavigation from "@/components/bottom-navigation";

export const metadata: Metadata = {
  title: { default: "Inglorious | Central do Clã", template: "%s | Inglorious" },
  description: "Ranking, pontuação e desempenho dos jogadores do clã Inglorious.",
  applicationName: "Inglorious",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#090d0b",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <AnalyticsTracker />
        {children}
        <BottomNavigation />
      </body>
    </html>
  );
}
