import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SEMBORA IA",
  description: "Asistente de WhatsApp con IA para negocios de citas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-white text-ink antialiased">{children}</body>
    </html>
  );
}
