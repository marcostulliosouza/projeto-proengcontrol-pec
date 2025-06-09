import React, { useState, useEffect } from 'react';
import { Card, Button, Table } from '../components/ui';
import { ManutencaoService, type DispositivoManutencao, type ManutencaoPreventiva } from '../services/manutencaoService';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../types/permissions';
import ManutencaoAtiva from '../components/manutencao/ManutencaoAtiva';
import IniciarManutencaoModal from '../components/manutencao/IniciarManutencaoModal';
import HistoricoManutencoes from '../components/manutencao/HistoricoManutencoes';
import MetricasManutencao  from '../components/manutencao/MetricasManutencao';

const Manutencao: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dispositivos' | 'historico' | 'metricas'>('dispositivos');
  const [dispositivos, setDispositivos] = useState<DispositivoManutencao[]>([]);
  const [manutencaoAtiva, setManutencaoAtiva] = useState<ManutencaoPreventiva | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIniciarModal, setShowIniciarModal] = useState(false);
  const [dispositivoSelecionado, setDispositivoSelecionado] = useState<DispositivoManutencao | null>(null);

  const { state: authState } = useAuth();
  const permissions = usePermissions(authState.user?.categoria);

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

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
          <div className="flex items-center space-x-4 mt-1">
            <p className="text-sm text-gray-600">
              {dispositivos.filter(d => d.necessita_manutencao).length} dispositivos precisam de manutenção
            </p>
            {manutencaoAtiva && (
              <div className="flex items-center space-x-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                <span>Manutenção em andamento: {manutencaoAtiva.dispositivo_descricao}</span>
              </div>
            )}
          </div>
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
            🔧 Dispositivos ({dispositivos.length})
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
        <Card>
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Dispositivos para Manutenção
            </h2>
            <div className="flex space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                {dispositivos.filter(d => d.necessita_manutencao).length} Precisam de Manutenção
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                {dispositivos.filter(d => !d.necessita_manutencao).length} Em Dia
              </span>
            </div>
          </div>
          <Table
            columns={columnsDispositivos}
            data={dispositivos as unknown as Record<string, unknown>[]}
            loading={loading}
            emptyMessage="Nenhum dispositivo com manutenção configurada"
          />
        </Card>
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