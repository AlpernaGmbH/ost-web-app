import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="wordmark text-6xl">Pensum</h1>
      <p className="body-lg mb-8 mt-3 text-muted">Üben, bis es sitzt.</p>
      <LoginForm />
    </main>
  );
}
