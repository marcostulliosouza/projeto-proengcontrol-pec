/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Card, Button, Table } from '../components/ui';
import Pagination from '../components/ui/Pagination';
import { ManutencaoService, type DispositivoManutencao, type ManutencaoPreventiva } from '../services/manutencaoService';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../types/permissions';
import ManutencaoAtiva from '../components/manutencao/ManutencaoAtiva';
import IniciarManutencaoModal from '../components/manutencao/IniciarManutencaoModal';
import HistoricoManutencoes from '../components/manutencao/HistoricoManutencoes';
import MetricasManutencao from '../components/manutencao/MetricasManutencao';
import type { PaginationInfo } from '../types';

const Manutencao: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dispositivos' | 'historico' | 'metricas'>('dispositivos');
  const [dispositivos, setDispositivos] = useState<DispositivoManutencao[]>([]);
  const [manutencaoAtiva, setManutencaoAtiva] = useState<ManutencaoPreventiva | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIniciarModal, setShowIniciarModal] = useState(false);
  const [dispositivoSelecionado, setDispositivoSelecionado] = useState<DispositivoManutencao | null>(null);
  
  // Estados de filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'necessita' | 'em_dia' | 'atencao'>('todos');
  const [tipoFilter, setTipoFilter] = useState<'todos' | 'DIA' | 'PLACA'>('todos');
  const [showFilters, setShowFilters] = useState(false);

  // Estado da paginação para dispositivos
  const [paginationDispositivos, setPaginationDispositivos] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const { state: authState } = useAuth();
  const permissions = usePermissions(authState.user?.categoria);

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  // Atualizar paginação quando os dispositivos mudarem
  useEffect(() => {
    setPaginationDispositivos(prev => ({
      ...prev,
      totalItems: dispositivosFiltrados.length,
      totalPages: Math.ceil(dispositivosFiltrados.length / prev.itemsPerPage),
      currentPage: 1 // Reset para primeira página quando dados mudarem
    }));
  }, [dispositivos, searchTerm, statusFilter, tipoFilter]);

  // Função para filtrar dispositivos
  const dispositivosFiltrados = dispositivos.filter(dispositivo => {
    // Filtro de busca (DT ou descrição)
    const searchMatch = searchTerm === '' || 
      dispositivo.dis_id.toString().padStart(6, '0').includes(searchTerm) ||
      dispositivo.dis_descricao.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro de status
    let statusMatch = true;
    if (statusFilter === 'necessita') {
      statusMatch = dispositivo.necessita_manutencao;
    } else if (statusFilter === 'em_dia') {
      const percent = typeof dispositivo.percentual_manutencao === 'string' 
        ? parseFloat(dispositivo.percentual_manutencao) 
        : dispositivo.percentual_manutencao;
      statusMatch = !dispositivo.necessita_manutencao && percent <= 70;
    } else if (statusFilter === 'atencao') {
      const percent = typeof dispositivo.percentual_manutencao === 'string' 
        ? parseFloat(dispositivo.percentual_manutencao) 
        : dispositivo.percentual_manutencao;
      statusMatch = !dispositivo.necessita_manutencao && percent > 70 && percent <= 90;
    }

    // Filtro de tipo
    const tipoMatch = tipoFilter === 'todos' || dispositivo.dim_tipo_intervalo === tipoFilter;

    return searchMatch && statusMatch && tipoMatch;
  });

  // Limpar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('todos');
    setTipoFilter('todos');
    setPaginationDispositivos(prev => ({ ...prev, currentPage: 1 }));
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = () => {
    return searchTerm !== '' || statusFilter !== 'todos' || tipoFilter !== 'todos';
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [dispositivosData, manutencaoData] = await Promise.all([
        ManutencaoService.getDispositivosManutencao(),
        ManutencaoService.verificarManutencaoAndamento()
      ]);
      
      setDispositivos(dispositivosData);
      setManutencaoAtiva(manutencaoData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChangeDispositivos = (page: number) => {
    setPaginationDispositivos(prev => ({
      ...prev,
      currentPage: page
    }));
  };

  const handleIniciarManutencao = (dispositivo: DispositivoManutencao) => {
    if (manutencaoAtiva) {
      alert('Você já tem uma manutenção em andamento. Finalize-a antes de iniciar outra.');
      return;
    }
    
    setDispositivoSelecionado(dispositivo);
    setShowIniciarModal(true);
  };

  const handleManutencaoIniciada = () => {
    setShowIniciarModal(false);
    setDispositivoSelecionado(null);
    loadData(); // Recarregar dados
  };

  const handleManutencaoFinalizada = () => {
    setManutencaoAtiva(null);
    loadData(); // Recarregar dados
  };

  // Percentual para manutenção
  const getPercentualManutencao = (percentual: number | string) => {
    console.log('🎨 Calculando cor para percentual:', percentual);
    
    // Converter string para number se necessário
    const percent = typeof percentual === 'string' ? parseFloat(percentual) : percentual;
    
    if (percent <= 70) {
      return 'bg-green-500'; // Verde: 0-70%
    } else if (percent <= 90) {
      return 'bg-yellow-500'; // Amarelo: 71-90%
    } else {
      return 'bg-red-500 animate-pulse'; // Vermelho piscando: >90%
    }
  };

  const formatDaysInterval = (dispositivo: DispositivoManutencao) => {
    if (dispositivo.dim_tipo_intervalo === 'DIA') {
      const diasRestantes = dispositivo.dim_intervalo_dias - dispositivo.dias_desde_ultima;
      if (diasRestantes <= 0) {
        return <span className="text-red-600 font-medium">Atrasado ({Math.abs(diasRestantes)} dias)</span>;
      }
      return <span className="text-blue-600">{diasRestantes} dias restantes</span>;
    } else {
      const placasRestantes = dispositivo.dim_intervalo_placas - dispositivo.dim_placas_executadas;
      if (placasRestantes <= 0) {
        return <span className="text-red-600 font-medium">Atrasado ({Math.abs(placasRestantes)} placas)</span>;
      }
      return <span className="text-blue-600">{placasRestantes} placas restantes</span>;
    }
  };

  // Paginação local para dispositivos filtrados
  const dispositivosPaginados = dispositivosFiltrados.slice(
    (paginationDispositivos.currentPage - 1) * paginationDispositivos.itemsPerPage,
    paginationDispositivos.currentPage * paginationDispositivos.itemsPerPage
  );

  const columnsDispositivos = [
    {
      key: 'necessita_manutencao',
      label: 'Status',
      className: 'w-24',
      render: (_: unknown, item: Record<string, unknown>) => {
        const dispositivo = item as unknown as DispositivoManutencao;
        const percent = typeof dispositivo.percentual_manutencao === 'string' 
          ? parseFloat(dispositivo.percentual_manutencao) 
          : dispositivo.percentual_manutencao;
        
        return (
          <div className="flex items-center justify-center">
            <div 
              className={`w-4 h-4 rounded-full ${getPercentualManutencao(percent)}`} 
              title={`${percent.toFixed(1)}% - ${
                percent <= 70 ? 'Em dia' : 
                percent <= 90 ? 'Atenção' : 
                'Manutenção necessária'
              }`} 
            />
          </div>
        );
      }
    },
    {
      key: 'dis_id',
      label: 'DT',
      render: (value: unknown) => {
        const strValor = String(value || '');
        const formatValor = strValor.padStart(6, '0');
        return(
          <span className="font-medium text-gray-900">{formatValor}</span>
        );
      },
    },
    {
      key: 'dis_descricao',
      label: 'Dispositivo',
      render: (value: unknown) => (
        <span className="font-medium text-gray-900">{String(value || '')}</span>
      )
    },
    {
      key: 'dim_tipo_intervalo',
      label: 'Tipo de Intervalo',
      className: 'w-32',
      render: (value: unknown) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'DIA' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
        }`}>
          {value === 'DIA' ? '📅 Por Dias' : '🔢 Por Placas'}
        </span>
      )
    },
    {
      key: 'intervalo_info',
      label: 'Intervalo',
      className: 'w-40',
      render: (_: unknown, item: Record<string, unknown>) => {
        const dispositivo = item as unknown as DispositivoManutencao;
        return (
          <div className="text-sm">
            {dispositivo.dim_tipo_intervalo === 'DIA' 
              ? `${dispositivo.dim_intervalo_dias} dias`
              : `${dispositivo.dim_intervalo_placas} placas`
            }
          </div>
        );
      }
    },
    {
      key: 'status_info',
      label: 'Situação',
      className: 'w-48',
      render: (_: unknown, item: Record<string, unknown>) => {
        const dispositivo = item as unknown as DispositivoManutencao;
        return formatDaysInterval(dispositivo);
      }
    },
    {
      key: 'percentual_manutencao',
      label: 'Percentual',
      className: 'w-24',
      render: (value: unknown) => {
        const percent = typeof value === 'string' ? parseFloat(value) : Number(value);
        return (
          <div className="text-center">
            <span className={`text-sm font-bold ${
              percent <= 70 ? 'text-green-600' : 
              percent <= 90 ? 'text-yellow-600' : 
              'text-red-600'
            }`}>
              {percent.toFixed(1)}%
            </span>
          </div>
        );
      }
    },
    {
      key: 'dim_data_ultima_manutencao',
      label: 'Última Manutenção',
      className: 'w-36',
      render: (value: unknown) => {
        if (!value) return <span className="text-gray-400">Nunca</span>;
        const date = new Date(String(value));
        return <span className="text-sm">{date.toLocaleDateString('pt-BR')}</span>;
      }
    },
    {
      key: 'actions',
      label: 'Ações',
      className: 'w-32',
      render: (_: unknown, item: Record<string, unknown>) => {
        const dispositivo = item as unknown as DispositivoManutencao;
        return (
          <div className="flex space-x-2">
            {dispositivo.necessita_manutencao ? (
              <Button
                variant="warning"
                size="sm"
                onClick={() => handleIniciarManutencao(dispositivo)}
                disabled={!!manutencaoAtiva}
                title={manutencaoAtiva ? 'Finalize a manutenção atual primeiro' : 'Iniciar manutenção'}
              >
                🔧 Iniciar
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleIniciarManutencao(dispositivo)}
                disabled={!!manutencaoAtiva}
                title="Manutenção fora do prazo"
              >
                🔧 Forçar
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando manutenções...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Principal Modernizado */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              <span className="bg-white bg-opacity-20 rounded-lg p-2 mr-4">
                🔧
              </span>
              Manutenção Preventiva
            </h1>
            <p className="text-blue-100 text-lg">
              Gerencie e monitore todas as manutenções dos seus dispositivos
            </p>
            {manutencaoAtiva && (
              <div className="mt-3 flex items-center bg-orange-500 bg-opacity-80 rounded-lg px-3 py-1">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2"></div>
                <span className="text-sm font-medium">Você tem uma manutenção ativa</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{dispositivos.length}</div>
            <div className="text-blue-100">Dispositivos</div>
            <Button
              variant="secondary"
              onClick={loadData}
              disabled={loading}
              className="mt-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white border-white border-opacity-30"
            >
              {loading ? '⏳' : '🔄'} Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Manutenção Ativa */}
      {manutencaoAtiva && (
        <ManutencaoAtiva
          manutencao={manutencaoAtiva}
          onFinished={handleManutencaoFinalizada}
          onCancelled={handleManutencaoFinalizada}
        />
      )}

       {/* Cards de Estatísticas Principais */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
       <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white transform hover:scale-105 transition-transform shadow-lg">
         <div className="flex items-center justify-between p-6">
           <div>
             <p className="text-red-100 text-sm font-medium">Manutenção Necessária</p>
             <p className="text-3xl font-bold mb-1">
               {dispositivos.filter(d => d.necessita_manutencao).length}
             </p>
             <p className="text-red-200 text-xs">
               {((dispositivos.filter(d => d.necessita_manutencao).length / Math.max(dispositivos.length, 1)) * 100).toFixed(1)}% do total
             </p>
           </div>
           <div className="w-16 h-16 bg-red-400 bg-opacity-30 rounded-full flex items-center justify-center text-2xl">
             🚨
           </div>
         </div>
       </Card>
       
       <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white transform hover:scale-105 transition-transform shadow-lg">
         <div className="flex items-center justify-between p-6">
           <div>
             <p className="text-green-100 text-sm font-medium">Em Dia</p>
             <p className="text-3xl font-bold mb-1">
               {dispositivos.filter(d => !d.necessita_manutencao).length}
             </p>
             <p className="text-green-200 text-xs">
               {((dispositivos.filter(d => !d.necessita_manutencao).length / Math.max(dispositivos.length, 1)) * 100).toFixed(1)}% do total
             </p>
           </div>
           <div className="w-16 h-16 bg-green-400 bg-opacity-30 rounded-full flex items-center justify-center text-2xl">
             ✅
           </div>
         </div>
       </Card>
       
       <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white transform hover:scale-105 transition-transform shadow-lg">
         <div className="flex items-center justify-between p-6">
           <div>
             <p className="text-blue-100 text-sm font-medium">Total de Dispositivos</p>
             <p className="text-3xl font-bold mb-1">{dispositivos.length}</p>
             <p className="text-blue-200 text-xs">
               Configurados para manutenção
             </p>
           </div>
           <div className="w-16 h-16 bg-blue-400 bg-opacity-30 rounded-full flex items-center justify-center text-2xl">
             📋
           </div>
         </div>
       </Card>

       <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white transform hover:scale-105 transition-transform shadow-lg">
         <div className="flex items-center justify-between p-6">
           <div>
             <p className="text-purple-100 text-sm font-medium">Taxa de Conformidade</p>
             <p className="text-3xl font-bold mb-1">
               {dispositivos.length > 0 
                 ? Math.round(((dispositivos.filter(d => !d.necessita_manutencao).length / dispositivos.length) * 100))
                 : 0
               }%
             </p>
             <p className="text-purple-200 text-xs">
               Dispositivos em dia
             </p>
           </div>
           <div className="w-16 h-16 bg-purple-400 bg-opacity-30 rounded-full flex items-center justify-center text-2xl">
             📊
           </div>
         </div>
       </Card>
     </div>

      
      {/* Navegação por Tabs Modernizada */}
      <Card className="overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dispositivos')}
              className={`group flex items-center py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'dispositivos'
                  ? 'border-blue-500 text-blue-600 bg-blue-50 rounded-t-lg'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100 rounded-lg'
              }`}
            >
              <span className="mr-2 text-lg">🔧</span>
              <span>Dispositivos</span>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${
                activeTab === 'dispositivos' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-600 group-hover:bg-gray-300'
              }`}>
                {paginationDispositivos.totalItems}
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('historico')}
              className={`group flex items-center py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'historico'
                  ? 'border-blue-500 text-blue-600 bg-blue-50 rounded-t-lg'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100 rounded-lg'
              }`}
            >
              <span className="mr-2 text-lg">📋</span>
              <span>Histórico</span>
            </button>
            
            {permissions.isSupervisorOrAbove() && (
              <button
                onClick={() => setActiveTab('metricas')}
                className={`group flex items-center py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'metricas'
                    ? 'border-blue-500 text-blue-600 bg-blue-50 rounded-t-lg'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-100 rounded-lg'
                }`}
              >
                <span className="mr-2 text-lg">📊</span>
                <span>Métricas</span>
                <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-600 font-medium">
                  PRO
                </span>
              </button>
            )}
          </nav>
        </div>

        {/* Conteúdo das Tabs */}
        <div className="p-6">
          {activeTab === 'dispositivos' && (
            <div className="space-y-6">
              {/* Header da Seção */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <span className="bg-blue-100 rounded-lg p-2 mr-3">🔧</span>
                    Dispositivos para Manutenção
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Gerencie as manutenções preventivas dos seus dispositivos
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center space-x-2 ${hasActiveFilters() ? 'bg-blue-50 text-blue-600 border-blue-300' : ''}`}
                  >
                    <span>🔍</span>
                    <span>{showFilters ? 'Ocultar' : 'Filtros'}</span>
                    {hasActiveFilters() && (
                      <span className="bg-blue-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">
                        {[searchTerm, statusFilter !== 'todos', tipoFilter !== 'todos'].filter(Boolean).length}
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={loadData}
                    disabled={loading}
                    className="flex items-center space-x-2 shadow-lg"
                  >
                    <span>{loading ? '⏳' : '🔄'}</span>
                    <span>Atualizar</span>
                  </Button>
                </div>
              </div>

              {/* Painel de Filtros */}
              {showFilters && (
                <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border border-blue-200">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <span className="mr-2">🔍</span>
                        Filtros e Busca
                      </h3>
                      {hasActiveFilters() && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={clearFilters}
                          className="text-red-600 hover:bg-red-50"
                        >
                          🗑️ Limpar Filtros
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Busca por DT ou Descrição */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Buscar por DT ou Descrição
                        </label>
                        <input
                          type="text"
                          placeholder="Digite o DT (ex: 292) ou descrição do dispositivo..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {searchTerm && (
                          <p className="text-xs text-gray-500 mt-1">
                            {dispositivosFiltrados.length} dispositivo{dispositivosFiltrados.length !== 1 ? 's' : ''} encontrado{dispositivosFiltrados.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>

                      {/* Filtro por Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                           Status da Manutenção
                        </label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as any)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="todos">Todos os Status</option>
                          <option value="necessita">🔴 Manutenção Necessária</option>
                          <option value="atencao">🟡 Atenção (71-90%)</option>
                          <option value="em_dia">🟢 Em Dia (≤70%)</option>
                        </select>
                      </div>

                      {/* Filtro por Tipo */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tipo de Intervalo
                        </label>
                        <select
                          value={tipoFilter}
                          onChange={(e) => setTipoFilter(e.target.value as any)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="todos">Todos os Tipos</option>
                          <option value="DIA">📅 Por Dias</option>
                          <option value="PLACA">🔢 Por Placas</option>
                        </select>
                      </div>
                    </div>

                    {/* Filtros Rápidos */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Filtros Rápidos:</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setStatusFilter('necessita');
                            setSearchTerm('');
                            setTipoFilter('todos');
                          }}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm hover:bg-red-200 transition-colors"
                        >
                          🔴 Só Necessárias
                        </button>
                        <button
                          onClick={() => {
                            setStatusFilter('atencao');
                            setSearchTerm('');
                            setTipoFilter('todos');
                          }}
                          className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm hover:bg-yellow-200 transition-colors"
                        >
                          🟡 Só Atenção
                        </button>
                        <button
                          onClick={() => {
                            setTipoFilter('DIA');
                            setStatusFilter('todos');
                            setSearchTerm('');
                          }}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                        >
                          📅 Só por Dias
                        </button>
                        <button
                          onClick={() => {
                            setTipoFilter('PLACA');
                            setStatusFilter('todos');
                            setSearchTerm('');
                          }}
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200 transition-colors"
                        >
                          🔢 Só por Placas
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Informações de Resultados */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="text-gray-700">
                      {hasActiveFilters() ? (
                        <>
                          Mostrando <span className="font-bold text-blue-600">
                            {((paginationDispositivos.currentPage - 1) * paginationDispositivos.itemsPerPage) + 1}
                          </span> - <span className="font-bold text-blue-600">
                            {Math.min(paginationDispositivos.currentPage * paginationDispositivos.itemsPerPage, paginationDispositivos.totalItems)}
                          </span> de <span className="font-bold text-blue-600">
                            {paginationDispositivos.totalItems}
                          </span> dispositivos filtrados
                          <span className="text-gray-500 ml-1">(de {dispositivos.length} total)</span>
                        </>
                      ) : (
                        <>
                          Mostrando <span className="font-bold text-gray-900">
                            {((paginationDispositivos.currentPage - 1) * paginationDispositivos.itemsPerPage) + 1}
                          </span> - <span className="font-bold text-gray-900">
                            {Math.min(paginationDispositivos.currentPage * paginationDispositivos.itemsPerPage, paginationDispositivos.totalItems)}
                          </span> de <span className="font-bold text-gray-900">
                            {paginationDispositivos.totalItems}
                          </span> dispositivos
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <label className="text-gray-600 font-medium">Itens por página:</label>
                    <select 
                      value={paginationDispositivos.itemsPerPage}
                      onChange={(e) => setPaginationDispositivos(prev => ({
                        ...prev,
                        itemsPerPage: parseInt(e.target.value),
                        currentPage: 1
                      }))}
                      className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium shadow-sm hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tabela Melhorada */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                <Table
                  columns={columnsDispositivos}
                  data={dispositivosPaginados as unknown as Record<string, unknown>[]}
                  loading={loading}
                  emptyMessage={
                    hasActiveFilters() 
                      ? "Nenhum dispositivo encontrado com os filtros aplicados. Tente ajustar os critérios de busca." 
                      : "Nenhum dispositivo com manutenção configurada"
                  }
                />

                {/* Paginação Modernizada */}
                {paginationDispositivos.totalPages > 1 && (
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <Pagination
                      pagination={paginationDispositivos}
                      onPageChange={handlePageChangeDispositivos}
                    />
                  </div>
                )}
              </div>

              {/* Resumo dos Filtros Aplicados */}
              {hasActiveFilters() && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-600 font-medium">🔍 Filtros ativos:</span>
                      <div className="flex flex-wrap gap-2">
                        {searchTerm && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                            Busca: "{searchTerm}"
                          </span>
                        )}
                        {statusFilter !== 'todos' && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                            Status: {statusFilter === 'necessita' ? '🔴 Necessária' : 
                                    statusFilter === 'atencao' ? '🟡 Atenção' : '🟢 Em Dia'}
                          </span>
                        )}
                        {tipoFilter !== 'todos' && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                            Tipo: {tipoFilter === 'DIA' ? '📅 Por Dias' : '🔢 Por Placas'}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={clearFilters}
                      className="text-blue-600 hover:bg-blue-100"
                    >
                      Limpar todos
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'historico' && (
            <HistoricoManutencoes />
          )}

          {activeTab === 'metricas' && permissions.isSupervisorOrAbove() && (
            <MetricasManutencao />
          )}
        </div>
      </Card>

      {/* Modal Iniciar Manutenção */}
      {showIniciarModal && dispositivoSelecionado && (
        <IniciarManutencaoModal
          dispositivo={dispositivoSelecionado}
          onClose={() => {
            setShowIniciarModal(false);
            setDispositivoSelecionado(null);
          }}
          onSuccess={handleManutencaoIniciada}
        />
      )}
    </div>
  );
};

export default Manutencao;