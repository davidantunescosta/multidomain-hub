const COLORS: Record<string, string> = {
  // pipeline estagio
  lead: "bg-zinc-500/15 text-zinc-300",
  qualificado: "bg-blue-500/15 text-blue-300",
  proposta: "bg-violet-500/15 text-violet-300",
  negociacao: "bg-amber-500/15 text-amber-300",
  ganho: "bg-success/15 text-success",
  perdido: "bg-destructive/15 text-destructive",
  // contrato status
  em_negociacao: "bg-amber-500/15 text-amber-300",
  ativo: "bg-success/15 text-success",
  pausado: "bg-zinc-500/15 text-zinc-300",
  encerrado: "bg-zinc-700/40 text-zinc-400",
  cancelado: "bg-destructive/15 text-destructive",
  // tarefa
  aberta: "bg-zinc-500/15 text-zinc-300",
  em_andamento: "bg-blue-500/15 text-blue-300",
  bloqueada: "bg-destructive/15 text-destructive",
  concluida: "bg-success/15 text-success",
  // financeiro
  pendente: "bg-amber-500/15 text-amber-300",
  pago: "bg-success/15 text-success",
  atrasado: "bg-destructive/15 text-destructive",
  // empresa
  ativa: "bg-success/15 text-success",
  pausada: "bg-amber-500/15 text-amber-300",
  encerrada: "bg-zinc-700/40 text-zinc-400",
  // reuniao
  agendada: "bg-blue-500/15 text-blue-300",
  realizada: "bg-success/15 text-success",
  remarcada: "bg-amber-500/15 text-amber-300",
  // priority
  critica: "bg-destructive/15 text-destructive",
  alta: "bg-orange-500/15 text-orange-300",
  media: "bg-blue-500/15 text-blue-300",
  baixa: "bg-zinc-500/15 text-zinc-300",
};

const DOT_COLORS: Record<string, string> = {
  lead: "bg-zinc-400", qualificado: "bg-blue-400", proposta: "bg-violet-400",
  negociacao: "bg-amber-400", ganho: "bg-success", perdido: "bg-destructive",
  em_negociacao: "bg-amber-400", ativo: "bg-success", pausado: "bg-zinc-400",
  encerrado: "bg-zinc-500", cancelado: "bg-destructive",
  aberta: "bg-zinc-400", em_andamento: "bg-blue-400", bloqueada: "bg-destructive",
  concluida: "bg-success",
  pendente: "bg-amber-400", pago: "bg-success", atrasado: "bg-destructive",
  ativa: "bg-success", pausada: "bg-amber-400", encerrada: "bg-zinc-500",
  agendada: "bg-blue-400", realizada: "bg-success", remarcada: "bg-amber-400",
  critica: "bg-destructive", alta: "bg-orange-400", media: "bg-blue-400", baixa: "bg-zinc-400",
};

const LABELS: Record<string, string> = {
  em_negociacao: "Em negociação", em_andamento: "Em andamento",
};

export function StatusBadge({ value, dot = true, pulse = false }: { value: string; dot?: boolean; pulse?: boolean }) {
  const cls = COLORS[value] ?? "bg-zinc-500/15 text-zinc-300";
  const dotCls = DOT_COLORS[value] ?? "bg-zinc-400";
  const label = LABELS[value] ?? value.replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium capitalize ${cls} ${pulse ? "pulse-critical" : ""}`}>
      {dot && <span className={`size-1.5 rounded-full ${dotCls}`} />}
      {label}
    </span>
  );
}
