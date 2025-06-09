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
              dispositivo.necessita_manutencao ? 'bg-red-500 animate-pulse' : 'bg-green-500'
            }`} title={dispositivo.necessita_manutencao ? 'Manutenção necessária' : 'Em dia'} />
          </div>
        );
      }
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manutenção Preventiva</h1> 
        </div>
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            onClick={loadData}
            disabled={loading}
          >
            🔄 Atualizar
          </Button>
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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dispositivos')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dispositivos'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🔧 Dispositivos ({paginationDispositivos.totalItems})
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'historico'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📋 Histórico
          </button>
          {permissions.isSupervisorOrAbove() && (
            <button
              onClick={() => setActiveTab('metricas')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'metricas'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Métricas
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'dispositivos' && (
        <div className="space-y-4">
          

          {/* Tabela principal */}
          <Card>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Dispositivos para Manutenção
                </h2>
                <Button
                  variant="secondary"
                  onClick={loadData}
                  disabled={loading}
                  className="flex items-center space-x-2"
                >
                  <span>🔄</span>
                  <span>Atualizar</span>
                </Button>
              </div>

              {/* Status cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-600 text-sm font-medium">Manutenção Necessária</p>
                      <p className="text-2xl font-bold text-red-700">
                        {dispositivos.filter(d => d.necessita_manutencao).length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      🚨
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 text-sm font-medium">Em Dia</p>
                      <p className="text-2xl font-bold text-green-700">
                        {dispositivos.filter(d => !d.necessita_manutencao).length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      ✅
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 text-sm font-medium">Total</p>
                      <p className="text-2xl font-bold text-blue-700">{dispositivos.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      📋
                    </div>
                  </div>
                </div>
              </div>

              {/* Informações de paginação melhorada */}
              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <div>
                  Mostrando <span className="font-medium text-gray-900">
                    {((paginationDispositivos.currentPage - 1) * paginationDispositivos.itemsPerPage) + 1}
                  </span> até <span className="font-medium text-gray-900">
                    {Math.min(paginationDispositivos.currentPage * paginationDispositivos.itemsPerPage, paginationDispositivos.totalItems)}
                  </span> de <span className="font-medium text-gray-900">
                    {paginationDispositivos.totalItems}
                  </span> dispositivos
                </div>
                
                <div className="flex items-center space-x-2">
                  <span>Itens por página:</span>
                  <select 
                    value={paginationDispositivos.itemsPerPage}
                    onChange={(e) => setPaginationDispositivos(prev => ({
                      ...prev,
                      itemsPerPage: parseInt(e.target.value),
                      currentPage: 1
                    }))}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </div>

            <Table
              columns={columnsDispositivos}
              data={dispositivosPaginados as unknown as Record<string, unknown>[]}
              loading={loading}
              emptyMessage="Nenhum dispositivo com manutenção configurada"
            />

            {/* Paginação melhorada */}
            {paginationDispositivos.totalPages > 1 && (
              <div className="mt-6 border-t border-gray-200 pt-4">
                <Pagination
                  pagination={paginationDispositivos}
                  onPageChange={handlePageChangeDispositivos}
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'historico' && (
        <HistoricoManutencoes />
      )}

      {activeTab === 'metricas' && permissions.isSupervisorOrAbove() && (
        <MetricasManutencao />
      )}

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