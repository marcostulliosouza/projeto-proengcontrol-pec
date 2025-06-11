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
      totalItems: dispositivos.length,
      totalPages: Math.ceil(dispositivos.length / prev.itemsPerPage),
      currentPage: 1 // Reset para primeira página quando dados mudarem
    }));
  }, [dispositivos]);

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
  const getPercentualManutencao = (percentual: number) => {
    if (percentual <= 70) {
      return 'bg-green-500';
    } else if (percentual <= 90) {
      return 'bg-yellow-500';
    } else {
      return 'bg-red-500 animate-pulse';
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

  // Paginação local para dispositivos
  const dispositivosPaginados = dispositivos.slice(
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
        return (
          <div className="flex items-center justify-center">
            <div className={`w-3 h-3 rounded-full ${
              getPercentualManutencao(dispositivo.percentual_manutencao)
            }`} title={dispositivo.necessita_manutencao ? 'Manutenção necessária' : 'Em dia'} />
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
                <Button
                  variant="primary"
                  onClick={loadData}
                  disabled={loading}
                  className="flex items-center space-x-2 shadow-lg"
                >
                  <span>{loading ? '⏳' : '🔄'}</span>
                  <span>Atualizar Lista</span>
                </Button>
              </div>

              {/* Informações de Paginação Modernizada */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="text-gray-700">
                      Mostrando <span className="font-bold text-gray-900">
                        {((paginationDispositivos.currentPage - 1) * paginationDispositivos.itemsPerPage) + 1}
                      </span> - <span className="font-bold text-gray-900">
                        {Math.min(paginationDispositivos.currentPage * paginationDispositivos.itemsPerPage, paginationDispositivos.totalItems)}
                      </span> de <span className="font-bold text-gray-900">
                        {paginationDispositivos.totalItems}
                      </span> dispositivos
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
                  emptyMessage="Nenhum dispositivo com manutenção configurada"
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