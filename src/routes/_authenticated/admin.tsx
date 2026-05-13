import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Database, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { seedDemoData } from "@/lib/seed-demo";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administração — NEXUS OS" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSeed() {
    setLoading(true);
    setResult(null);
    try {
      const r = await seedDemoData();
      setResult(r);
      if (r.success) toast.success(r.message);
      else toast.error(r.message);
    } catch (e: any) {
      const msg = e?.message ?? "Erro inesperado.";
      setResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="h-12 border-b border-border px-4 flex items-center">
        <h1 className="font-display font-semibold">Administração</h1>
      </header>

      <div className="p-6 max-w-2xl">
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="size-9 rounded-md bg-primary/10 grid place-items-center text-primary">
              <Database className="size-4" />
            </div>
            <div>
              <h2 className="font-display font-semibold">Dados de demonstração</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Popula o sistema com empresas, leads, contratos, reuniões, tarefas e financeiro
                de demonstração para testar todas as funcionalidades.
              </p>
            </div>
          </div>

          <div className="rounded-md border border-border/60 bg-background/50 px-3 py-2 text-xs text-muted-foreground mb-4">
            Se já existirem empresas cadastradas, o seed não será executado.
          </div>

          <button
            onClick={handleSeed}
            disabled={loading}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 disabled:opacity-60"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Carregando dados…" : "Carregar dados de demonstração"}
          </button>

          {result && (
            <div
              className={`mt-4 flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                result.success
                  ? "border-green-500/30 bg-green-500/10 text-green-500"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
              )}
              <span>{result.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}