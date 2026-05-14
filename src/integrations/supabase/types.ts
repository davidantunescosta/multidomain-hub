export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agenda: {
        Row: {
          contrato_id: string | null
          cor: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          dia_todo: boolean | null
          empresa_id: string | null
          id: string
          recorrente: boolean | null
          reuniao_id: string | null
          tarefa_id: string | null
          tipo: string | null
          titulo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contrato_id?: string | null
          cor?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio: string
          descricao?: string | null
          dia_todo?: boolean | null
          empresa_id?: string | null
          id?: string
          recorrente?: boolean | null
          reuniao_id?: string | null
          tarefa_id?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contrato_id?: string | null
          cor?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          dia_todo?: boolean | null
          empresa_id?: string | null
          id?: string
          recorrente?: boolean | null
          reuniao_id?: string | null
          tarefa_id?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_reuniao_id_fkey"
            columns: ["reuniao_id"]
            isOneToOne: false
            referencedRelation: "reunioes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string | null
          email_dono: string
          id: string
          max_empresas: number
          max_usuarios: number
          nome: string
          observacoes: string | null
          plano: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_dono: string
          id?: string
          max_empresas?: number
          max_usuarios?: number
          nome: string
          observacoes?: string | null
          plano?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_dono?: string
          id?: string
          max_empresas?: number
          max_usuarios?: number
          nome?: string
          observacoes?: string | null
          plano?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      contratos: {
        Row: {
          arquivo_url: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          empresa_id: string
          id: string
          nome_cliente: string
          observacoes: string | null
          periodicidade: string | null
          pipeline_id: string | null
          responsavel_id: string | null
          status: string
          updated_at: string | null
          valor_recorrente: number | null
          valor_total: number | null
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          empresa_id: string
          id?: string
          nome_cliente: string
          observacoes?: string | null
          periodicidade?: string | null
          pipeline_id?: string | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string | null
          valor_recorrente?: number | null
          valor_total?: number | null
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome_cliente?: string
          observacoes?: string | null
          periodicidade?: string | null
          pipeline_id?: string | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string | null
          valor_recorrente?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          cliente_id: string | null
          cor_identidade: string
          created_at: string | null
          descricao: string | null
          id: string
          logo_url: string | null
          nome: string
          segmento: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cliente_id?: string | null
          cor_identidade?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          segmento?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cliente_id?: string | null
          cor_identidade?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          segmento?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro: {
        Row: {
          categoria: string | null
          contrato_id: string | null
          created_at: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string
          empresa_id: string
          id: string
          status_pagamento: string
          tipo: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          categoria?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao: string
          empresa_id: string
          id?: string
          status_pagamento?: string
          tipo: string
          updated_at?: string | null
          valor: number
        }
        Update: {
          categoria?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string
          empresa_id?: string
          id?: string
          status_pagamento?: string
          tipo?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      membros: {
        Row: {
          ativo: boolean | null
          cliente_id: string | null
          created_at: string | null
          email: string | null
          empresa_id: string
          id: string
          nome: string
          papel: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          cliente_id?: string | null
          created_at?: string | null
          email?: string | null
          empresa_id: string
          id?: string
          nome: string
          papel?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          cliente_id?: string | null
          created_at?: string | null
          email?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          papel?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membros_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string | null
          empresa_id: string | null
          id: string
          lida: boolean | null
          link_rota: string | null
          mensagem: string | null
          tipo: string
          titulo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          lida?: boolean | null
          link_rota?: string | null
          mensagem?: string | null
          tipo: string
          titulo: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          lida?: boolean | null
          link_rota?: string | null
          mensagem?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes: {
        Row: {
          cliente_id: string
          created_at: string | null
          empresa_id: string | null
          id: string
          modulo: Database["public"]["Enums"]["modulo"]
          papel: Database["public"]["Enums"]["empresa_papel"]
          pode_criar: boolean
          pode_editar: boolean
          pode_excluir: boolean
          pode_ver: boolean
          updated_at: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          modulo: Database["public"]["Enums"]["modulo"]
          papel: Database["public"]["Enums"]["empresa_papel"]
          pode_criar?: boolean
          pode_editar?: boolean
          pode_excluir?: boolean
          pode_ver?: boolean
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          modulo?: Database["public"]["Enums"]["modulo"]
          papel?: Database["public"]["Enums"]["empresa_papel"]
          pode_criar?: boolean
          pode_editar?: boolean
          pode_excluir?: boolean
          pode_ver?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline: {
        Row: {
          contato_email: string | null
          contato_telefone: string | null
          created_at: string | null
          data_fechamento: string | null
          empresa_id: string
          empresa_lead: string | null
          estagio: string
          id: string
          nome_lead: string
          observacoes: string | null
          origem: string | null
          probabilidade: number | null
          responsavel_id: string | null
          updated_at: string | null
          user_id: string
          valor_estimado: number | null
        }
        Insert: {
          contato_email?: string | null
          contato_telefone?: string | null
          created_at?: string | null
          data_fechamento?: string | null
          empresa_id: string
          empresa_lead?: string | null
          estagio?: string
          id?: string
          nome_lead: string
          observacoes?: string | null
          origem?: string | null
          probabilidade?: number | null
          responsavel_id?: string | null
          updated_at?: string | null
          user_id: string
          valor_estimado?: number | null
        }
        Update: {
          contato_email?: string | null
          contato_telefone?: string | null
          created_at?: string | null
          data_fechamento?: string | null
          empresa_id?: string
          empresa_lead?: string | null
          estagio?: string
          id?: string
          nome_lead?: string
          observacoes?: string | null
          origem?: string | null
          probabilidade?: number | null
          responsavel_id?: string | null
          updated_at?: string | null
          user_id?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
        ]
      }
      reunioes: {
        Row: {
          contrato_id: string | null
          created_at: string | null
          data_hora: string
          decisoes: string | null
          duracao_min: number | null
          empresa_id: string
          id: string
          local_ou_link: string | null
          participantes: string[] | null
          pauta: string | null
          pipeline_id: string | null
          proximos_passos: string | null
          resumo: string | null
          status: string
          tipo: string | null
          titulo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contrato_id?: string | null
          created_at?: string | null
          data_hora: string
          decisoes?: string | null
          duracao_min?: number | null
          empresa_id: string
          id?: string
          local_ou_link?: string | null
          participantes?: string[] | null
          pauta?: string | null
          pipeline_id?: string | null
          proximos_passos?: string | null
          resumo?: string | null
          status?: string
          tipo?: string | null
          titulo: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contrato_id?: string | null
          created_at?: string | null
          data_hora?: string
          decisoes?: string | null
          duracao_min?: number | null
          empresa_id?: string
          id?: string
          local_ou_link?: string | null
          participantes?: string[] | null
          pauta?: string | null
          pipeline_id?: string | null
          proximos_passos?: string | null
          resumo?: string | null
          status?: string
          tipo?: string | null
          titulo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reunioes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reunioes_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          concluida_em: string | null
          contrato_id: string | null
          created_at: string | null
          data_limite: string | null
          descricao: string | null
          empresa_id: string
          id: string
          pipeline_id: string | null
          prioridade: string
          responsavel_id: string | null
          reuniao_id: string | null
          status: string
          titulo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          concluida_em?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_limite?: string | null
          descricao?: string | null
          empresa_id: string
          id?: string
          pipeline_id?: string | null
          prioridade?: string
          responsavel_id?: string | null
          reuniao_id?: string | null
          status?: string
          titulo: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          concluida_em?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_limite?: string | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          pipeline_id?: string | null
          prioridade?: string
          responsavel_id?: string | null
          reuniao_id?: string | null
          status?: string
          titulo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "membros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_reuniao_id_fkey"
            columns: ["reuniao_id"]
            isOneToOne: false
            referencedRelation: "reunioes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      pode_acessar_modulo: {
        Args: {
          _acao: string
          _empresa_id: string
          _modulo: Database["public"]["Enums"]["modulo"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      empresa_papel:
        | "dono"
        | "gerente"
        | "membro"
        | "atendente"
        | "visualizador"
      modulo:
        | "pipeline"
        | "contratos"
        | "reunioes"
        | "tarefas"
        | "agenda"
        | "financeiro"
        | "equipe"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      empresa_papel: ["dono", "gerente", "membro", "atendente", "visualizador"],
      modulo: [
        "pipeline",
        "contratos",
        "reunioes",
        "tarefas",
        "agenda",
        "financeiro",
        "equipe",
      ],
    },
  },
} as const
