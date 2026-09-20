import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SEMBORA IA — Bora, tu asistente de WhatsApp con IA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1b4a5c",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: "#d07a68",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
            }}
          >
            💬
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: -1,
            }}
          >
            SEMBORA IA
          </div>
        </div>
        <div
          style={{
            fontSize: 36,
            color: "#e7ecee",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          Bora, tu asistente de WhatsApp con IA
        </div>
        <div
          style={{
            fontSize: 30,
            color: "#d07a68",
            textAlign: "center",
            marginTop: 12,
          }}
        >
          Responde clientes y agenda citas, 24/7
        </div>
      </div>
    ),
    { ...size }
  );
}
