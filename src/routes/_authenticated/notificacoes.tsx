import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { ListSkeleton } from "@/components/nexus/ListSkeleton";
import { EmptyState } from "@/components/nexus/EmptyState";
import { relativeTime } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { Bell, CheckSquare, FileText, AlertTriangle, TrendingUp, CheckCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notificacoes")({ component: Notificacoes });

const TYPE_META: Record<string, { Icon: any; cls: string }> = {
  tarefa_vence:       { Icon: CheckSquare,    cls: "text-yellow-400 bg-yellow-500/10" },
  contrato_vence:     { Icon: FileText,       cls: "text-orange-400 bg-orange-500/10" },
  pagamento_atrasado: { Icon: AlertTriangle,  cls: "text-destructive bg-destructive/10" },
  lead_parado:        { Icon: TrendingUp,     cls: "text-muted-foreground bg-muted" },
};
const defaultMeta = { Icon: Bell, cls: "text-muted-foreground bg-muted" };

function Notificacoes() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"unread" | "all">("unread");

  const { data: empresas } = useQuery({
    queryKey: ["empresas-all-min"],
    queryFn: async () => (await supabase.from("empresas").select("id,nome,cor_identidade")).data ?? [],
  });
  const empresaMap = useMemo(
    () => Object.fromEntries((empresas ?? []).map((e: any) => [e.id, e])),
    [empresas]
  );

  const { data, isLoading } = useQuery({
    queryKey: ["notificacoes"],
    queryFn: async () => (
      await supabase.from("notificacoes").select("*").order("created_at", { ascending: false })
    ).data ?? [],
  });

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel(`notificacoes-${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "notificacoes", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notificacoes"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes"] }),
  });

  const markAll = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase.from("notificacoes")
        .update({ lida: true }).eq("user_id", user.id).eq("lida", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notificacoes"] });
      toast.success("Todas marcadas como lidas.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const items = useMemo(() => {
    const arr = data ?? [];
    return tab === "unread" ? arr.filter((n: any) => !n.lida) : arr;
  }, [data, tab]);

  const unreadCount = (data ?? []).filter((n: any) => !n.lida).length;

  function handleClick(n: any) {
    if (!n.lida) markRead.mutate(n.id);
    if (n.link_rota) navigate({ to: n.link_rota });
  }

  return (
    <>
      <Header title="Notificações" />
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-surface border border-border rounded-md p-1">
            <button onClick={() => setTab("unread")}
              className={`h-7 px-3 text-xs rounded ${tab === "unread" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              Não lidas {unreadCount > 0 && <span className="ml-1 text-[10px] text-primary">({unreadCount})</span>}
            </button>
            <button onClick={() => setTab("all")}
              className={`h-7 px-3 text-xs rounded ${tab === "all" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              Todas
            </button>
          </div>
          <button onClick={() => markAll.mutate()} disabled={unreadCount === 0 || markAll.isPending}
            className="h-8 px-3 rounded-md border border-border text-xs hover:bg-accent inline-flex items-center gap-1.5 disabled:opacity-50">
            <CheckCheck className="size-3.5" />Marcar todas como lidas
          </button>
        </div>

        {isLoading ? <ListSkeleton /> : items.length === 0 ? (
          <EmptyState icon={<Bell className="size-5" />}
            title={tab === "unread" ? "Tudo em dia" : "Sem notificações"}
            description={tab === "unread" ? "Você está com tudo em dia." : "Suas notificações aparecerão aqui."} />
        ) : (
          <div className="bg-surface border border-border rounded-lg divide-y divide-border overflow-hidden">
            {items.map((n: any) => {
              const meta = TYPE_META[n.tipo] ?? defaultMeta;
              const emp = n.empresa_id ? empresaMap[n.empresa_id] : null;
              return (
                <button key={n.id} onClick={() => handleClick(n)}
                  className={`w-full text-left flex items-start gap-3 p-3 hover:bg-accent/30 transition-colors ${!n.lida ? "bg-primary/5" : ""}`}>
                  <div className="relative shrink-0">
                    {!n.lida && <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 size-2 rounded-full bg-primary" />}
                    <div className={`size-9 rounded-md grid place-items-center ${meta.cls}`}>
                      <meta.Icon className="size-4" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm truncate ${!n.lida ? "font-semibold" : "font-medium text-muted-foreground"}`}>{n.titulo}</span>
                      {emp && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                          style={{ background: emp.cor_identidade + "22", color: emp.cor_identidade }}>
                          {emp.nome}
                        </span>
                      )}
                    </div>
                    {n.mensagem && <div className="text-xs text-muted-foreground line-clamp-2">{n.mensagem}</div>}
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono shrink-0 mt-0.5">{relativeTime(n.created_at)}</span>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
