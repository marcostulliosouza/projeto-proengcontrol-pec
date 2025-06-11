import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../types/permissions';

// Ícones com tamanho padrão correto
const DashboardIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
  </svg>
);

const DevicesIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const CallsIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const MaintenanceIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ProductionIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const ReportsIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const InsumosIcon = ({ className = "w-5 h-5" }) => (
  <svg
  className={className}
  fill="none"
  stroke="currentColor"
  viewBox="0 0 24 24"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
  />
</svg>
);

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  permission: string;
  getBadge?: (stats: GlobalStats) => number; 
}

interface GlobalStats {
  chamadosAbertos: number;
  manutencoesPendentes: number;
  dispositivosInativos: number;
}

const createMenuItems = (): MenuItem[] => [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: DashboardIcon,
    path: '/dashboard',
    permission: 'VIEW_DASHBOARD'
  },
  {
    id: 'dispositivos',
    label: 'Dispositivos',
    icon: DevicesIcon,
    path: '/dispositivos',
    permission: 'VIEW_DISPOSITIVOS',
    getBadge: (stats) => stats.dispositivosInativos, // Badge para dispositivos inativos
  },
  {
    id: 'chamados',
    label: 'Suporte à Linha',
    icon: CallsIcon,
    path: '/chamados',
    permission: 'VIEW_CHAMADOS',
    getBadge: (stats) => stats.chamadosAbertos, // Badge para chamados abertos
  },
  {
    id: 'manutencao',
    label: 'Manutenção',
    icon: MaintenanceIcon,
    path: '/manutencao',
    permission: 'VIEW_MANUTENCAO',
    getBadge: (stats) => stats.manutencoesPendentes, // Badge para manutenções
  },
  {
    id: 'producao',
    label: 'Produção',
    icon: ProductionIcon,
    path: '/producao',
    permission: 'VIEW_PRODUCAO',
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: ReportsIcon,
    path: '/relatorios',
    permission: 'VIEW_RELATORIOS',
  },
  {
    id: 'insumos',
    label: 'Insumos',
    icon: InsumosIcon,
    path: '/insumos',
    permission: 'VIEW_RELATORIOS',
  },
];

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  stats: GlobalStats;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  isCollapsed, 
  onClose, 
  onToggleCollapse,
  stats 
}) => {
  const { state: authState } = useAuth();
  const { hasPermission, getUserLevelName, isProduction } = usePermissions(authState.user?.categoria);
  const location = useLocation();

  const menuItems = createMenuItems();

  // NOVO: Filtrar items baseado em permissões
  const filteredMenuItems = menuItems.filter(item => {
    return hasPermission(item.permission);
  });

  // Log para debug
  console.log('🔐 Usuário:', authState.user?.nome, '- Nível:', getUserLevelName());
  console.log('📋 Menu items disponíveis:', filteredMenuItems.map(item => item.label));

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-white border-r border-secondary-200 z-50 transform transition-all duration-300 ease-in-out flex flex-col shadow-lg
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:z-auto lg:shadow-none
        ${isCollapsed ? 'lg:w-16' : 'lg:w-60'}
        w-60
      `}>
        {/* Header */}
        <div className={`border-b border-secondary-200 bg-gradient-to-r from-primary-600 to-primary-700 flex-shrink-0 ${
          isCollapsed ? 'lg:p-3' : 'p-4'
        }`}>
          <div className={`flex items-center ${isCollapsed ? 'lg:justify-center' : 'justify-between'}`}>
            <div className={`flex items-center ${isCollapsed ? 'lg:space-x-0' : 'space-x-3'}`}>
              <div className={`bg-white rounded-lg flex items-center justify-center shadow-md ${
                isCollapsed ? 'w-8 h-8' : 'w-9 h-9'
              }`}>
                <span className={`text-primary-600 font-bold ${isCollapsed ? 'text-sm' : 'text-base'}`}>
                  PEC
                </span>
              </div>
              
              {!isCollapsed && (
                <div className="text-white">
                  <h1 className="text-base font-bold leading-tight">ProEngControl</h1>
                  <p className="text-xs text-primary-100">
                    {getUserLevelName()} {/* NOVO: Mostrar nível do usuário */}
                  </p>
                </div>
              )}
            </div>
            
            {!isCollapsed && (
              <button 
                onClick={onClose}
                className="lg:hidden p-1 rounded-md text-white hover:bg-primary-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {/* NOVO: Aviso especial para usuários de produção */}
          {isProduction() && !isCollapsed && (
            <div className="mx-2 mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-xs font-medium text-yellow-800">Usuário Produção</span>
              </div>
              <p className="text-xs text-yellow-700 mt-1">
                Acesso limitado: apenas visualização
              </p>
            </div>
          )}

          <ul className="space-y-1">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const badge = item.getBadge ? item.getBadge(stats) : 0;
              
              return (
                <li key={item.id} className="relative group">
                  <NavLink
                    to={item.path}
                    onClick={() => onClose()}
                    className={`
                      relative flex items-center rounded-lg text-sm font-medium transition-all duration-200 group
                      ${isActive 
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md' 
                        : 'text-secondary-700 hover:bg-secondary-100 hover:text-secondary-900'
                      }
                      ${isCollapsed 
                        ? 'lg:justify-center lg:p-2.5 lg:mx-1' 
                        : 'px-3 py-2.5 space-x-3'
                      }
                    `}
                  >
                    {/* Ícone com badge sobreposto quando colapsado */}
                    <div className="relative flex-shrink-0">
                      <Icon className="w-5 h-5" />
                      {badge > 0 && isCollapsed && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </div>
                    
                    {/* Label e badge quando expandido */}
                    {!isCollapsed && (
                      <>
                        <span className="truncate flex-1">
                          {item.label}
                        </span>
                        
                        {badge > 0 && (
                          <span className={`ml-auto font-bold text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none ${
                            isActive 
                              ? 'bg-white text-primary-600' 
                              : 'bg-red-500 text-white'
                          }`}>
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                      </>
                    )}

                    {/* Indicador ativo */}
                    {isActive && !isCollapsed && (
                      <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                    )}
                  </NavLink>
                  
                  {/* Tooltip para modo colapsado */}
                  {isCollapsed && (
                    <div className="hidden lg:group-hover:block absolute left-14 top-1/2 transform -translate-y-1/2 z-50">
                      <div className="bg-gray-900 text-white text-sm rounded-lg py-2 px-3 whitespace-nowrap shadow-xl">
                        {item.label}
                        {badge > 0 && (
                          <span className="ml-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* NOVO: Mensagem se não há items disponíveis */}
          {filteredMenuItems.length === 0 && (
            <div className="text-center py-8 text-secondary-500">
              <svg className="w-8 h-8 mx-auto mb-2 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-sm">Sem acesso a páginas</p>
            </div>
          )}
        </nav>

        {/* Footer com toggle */}
        <div className={`border-t border-secondary-200 bg-secondary-50 flex-shrink-0 ${
          isCollapsed ? 'lg:p-2' : 'p-3'
        }`}>
          <button
            onClick={onToggleCollapse}
            className={`hidden lg:flex items-center justify-center w-full rounded-lg bg-white hover:bg-secondary-100 transition-all duration-200 shadow-sm border border-secondary-200 ${
              isCollapsed ? 'p-2' : 'py-2 px-3 space-x-2'
            }`}
            title={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            <div className="flex items-center justify-center w-5 h-5">
              {isCollapsed ? (
                <svg className="w-4 h-4 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              )}
            </div>
            
            {!isCollapsed && (
              <span className="text-sm font-medium text-secondary-700">
                Recolher
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;