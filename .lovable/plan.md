## NEXUS OS — Plano de Construção

Sistema denso e técnico (estética Linear/Raycast) para um empresário gerenciar várias empresas em um só painel. Backend Supabase real desde o início, RLS ativo, Realtime, zero mock.

### Fase 1 — Fundação (backend + design system + auth)

1. **Migration Supabase** — criar todas as 9 tabelas (empresas, membros, pipeline, contratos, reunioes, tarefas, agenda, financeiro, notificacoes), trigger `set_updated_at`, RLS por `user_id` conforme especificado.
2. **Design system** em `src/styles.css` — paleta dark exata (#09090b, #18181b, #27272a, #3f3f46, #fafafa, #a1a1aa, indigo #6366f1, semáforo), tokens semânticos em `oklch`, fontes DM Sans + JetBrains Mono via Google Fonts.
3. **Autenticação** — `/login` e `/signup` com Supabase Auth (email+senha), sessão persistente, listener `onAuthStateChange`, layout `_authenticated` que redireciona não-logados.

### Fase 2 — Shell global

4. **Sidebar fixa colapsável** com itens globais (Command Center, Agenda Global, Minhas Tarefas, Empresas, Notificações) e lista dinâmica de empresas ativas com ponto na cor de identidade.
5. **Header** com sino de notificações (Realtime) + avatar/logout.
6. **Command Palette (Cmd+K)** usando `cmdk` — busca em empresas, pipeline, contratos, reuniões, tarefas; ações rápidas no topo.
7. **Side drawer** padrão (Sheet) reutilizável para create/edit de todas as entidades.

### Fase 3 — Command Center (`/`)

8. Saudação + data + botão "Nova ação rápida" (abre command palette).
9. Grid de cards-empresa horizontais com KPIs reais (leads ativos, reuniões hoje, tarefas críticas, MRR, alertas) — uma query agregada por empresa.
10. Feed unificado de atividades (últimas 20) com Realtime.
11. Painel direito fixo: "Hoje" (reuniões + agenda) e "Pendente de você".

### Fase 4 — Workspace por empresa (`/empresa/$id`)

12. Header com cor de identidade + nome + botão voltar; sub-nav: Pipeline / Contratos / Reuniões / Tarefas / Agenda / Financeiro / Equipe / Configurações.
13. **Pipeline** — Kanban 6 colunas com `@dnd-kit/core`, contadores e soma por coluna, side panel de edição, "Converter em contrato".
14. **Contratos** — KPIs (MRR, ARR, TCV, ativos), tabela com badges de status e alerta de vencimento, drawer create/edit, painel com financeiro vinculado.
15. **Reuniões** — toggle Lista/Calendário, tabs Próximas/Realizadas/Canceladas, drawer create + agenda automática, edição inline de resumo/decisões/próximos passos com botão "Criar tarefas".
16. **Tarefas** — toggle Board/Lista, prioridade colorida (crítica pulsante), drag-and-drop de status, `concluida_em` automático.
17. **Agenda** — calendário mensal/semanal (`react-big-calendar`), ícones por tipo, drawer create cross-empresa.
18. **Financeiro** — KPIs do mês, gráfico de 6 meses (`recharts`), tabela filtrada, "Marcar como pago".
19. **Equipe** — tabela de membros, papéis com badges, toggle ativo, drawer create.
20. **Configurações** — campos editáveis + color picker (12 cores + hex livre), pausar/encerrar com confirmação.

### Fase 5 — Telas globais

21. **Empresas** — grid de cards + wizard 3 passos (dados → primeiro membro → confirmar).
22. **Agenda Global** — calendário unificado com badges de cor por empresa.
23. **Minhas Tarefas** — todas as tarefas do usuário em todas as empresas.
24. **Notificações** — dropdown + página completa, marcar como lida, geração automática (verificada client-side ao carregar; jobs de servidor ficam para uma iteração futura).

### Detalhes técnicos

- TanStack Query em todos os fetches/mutations com invalidação correta por queryKey.
- Supabase Realtime: `notificacoes`, `tarefas`, `pipeline`.
- Datas em `pt-BR`, fuso America/Sao_Paulo, valores em `R$ 0.000,00` via `Intl`.
- Loading skeletons + empty states com CTA em toda listagem.
- Responsivo a partir de 1280px com sidebar colapsável.
- Toda ação destrutiva exige confirmação (AlertDialog).
- Nenhum UUID exposto.

### Bibliotecas a instalar
`cmdk`, `@dnd-kit/core`, `@dnd-kit/sortable`, `react-big-calendar`, `recharts`, `date-fns`, `date-fns-tz`.

### Aviso sobre escopo
Este é um sistema enorme — 12 telas com CRUD completo. Vou construir a versão funcional completa em uma sequência longa de edições. Pode levar várias rodadas de mensagens até estar 100% polido; vou priorizar **fundação → command center → workspace → módulos → telas globais** para que você possa começar a usar cedo e iterar sobre o que estiver pronto.

Posso começar pela migration?