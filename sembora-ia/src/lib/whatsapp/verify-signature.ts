import crypto from "node:crypto";

// Verifica que un POST al webhook realmente venga de Meta, comparando el
// header `X-Hub-Signature-256` contra un HMAC-SHA256 del cuerpo crudo
// firmado con tu App Secret. Sin esto, cualquiera que adivine tu URL de
// webhook podría inyectar mensajes falsos (leads falsos, citas falsas,
// o intentar forzar a Bora a responder cosas fuera de guion).
//
// El cuerpo debe ser el texto CRUDO tal como llegó (antes de JSON.parse) —
// si se vuelve a serializar el JSON antes de firmar, la firma no coincide.
export function verifyWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");

  const receivedBuf = Buffer.from(signatureHeader);
  const expectedBuf = Buffer.from(expected);

  if (receivedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(receivedBuf, expectedBuf);
}
