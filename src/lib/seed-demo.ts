import { supabase } from "@/integrations/supabase/client";

export async function seedDemoData(): Promise<{ success: boolean; message: string }> {
  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return { success: false, message: "Usuário não autenticado." };
    }
    const userId = userData.user.id;

    const { data: existing, error: existErr } = await supabase
      .from("empresas")
      .select("id")
      .eq("user_id", userId)
      .limit(1);
    if (existErr) throw existErr;
    if (existing && existing.length > 0) {
      return { success: false, message: "Já existem empresas cadastradas. Seed não executado." };
    }

    const now = Date.now();
    const day = 86400000;
    const hour = 3600000;
    const iso = (ms: number) => new Date(ms).toISOString();

    // 1. EMPRESAS
    const { data: empresas, error: eErr } = await supabase
      .from("empresas")
      .insert([
        { user_id: userId, nome: "LetEduca", descricao: "Plataforma de educação digital", segmento: "EdTech", cor_identidade: "#3b82f6", status: "ativa" },
        { user_id: userId, nome: "Zeppe", descricao: "Tecnologia e automação", segmento: "Tecnologia", cor_identidade: "#22c55e", status: "ativa" },
        { user_id: userId, nome: "ALVANT", descricao: "Consultoria em tecnologia", segmento: "Consultoria", cor_identidade: "#f59e0b", status: "ativa" },
      ])
      .select();
    if (eErr) throw eErr;

    const letId = empresas!.find(e => e.nome === "LetEduca")!.id;
    const zepId = empresas!.find(e => e.nome === "Zeppe")!.id;
    const alvId = empresas!.find(e => e.nome === "ALVANT")!.id;

    // 2. MEMBROS
    const { data: membros, error: mErr } = await supabase.from("membros").insert([
      { empresa_id: letId, user_id: userId, nome: "David", email: "david@leteduca.com", papel: "dono", ativo: true },
      { empresa_id: zepId, user_id: userId, nome: "David", email: "david@zeppe.com", papel: "dono", ativo: true },
      { empresa_id: zepId, nome: "Davi", email: "davi@zeppe.com", papel: "socio", ativo: true },
      { empresa_id: alvId, user_id: userId, nome: "David", email: "david@alvant.com", papel: "dono", ativo: true },
      { empresa_id: alvId, nome: "Lucas", email: "lucas@alvant.com", papel: "socio", ativo: true },
    ]).select();
    if (mErr) throw mErr;

    const davidLet = membros!.find(m => m.empresa_id === letId && m.nome === "David")!.id;
    const davidZep = membros!.find(m => m.empresa_id === zepId && m.nome === "David")!.id;
    const daviZep = membros!.find(m => m.empresa_id === zepId && m.nome === "Davi")!.id;
    const davidAlv = membros!.find(m => m.empresa_id === alvId && m.nome === "David")!.id;
    const lucasAlv = membros!.find(m => m.empresa_id === alvId && m.nome === "Lucas")!.id;

    // 3. PIPELINE
    const { data: pipelines, error: pErr } = await supabase.from("pipeline").insert([
      { empresa_id: letId, user_id: userId, nome_lead: "Carlos Mendes", empresa_lead: "Escola Futuro Digital", estagio: "negociacao", valor_estimado: 15000, probabilidade: 75, origem: "indicacao", responsavel_id: davidLet },
      { empresa_id: letId, user_id: userId, nome_lead: "Ana Lima", empresa_lead: "Instituto Aprender", estagio: "proposta", valor_estimado: 8500, probabilidade: 50, origem: "linkedin", responsavel_id: davidLet },
      { empresa_id: letId, user_id: userId, nome_lead: "Roberto Souza", empresa_lead: "Colégio São Paulo", estagio: "qualificado", valor_estimado: 22000, probabilidade: 30, origem: "evento", responsavel_id: davidLet },
      { empresa_id: letId, user_id: userId, nome_lead: "Fernanda Costa", empresa_lead: "EduTech Solutions", estagio: "ganho", valor_estimado: 12000, probabilidade: 100, origem: "indicacao", responsavel_id: davidLet },
      { empresa_id: letId, user_id: userId, nome_lead: "Paulo Martins", empresa_lead: "Escola Nova Era", estagio: "lead", valor_estimado: 5000, probabilidade: 10, origem: "anuncio", responsavel_id: davidLet },
      { empresa_id: zepId, user_id: userId, nome_lead: "Marcos Oliveira", empresa_lead: "Res. Jardins", estagio: "proposta", valor_estimado: 4800, probabilidade: 60, origem: "indicacao", responsavel_id: davidZep },
      { empresa_id: zepId, user_id: userId, nome_lead: "Silvia Ramos", empresa_lead: "Parque Sul", estagio: "negociacao", valor_estimado: 7200, probabilidade: 80, origem: "prospeccao", responsavel_id: daviZep },
      { empresa_id: zepId, user_id: userId, nome_lead: "Carla Pereira", empresa_lead: "Alphaville", estagio: "ganho", valor_estimado: 9600, probabilidade: 100, origem: "indicacao", responsavel_id: davidZep },
      { empresa_id: alvId, user_id: userId, nome_lead: "Ricardo Nunes", empresa_lead: "TechCorp Brasil", estagio: "negociacao", valor_estimado: 35000, probabilidade: 70, origem: "linkedin", responsavel_id: davidAlv },
      { empresa_id: alvId, user_id: userId, nome_lead: "Juliana Castro", empresa_lead: "Inova Sistemas", estagio: "proposta", valor_estimado: 18000, probabilidade: 55, origem: "indicacao", responsavel_id: lucasAlv },
      { empresa_id: alvId, user_id: userId, nome_lead: "Bruno Santos", empresa_lead: "DataSolutions", estagio: "lead", valor_estimado: 8000, probabilidade: 15, origem: "evento", responsavel_id: lucasAlv },
      { empresa_id: alvId, user_id: userId, nome_lead: "Marina Torres", empresa_lead: "StartupXYZ", estagio: "qualificado", valor_estimado: 25000, probabilidade: 35, origem: "prospeccao", responsavel_id: davidAlv },
    ]).select();
    if (pErr) throw pErr;

    const pipeEduTech = pipelines!.find(p => p.empresa_lead === "EduTech Solutions")!.id;
    const pipeParque = pipelines!.find(p => p.empresa_lead === "Parque Sul")!.id;
    const pipeTech = pipelines!.find(p => p.empresa_lead === "TechCorp Brasil")!.id;
    const pipeInova = pipelines!.find(p => p.empresa_lead === "Inova Sistemas")!.id;

    // 4. CONTRATOS
    const { data: contratos, error: cErr } = await supabase.from("contratos").insert([
      { empresa_id: letId, pipeline_id: pipeEduTech, nome_cliente: "EduTech Solutions", descricao: "Plano educacional mensal", periodicidade: "mensal", valor_total: 12000, valor_recorrente: 1200, data_inicio: iso(now - 90 * day), data_fim: iso(now + 270 * day), status: "ativo", responsavel_id: davidLet },
      { empresa_id: zepId, pipeline_id: pipeParque, nome_cliente: "Parque Sul", descricao: "Sistema de automação", periodicidade: "mensal", valor_total: 7200, valor_recorrente: 600, data_inicio: iso(now - 30 * day), data_fim: iso(now + 330 * day), status: "ativo", responsavel_id: davidZep },
      { empresa_id: alvId, pipeline_id: pipeTech, nome_cliente: "TechCorp Brasil", descricao: "Consultoria estratégica", periodicidade: "mensal", valor_total: 35000, valor_recorrente: 3500, data_inicio: iso(now - 60 * day), data_fim: iso(now + 120 * day), status: "ativo", responsavel_id: davidAlv },
      { empresa_id: alvId, pipeline_id: pipeInova, nome_cliente: "Inova Sistemas", descricao: "Projeto fase 1", periodicidade: "avulso", valor_total: 18000, valor_recorrente: 0, data_inicio: iso(now - 180 * day), data_fim: iso(now - 30 * day), status: "encerrado", responsavel_id: lucasAlv },
    ]).select();
    if (cErr) throw cErr;

    const contrTech = contratos!.find(c => c.nome_cliente === "TechCorp Brasil")!.id;
    const contrEdu = contratos!.find(c => c.nome_cliente === "EduTech Solutions")!.id;
    const contrParque = contratos!.find(c => c.nome_cliente === "Parque Sul")!.id;
    const contrInova = contratos!.find(c => c.nome_cliente === "Inova Sistemas")!.id;

    // 5. REUNIOES
    const { error: rErr } = await supabase.from("reunioes").insert([
      { empresa_id: alvId, user_id: userId, titulo: "Alinhamento semanal ALVANT", tipo: "interna", data_hora: iso(now + 2 * hour), duracao_min: 60, local_ou_link: "https://meet.google.com/abc", participantes: ["David", "Lucas"], pauta: "Review pipeline + tarefas", status: "agendada" },
      { empresa_id: zepId, user_id: userId, titulo: "Demo sistema Parque Sul", tipo: "cliente", data_hora: iso(now + day), duracao_min: 90, local_ou_link: "Presencial — Av. Brasil 123", participantes: ["David", "Davi", "Silvia"], pauta: "Apresentação do sistema", status: "agendada", pipeline_id: pipeParque },
      { empresa_id: letId, user_id: userId, titulo: "Kickoff EduTech Solutions", tipo: "cliente", data_hora: iso(now - 5 * day), duracao_min: 120, local_ou_link: "https://zoom.us/j/12345", participantes: ["David", "Fernanda"], pauta: "Início da implantação", status: "realizada", contrato_id: contrEdu },
      { empresa_id: alvId, user_id: userId, titulo: "Revisão proposta TechCorp", tipo: "cliente", data_hora: iso(now - 2 * day), duracao_min: 60, local_ou_link: "https://meet.google.com/xyz", participantes: ["David", "Lucas", "Ricardo"], pauta: "Ajustes na proposta", status: "realizada", pipeline_id: pipeTech },
      { empresa_id: zepId, user_id: userId, titulo: "Planejamento Q3 Zeppe", tipo: "interna", data_hora: iso(now + 3 * day), duracao_min: 120, local_ou_link: "Escritório Zeppe", participantes: ["David", "Davi"], pauta: "Metas novos clientes Q3", status: "agendada" },
    ]);
    if (rErr) throw rErr;

    // 6. TAREFAS
    const { error: tErr } = await supabase.from("tarefas").insert([
      { empresa_id: alvId, user_id: userId, titulo: "Enviar proposta revisada para TechCorp", prioridade: "critica", status: "aberta", data_limite: iso(now + day), responsavel_id: davidAlv },
      { empresa_id: alvId, user_id: userId, titulo: "Onboarding Lucas no sistema", prioridade: "alta", status: "em_andamento", data_limite: iso(now + 3 * day), responsavel_id: davidAlv },
      { empresa_id: zepId, user_id: userId, titulo: "Fechar contrato Parque Sul", prioridade: "critica", status: "em_andamento", data_limite: iso(now + day), responsavel_id: davidZep },
      { empresa_id: zepId, user_id: userId, titulo: "Configurar acesso para cliente Alphaville", prioridade: "alta", status: "aberta", data_limite: iso(now + 2 * day), responsavel_id: daviZep },
      { empresa_id: letId, user_id: userId, titulo: "Gravar módulo 3 do curso de tecnologia", prioridade: "media", status: "aberta", data_limite: iso(now + 7 * day), responsavel_id: davidLet },
      { empresa_id: letId, user_id: userId, titulo: "Atualizar documentação da API", prioridade: "baixa", status: "aberta", data_limite: iso(now + 14 * day), responsavel_id: davidLet },
      { empresa_id: alvId, user_id: userId, titulo: "Revisar NDA com TechCorp", prioridade: "alta", status: "bloqueada", data_limite: iso(now + 5 * day), responsavel_id: lucasAlv },
      { empresa_id: zepId, user_id: userId, titulo: "Relatório mensal para o Davi", prioridade: "media", status: "concluida", data_limite: iso(now - day), concluida_em: iso(now - day), responsavel_id: davidZep },
    ]);
    if (tErr) throw tErr;

    // 7. AGENDA
    const { error: aErr } = await supabase.from("agenda").insert([
      { empresa_id: alvId, user_id: userId, titulo: "Reunião semanal ALVANT", tipo: "reuniao", data_inicio: iso(now + 2 * hour), data_fim: iso(now + 3 * hour) },
      { empresa_id: zepId, user_id: userId, titulo: "Demo Parque Sul", tipo: "reuniao", data_inicio: iso(now + day), data_fim: iso(now + day + 1.5 * hour) },
      { empresa_id: alvId, user_id: userId, titulo: "Prazo proposta TechCorp", tipo: "vencimento", data_inicio: iso(now + day), dia_todo: true },
      { empresa_id: letId, user_id: userId, titulo: "Recebimento EduTech", tipo: "pagamento", data_inicio: iso(now + 5 * day), dia_todo: true },
      { empresa_id: zepId, user_id: userId, titulo: "Planejamento Q3", tipo: "reuniao", data_inicio: iso(now + 3 * day), data_fim: iso(now + 3 * day + 2 * hour) },
      { empresa_id: alvId, user_id: userId, titulo: "Cobrar Lucas sobre NDA", tipo: "lembrete", data_inicio: iso(now + 4 * hour) },
    ]);
    if (aErr) throw aErr;

    // 8. FINANCEIRO
    const { error: fErr } = await supabase.from("financeiro").insert([
      { empresa_id: letId, contrato_id: contrEdu, tipo: "receita", categoria: "mensalidade", descricao: "Mensalidade EduTech — Maio", valor: 1200, data_vencimento: iso(now + 5 * day), status_pagamento: "pendente" },
      { empresa_id: letId, contrato_id: contrEdu, tipo: "receita", categoria: "mensalidade", descricao: "Mensalidade EduTech — Abril", valor: 1200, data_vencimento: iso(now - 25 * day), data_pagamento: iso(now - 24 * day), status_pagamento: "pago" },
      { empresa_id: letId, tipo: "despesa", categoria: "ferramentas", descricao: "Supabase Pro", valor: 150, data_vencimento: iso(now + 10 * day), status_pagamento: "pendente" },
      { empresa_id: zepId, contrato_id: contrParque, tipo: "receita", categoria: "mensalidade", descricao: "Mensalidade Parque Sul — Maio", valor: 600, data_vencimento: iso(now + 3 * day), status_pagamento: "pendente" },
      { empresa_id: zepId, contrato_id: contrParque, tipo: "receita", categoria: "mensalidade", descricao: "Mensalidade Parque Sul — Abril", valor: 600, data_vencimento: iso(now - 28 * day), data_pagamento: iso(now - 27 * day), status_pagamento: "pago" },
      { empresa_id: zepId, tipo: "despesa", categoria: "operacional", descricao: "Deslocamento instalação", valor: 250, data_vencimento: iso(now - 10 * day), status_pagamento: "atrasado" },
      { empresa_id: alvId, contrato_id: contrTech, tipo: "receita", categoria: "consultoria", descricao: "Parcela 3/10 TechCorp", valor: 3500, data_vencimento: iso(now + 2 * day), status_pagamento: "pendente" },
      { empresa_id: alvId, contrato_id: contrTech, tipo: "receita", categoria: "consultoria", descricao: "Parcela 2/10 TechCorp", valor: 3500, data_vencimento: iso(now - 30 * day), data_pagamento: iso(now - 29 * day), status_pagamento: "pago" },
      { empresa_id: alvId, contrato_id: contrInova, tipo: "receita", categoria: "projeto", descricao: "Pagamento final Inova fase 1", valor: 8000, data_vencimento: iso(now - 35 * day), data_pagamento: iso(now - 33 * day), status_pagamento: "pago" },
      { empresa_id: alvId, tipo: "despesa", categoria: "pessoal", descricao: "Pró-labore David", valor: 3000, data_vencimento: iso(now + 15 * day), status_pagamento: "pendente" },
      { empresa_id: alvId, tipo: "investimento", categoria: "ferramentas", descricao: "Lovable Pro anual", valor: 960, data_vencimento: iso(now - 15 * day), data_pagamento: iso(now - 15 * day), status_pagamento: "pago" },
    ]);
    if (fErr) throw fErr;

    return { success: true, message: "Dados de demonstração carregados com sucesso." };
  } catch (e: any) {
    return { success: false, message: e.message ?? "Erro desconhecido ao carregar dados." };
  }
}