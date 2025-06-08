export const UserLevel = {
  ADMINISTRADOR: 1,
  GERENTE: 5,
  SUPERVISOR: 10,
  ANALISTA: 20,
  MANUTENCAO_PREVENTIVA: 30,
  AUXILIAR_ANALISTA: 40,
  TECNICO: 50,
  PRODUCAO: 100
} as const;

export type UserLevel = typeof UserLevel[keyof typeof UserLevel];

export interface Permission {
  id: string;
  description: string;
  levels: UserLevel[];
}

// Definição completa de permissões do sistema
export const PERMISSIONS: Record<string, Permission> = {
  // === NAVEGAÇÃO ===
  VIEW_DASHBOARD: {
    id: 'view_dashboard',
    description: 'Acessar dashboard',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR, UserLevel.ANALISTA, UserLevel.AUXILIAR_ANALISTA, UserLevel.TECNICO]
  },
  
  VIEW_DISPOSITIVOS: {
    id: 'view_dispositivos',
    description: 'Acessar página de dispositivos',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR, UserLevel.ANALISTA, UserLevel.MANUTENCAO_PREVENTIVA]
  },
  
  VIEW_CHAMADOS: {
    id: 'view_chamados',
    description: 'Acessar página de chamados',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR, UserLevel.ANALISTA, UserLevel.AUXILIAR_ANALISTA, UserLevel.TECNICO, UserLevel.PRODUCAO]
  },
  
  VIEW_MANUTENCAO: {
    id: 'view_manutencao',
    description: 'Acessar página de manutenção',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR, UserLevel.MANUTENCAO_PREVENTIVA]
  },
  
  VIEW_PRODUCAO: {
    id: 'view_producao',
    description: 'Acessar página de produção',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR, UserLevel.PRODUCAO]
  },
  
  VIEW_RELATORIOS: {
    id: 'view_relatorios',
    description: 'Acessar relatórios',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR]
  },

  // === CHAMADOS - CRIAÇÃO ===
  CREATE_CHAMADO: {
    id: 'create_chamado',
    description: 'Criar novos chamados',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR, UserLevel.ANALISTA, UserLevel.AUXILIAR_ANALISTA, UserLevel.TECNICO, UserLevel.PRODUCAO]
  },
  
  EDIT_CHAMADO: {
    id: 'edit_chamado',
    description: 'Editar chamados existentes',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR]
  },

  // === CHAMADOS - ATENDIMENTO ===
  START_ATTENDANCE: {
    id: 'start_attendance',
    description: 'Iniciar atendimento de chamados',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR, UserLevel.ANALISTA, UserLevel.AUXILIAR_ANALISTA, UserLevel.TECNICO]
  },
  
  TRANSFER_CHAMADO: {
    id: 'transfer_chamado',
    description: 'Transferir chamados para outros usuários',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR, UserLevel.ANALISTA, UserLevel.AUXILIAR_ANALISTA, UserLevel.TECNICO]
  },
  
  FINISH_CHAMADO: {
    id: 'finish_chamado',
    description: 'Finalizar chamados',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR, UserLevel.ANALISTA, UserLevel.AUXILIAR_ANALISTA, UserLevel.TECNICO]
  },
  
  CANCEL_ATTENDANCE: {
    id: 'cancel_attendance',
    description: 'Cancelar atendimento de chamados',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR, UserLevel.ANALISTA, UserLevel.AUXILIAR_ANALISTA, UserLevel.TECNICO]
  },

  // === NOTIFICAÇÕES ===
  RECEIVE_NEW_CHAMADO_NOTIFICATIONS: {
    id: 'receive_new_chamado_notifications',
    description: 'Receber notificações de novos chamados',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR, UserLevel.ANALISTA, UserLevel.AUXILIAR_ANALISTA, UserLevel.TECNICO]
  },
  
  RECEIVE_TRANSFER_NOTIFICATIONS: {
    id: 'receive_transfer_notifications',
    description: 'Receber notificações de transferências',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR, UserLevel.ANALISTA, UserLevel.AUXILIAR_ANALISTA, UserLevel.TECNICO]
  },
  
  RECEIVE_FINISH_NOTIFICATIONS: {
    id: 'receive_finish_notifications',
    description: 'Receber notificações de finalizações',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR]
  },

  // === DISPOSITIVOS ===
  CREATE_DISPOSITIVO: {
    id: 'create_dispositivo',
    description: 'Criar novos dispositivos',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR, UserLevel.ANALISTA, UserLevel.AUXILIAR_ANALISTA]
  },
  
  EDIT_DISPOSITIVO: {
    id: 'edit_dispositivo',
    description: 'Editar dispositivos',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR, UserLevel.ANALISTA, UserLevel.AUXILIAR_ANALISTA]
  },
  
  DELETE_DISPOSITIVO: {
    id: 'delete_dispositivo',
    description: 'Deletar dispositivos',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR]
  },

  // === ESTATÍSTICAS E DADOS ===
  VIEW_ALL_STATS: {
    id: 'view_all_stats',
    description: 'Ver todas as estatísticas do sistema',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR, UserLevel.ANALISTA]
  },
  
  VIEW_CHAMADOS_DETAILS: {
    id: 'view_chamados_details',
    description: 'Ver detalhes completos dos chamados',
    levels: [UserLevel.ADMINISTRADOR, UserLevel.GERENTE, UserLevel.SUPERVISOR, UserLevel.ANALISTA, UserLevel.AUXILIAR_ANALISTA, UserLevel.TECNICO]
  },
  
  VIEW_LIMITED_CHAMADOS_DETAILS: {
    id: 'view_limited_chamados_details',
    description: 'Ver detalhes limitados dos chamados (apenas status)',
    levels: [UserLevel.PRODUCAO]
  }
};

