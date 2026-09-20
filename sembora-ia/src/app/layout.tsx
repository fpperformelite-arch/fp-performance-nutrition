import type { Metadata } from "next";
import "./globals.css";

const title = "SEMBORA IA";
const description =
  "Bora, tu asistente de WhatsApp con IA — responde clientes, captura leads y agenda citas 24/7.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "https://sembora-maestro.vercel.app"),
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    locale: "es_MX",
    siteName: "SEMBORA IA",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-white text-ink antialiased">{children}</body>
    </html>
  );
}
