import { supabase } from "@/integrations/supabase/client";

/**
 * Gera notificações para TODOS os membros ativos de uma empresa.
 */
export async function generateNotificationsForEmpresa(empresa_id: string) {
  const { data: membros } = await supabase
    .from("membros")
    .select("user_id")
    .eq("empresa_id", empresa_id)
    .eq("ativo", true);

  if (!membros || membros.length === 0) return;
  const userIds = membros.map(m => m.user_id).filter(Boolean) as string[];
  if (userIds.length === 0) return;

  const today = new Date();
  const in7 = new Date(); in7.setDate(in7.getDate() + 7);
  const ago14 = new Date(); ago14.setDate(ago14.getDate() - 14);

  const templateInserts: any[] = [];

  const { data: tarefas } = await supabase.from("tarefas")
    .select("id,titulo,empresa_id,data_limite")
    .eq("empresa_id", empresa_id)
    .lte("data_limite", today.toISOString())
    .gte("data_limite", new Date(today.getTime() - 24*3600*1000).toISOString())
    .not("status", "in", "(concluida,cancelada)");
  tarefas?.forEach(t => templateInserts.push({
    empresa_id: t.empresa_id, tipo: "tarefa_vence",
    titulo: `Tarefa vence hoje: ${t.titulo}`,
    link_rota: `/empresa/${t.empresa_id}/tarefas`,
  }));

  const { data: contratos } = await supabase.from("contratos")
    .select("id,nome_cliente,empresa_id,data_fim")
    .eq("empresa_id", empresa_id)
    .lte("data_fim", in7.toISOString())
    .gte("data_fim", today.toISOString())
    .eq("status", "ativo");
  contratos?.forEach(c => templateInserts.push({
    empresa_id: c.empresa_id, tipo: "contrato_vence",
    titulo: `Contrato vence em até 7 dias: ${c.nome_cliente}`,
    link_rota: `/empresa/${c.empresa_id}/contratos`,
  }));

  const { data: fin } = await supabase.from("financeiro")
    .select("id,descricao,empresa_id")
    .eq("empresa_id", empresa_id)
    .eq("status_pagamento", "atrasado");
  fin?.forEach(f => templateInserts.push({
    empresa_id: f.empresa_id, tipo: "pagamento_atrasado",
    titulo: `Pagamento em atraso: ${f.descricao}`,
    link_rota: `/empresa/${f.empresa_id}/financeiro`,
  }));

  const { data: leads } = await supabase.from("pipeline")
    .select("id,nome_lead,empresa_id,updated_at")
    .eq("empresa_id", empresa_id)
    .lte("updated_at", ago14.toISOString())
    .not("estagio", "in", "(ganho,perdido)");
  leads?.forEach(l => templateInserts.push({
    empresa_id: l.empresa_id, tipo: "lead_parado",
    titulo: `Lead parado há 2 semanas: ${l.nome_lead}`,
    link_rota: `/empresa/${l.empresa_id}/pipeline`,
  }));

  if (templateInserts.length === 0) return;

  const allInserts: any[] = [];
  for (const userId of userIds) {
    const titulos = templateInserts.map(i => i.titulo);
    const { data: existing } = await supabase.from("notificacoes")
      .select("titulo")
      .eq("user_id", userId)
      .in("titulo", titulos)
      .gte("created_at", new Date(Date.now() - 24*3600*1000).toISOString());
    const existingSet = new Set((existing ?? []).map(e => e.titulo));
    const fresh = templateInserts.filter(i => !existingSet.has(i.titulo));
    fresh.forEach(i => allInserts.push({ ...i, user_id: userId }));
  }

  if (allInserts.length > 0) {
    await supabase.from("notificacoes").insert(allInserts);
  }
}

/**
 * Notificação pontual enviada a todos os membros da empresa.
 */
export async function notifyEmpresa(params: {
  empresa_id: string;
  tipo: string;
  titulo: string;
  mensagem?: string;
  link_rota?: string;
  excluir_user_id?: string;
}) {
  const { data: membros } = await supabase
    .from("membros")
    .select("user_id")
    .eq("empresa_id", params.empresa_id)
    .eq("ativo", true);

  if (!membros) return;

  const inserts = membros
    .map(m => m.user_id)
    .filter((uid): uid is string => !!uid && uid !== params.excluir_user_id)
    .map(uid => ({
      user_id: uid,
      empresa_id: params.empresa_id,
      tipo: params.tipo,
      titulo: params.titulo,
      mensagem: params.mensagem ?? null,
      link_rota: params.link_rota ?? null,
    }));

  if (inserts.length > 0) {
    await supabase.from("notificacoes").insert(inserts);
  }
}

// Compatibilidade com chamadas antigas
export async function generateNotifications(userId: string) {
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "ativa");
  for (const e of empresas ?? []) {
    await generateNotificationsForEmpresa(e.id);
  }
}