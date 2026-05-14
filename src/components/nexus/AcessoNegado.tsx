import { ShieldOff } from "lucide-react";

export function AcessoNegado({ mensagem }: { mensagem?: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full rounded-lg border border-border bg-surface p-8 text-center">
        <div className="mx-auto size-12 rounded-full bg-muted grid place-items-center text-muted-foreground mb-4">
          <ShieldOff className="size-5" />
        </div>
        <h2 className="font-display font-semibold text-base mb-1">Acesso restrito</h2>
        <p className="text-sm text-muted-foreground">
          {mensagem ?? "Você não tem permissão para acessar este módulo."}
        </p>
      </div>
    </div>
  );
}