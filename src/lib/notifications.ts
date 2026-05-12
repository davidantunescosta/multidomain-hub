import { supabase } from "@/integrations/supabase/client";

// Generate notifications based on current data state (idempotent-ish: dedupes by tipo+title within last 24h)
export async function generateNotifications(userId: string) {
  const today = new Date();
  const in7 = new Date(); in7.setDate(in7.getDate() + 7);
  const ago14 = new Date(); ago14.setDate(ago14.getDate() - 14);

  const inserts: any[] = [];

  // Tarefas vencendo hoje
  const { data: tarefas } = await supabase.from("tarefas")
    .select("id,titulo,empresa_id,data_limite")
    .lte("data_limite", today.toISOString())
    .gte("data_limite", new Date(today.getTime() - 24*3600*1000).toISOString())
    .not("status", "in", "(concluida,cancelada)");
  tarefas?.forEach(t => inserts.push({
    user_id: userId, empresa_id: t.empresa_id, tipo: "tarefa_vence",
    titulo: `Tarefa vence hoje: ${t.titulo}`,
    link_rota: `/empresa/${t.empresa_id}/tarefas`,
  }));

  // Contratos vencendo em 7 dias
  const { data: contratos } = await supabase.from("contratos")
    .select("id,nome_cliente,empresa_id,data_fim")
    .lte("data_fim", in7.toISOString())
    .gte("data_fim", today.toISOString())
    .eq("status", "ativo");
  contratos?.forEach(c => inserts.push({
    user_id: userId, empresa_id: c.empresa_id, tipo: "contrato_vence",
    titulo: `Contrato vence em até 7 dias: ${c.nome_cliente}`,
    link_rota: `/empresa/${c.empresa_id}/contratos`,
  }));

  // Financeiro atrasado
  const { data: fin } = await supabase.from("financeiro")
    .select("id,descricao,empresa_id")
    .eq("status_pagamento", "atrasado");
  fin?.forEach(f => inserts.push({
    user_id: userId, empresa_id: f.empresa_id, tipo: "pagamento_atrasado",
    titulo: `Pagamento em atraso: ${f.descricao}`,
    link_rota: `/empresa/${f.empresa_id}/financeiro`,
  }));

  // Lead parado 14 dias
  const { data: leads } = await supabase.from("pipeline")
    .select("id,nome_lead,empresa_id,updated_at")
    .lte("updated_at", ago14.toISOString())
    .not("estagio", "in", "(ganho,perdido)");
  leads?.forEach(l => inserts.push({
    user_id: userId, empresa_id: l.empresa_id, tipo: "lead_parado",
    titulo: `Lead parado há 2 semanas: ${l.nome_lead}`,
    link_rota: `/empresa/${l.empresa_id}/pipeline`,
  }));

  if (inserts.length === 0) return;

  // Dedupe: only insert if no recent notification with same titulo
  const titulos = inserts.map(i => i.titulo);
  const { data: existing } = await supabase.from("notificacoes")
    .select("titulo")
    .in("titulo", titulos)
    .gte("created_at", new Date(Date.now() - 24*3600*1000).toISOString());
  const existingSet = new Set((existing ?? []).map(e => e.titulo));
  const fresh = inserts.filter(i => !existingSet.has(i.titulo));
  if (fresh.length) await supabase.from("notificacoes").insert(fresh);
}