// Classe principal para verificação de permissões
export class PermissionChecker {
  private userLevel: UserLevel;

  constructor(userLevel: number) {
    this.userLevel = userLevel as UserLevel;
  }

  // Verifica se o usuário tem uma permissão específica
  hasPermission(permissionId: string): boolean {
    const permission = PERMISSIONS[permissionId];
    if (!permission) {
      console.warn(`Permissão não encontrada: ${permissionId}`);
      return false;
    }
    
    return permission.levels.includes(this.userLevel);
  }

  // Verifica múltiplas permissões (AND - todas devem ser verdadeiras)
  hasAllPermissions(permissionIds: string[]): boolean {
    return permissionIds.every(id => this.hasPermission(id));
  }

  // Verifica múltiplas permissões (OR - pelo menos uma deve ser verdadeira)
  hasAnyPermission(permissionIds: string[]): boolean {
    return permissionIds.some(id => this.hasPermission(id));
  }

  // Obtém o nível do usuário
  getUserLevel(): UserLevel {
    return this.userLevel;
  }

  // Obtém o nome do nível do usuário
  getUserLevelName(): string {
    const levelNames: Record<UserLevel, string> = {
      [UserLevel.ADMINISTRADOR]: 'Administrador',
      [UserLevel.GERENTE]: 'Gerente',
      [UserLevel.SUPERVISOR]: 'Supervisor',
      [UserLevel.ANALISTA]: 'Analista',
      [UserLevel.MANUTENCAO_PREVENTIVA]: 'Manutenção Preventiva',
      [UserLevel.AUXILIAR_ANALISTA]: 'Auxiliar de Analista',
      [UserLevel.TECNICO]: 'Técnico',
      [UserLevel.PRODUCAO]: 'Produção'
    };
    
    return levelNames[this.userLevel] || 'Desconhecido';
  }

  // Verifica se é usuário de produção
  isProduction(): boolean {
    return this.userLevel === UserLevel.PRODUCAO;
  }

  // Verifica se é usuário de nível técnico ou superior
  isTechnicalOrAbove(): boolean {
    return this.userLevel <= UserLevel.TECNICO;
  }

  // Verifica se é supervisor ou superior
  isSupervisorOrAbove(): boolean {
    return this.userLevel <= UserLevel.SUPERVISOR;
  }

  // Verifica se é administrador
  isAdmin(): boolean {
    return this.userLevel === UserLevel.ADMINISTRADOR;
  }
}

// Hook para usar permissões nos componentes React
export const usePermissions = (userLevel?: number) => {
  const checker = new PermissionChecker(userLevel || 999);
  
  return {
    hasPermission: (permissionId: string) => checker.hasPermission(permissionId),
    hasAllPermissions: (permissionIds: string[]) => checker.hasAllPermissions(permissionIds),
    hasAnyPermission: (permissionIds: string[]) => checker.hasAnyPermission(permissionIds),
    getUserLevel: () => checker.getUserLevel(),
    getUserLevelName: () => checker.getUserLevelName(),
    isProduction: () => checker.isProduction(),
    isTechnicalOrAbove: () => checker.isTechnicalOrAbove(),
    isSupervisorOrAbove: () => checker.isSupervisorOrAbove(),
    isAdmin: () => checker.isAdmin(),
    checker
  };
};