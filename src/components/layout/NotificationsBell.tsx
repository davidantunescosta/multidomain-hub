import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { relativeTime } from "@/lib/format";

export function NotificationsBell() {
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data } = useQuery({
    queryKey: ["notificacoes-list"],
    queryFn: async () => {
      const { data } = await supabase.from("notificacoes").select("*").order("created_at",{ascending:false}).limit(10);
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase.channel("notif-bell")
      .on("postgres_changes", { event: "*", schema: "public", table: "notificacoes" }, () => {
        qc.invalidateQueries({ queryKey: ["notificacoes-list"] });
        qc.invalidateQueries({ queryKey: ["notificacoes-unread"] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const unread = (data ?? []).filter(n => !n.lida).length;

  async function markRead(id: string, link?: string | null) {
    await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notificacoes-list"] });
    qc.invalidateQueries({ queryKey: ["notificacoes-unread"] });
    if (link) nav({ to: link as any });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative size-8 grid place-items-center rounded hover:bg-accent text-muted-foreground hover:text-foreground">
          <Bell className="size-4"/>
          {unread > 0 && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-destructive"/>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-surface border-border">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-xs font-medium">Notificações</span>
          {unread > 0 && <span className="text-[10px] font-mono text-muted-foreground">{unread} não lidas</span>}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {(data ?? []).length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">Sem notificações.</div>
          )}
          {data?.map(n => (
            <button key={n.id} onClick={() => markRead(n.id, n.link_rota)}
              className={`w-full text-left px-3 py-2 border-b border-border/50 hover:bg-accent/40 ${n.lida ? "opacity-60" : ""}`}>
              <div className="text-xs font-medium">{n.titulo}</div>
              {n.mensagem && <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.mensagem}</div>}
              <div className="text-[10px] font-mono text-muted-foreground mt-1">{relativeTime(n.created_at!)}</div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
