import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Lern-App</h1>
      <p className="mb-8 mt-1 text-sm text-muted">BSc Betriebsökonomie · OST</p>
      <LoginForm />
    </main>
  );
}
