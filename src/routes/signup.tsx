import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Criar conta — NEXUS OS" }] }),
  component: SignupPage,
});

function SignupPage() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: name },
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada. Entrando…");
    nav({ to: "/" });
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight">NEXUS OS</h1>
          <p className="mt-2 text-sm text-muted-foreground">Crie sua conta de empresário</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            required placeholder="Seu nome" value={name}
            onChange={e => setName(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-surface border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="email" required placeholder="email@exemplo.com" value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-surface border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="password" required minLength={6} placeholder="Senha (mín. 6)" value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-surface border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit" disabled={loading}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >{loading ? "Criando…" : "Criar conta"}</button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Já tem conta? <Link to="/login" className="text-foreground hover:text-primary">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
