import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-bold text-4xl text-petroleum">SEMBORA IA</h1>
      <p className="max-w-xl text-stone-600">
        La plataforma para que tu negocio agende citas por WhatsApp con Bora, tu
        asistente de IA.
      </p>
      <Link
        href="/login"
        className="rounded-full bg-petroleum px-6 py-3 font-medium text-white"
      >
        Entrar al panel
      </Link>
    </main>
  );
}
