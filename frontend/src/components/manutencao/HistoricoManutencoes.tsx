/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Input, Select } from '../ui';
import Pagination from '../ui/Pagination';
import { ManutencaoService, type ManutencaoPreventiva } from '../../services/manutencaoService';
import DetalhesManutencaoModal from './DetalhesManutencaoModal';
import type { PaginationInfo } from '../../types';

interface FiltersState {
  dataInicio: string;
  dataFim: string;
  dispositivo: string;
  colaborador: string;
  status: string;
}

const HistoricoManutencoes: React.FC = () => {
  const [manutencoes, setManutencoes] = useState<ManutencaoPreventiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedManutencao, setSelectedManutencao] = useState<number | null>(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filtros, setFiltros] = useState<FiltersState>({
    dataInicio: '',
    dataFim: '',
    dispositivo: '',
    colaborador: '',
    status: ''
  });

  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 15,
  });

  const loadHistorico = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await ManutencaoService.getHistoricoManutencoes({
        dataInicio: filtros.dataInicio || undefined,
        dataFim: filtros.dataFim || undefined,
        dispositivo: filtros.dispositivo ? parseInt(filtros.dispositivo) : undefined,
        status: filtros.status ? parseInt(filtros.status) : undefined,
      });
      
      setManutencoes(data);
      setPagination(prev => ({
        ...prev,
        totalItems: data.length,
        totalPages: Math.ceil(data.length / prev.itemsPerPage)
      }));
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setError('Erro ao carregar histórico de manutenções. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    loadHistorico();
  }, [loadHistorico, pagination.currentPage]);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({
      ...prev,
      currentPage: page
    }));
  };

  const handleVerDetalhes = (manutencaoId: number) => {
    setSelectedManutencao(manutencaoId);
    setShowDetalhes(true);
  };

  const clearFilters = () => {
    setFiltros({ 
      dataInicio: '', 
      dataFim: '', 
      dispositivo: '', 
      colaborador: '', 
      status: '' 
    });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const applyQuickFilter = (days: number, label: string) => {
    const hoje = new Date();
    const dataFim = hoje.toISOString().split('T')[0];
    const dataInicio = new Date(hoje.setDate(hoje.getDate() - days)).toISOString().split('T')[0];
    
    setFiltros(prev => ({
      ...prev,
      dataInicio,
      dataFim
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const formatDuracao = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    
    if (horas > 0) {
      return `${horas}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const getStatusStats = () => {
    const stats = {
      total: manutencoes.length,
      finalizadas: manutencoes.filter(m => m.lmd_status === 2).length,
      emAndamento: manutencoes.filter(m => m.lmd_status === 1).length,
      canceladas: manutencoes.filter(m => m.lmd_status === 3).length
    };
    return stats;
  };

  const hasActiveFilters = () => {
    return Object.values(filtros).some(value => value !== '');
  };

  // Paginação local
  const paginatedData = manutencoes.slice(
    (pagination.currentPage - 1) * pagination.itemsPerPage,
    pagination.currentPage * pagination.itemsPerPage
  );

  const columns = [
    {
      key: 'lmd_id',
      label: 'ID',
      className: 'w-20',
      render: (value: unknown) => (
        <div className="font-mono text-sm font-bold text-blue-600">
          #{String(value)}
        </div>
      )
    },
    {
      key: 'lmd_dispositivo',
      label: 'Dispositivo',
      render: (value: unknown, item: Record<string, unknown>) => {
        const manutencao = item as unknown as ManutencaoPreventiva;
        const dtFormatado = String(value || '').padStart(6, '0');
        return (
          <div className="flex flex-col">
            <span className="font-mono text-sm font-bold text-gray-900">
              DT {dtFormatado}
            </span>
            <span className="text-xs text-gray-600 truncate max-w-[200px]">
              {manutencao.dispositivo_descricao || 'Não informado'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'colaborador_nome',
      label: 'Responsável',
      className: 'w-40',
      render: (value: unknown) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-blue-600">
              {String(value || '').charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-900 truncate">
            {String(value || 'Não informado')}
          </span>
        </div>
      )
    },
    {
      key: 'lmd_data_hora_inicio',
      label: 'Período',
      className: 'w-44',
      render: (value: unknown, item: Record<string, unknown>) => {
        const manutencao = item as unknown as ManutencaoPreventiva;
        const inicio = new Date(String(value));
        const fim = manutencao.lmd_data_hora_fim ? new Date(manutencao.lmd_data_hora_fim) : null;
        
        return (
          <div className="text-xs space-y-1">
            <div className="flex items-center space-x-1">
              <span className="text-green-600">▶</span>
              <span className="font-medium">
                {inicio.toLocaleDateString('pt-BR')} {inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {fim ? (
              <div className="flex items-center space-x-1">
                <span className="text-red-600">⏹</span>
                <span className="text-gray-600">
                  {fim.toLocaleDateString('pt-BR')} {fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <span className="text-blue-600 animate-pulse">●</span>
                <span className="text-blue-600 font-medium">Em andamento</span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'duracao_total',
      label: 'Duração',
      className: 'w-24',
      render: (value: unknown, item: Record<string, unknown>) => {
        const manutencao = item as unknown as ManutencaoPreventiva;
        const minutos = Number(value) || 0;
        const isActive = manutencao.lmd_status === 1;
        
        return (
          <div className={`font-mono text-sm font-bold ${
            isActive ? 'text-blue-600' : 'text-gray-900'
          }`}>
            {formatDuracao(minutos)}
          </div>
        );
      }
    },
    {
      key: 'lmd_status',
      label: 'Status',
      className: 'w-32',
      render: (value: unknown) => {
        const status = Number(value);
        const configs = {
          1: { 
            label: 'Em Andamento', 
            class: 'bg-blue-100 text-blue-800 border border-blue-300',
            icon: '🔄'
          },
          2: { 
            label: 'Finalizada', 
            class: 'bg-green-100 text-green-800 border border-green-300',
            icon: '✅'
          },
          3: { 
            label: 'Cancelada', 
            class: 'bg-red-100 text-red-800 border border-red-300',
            icon: '❌'
          }
        };
        
        const config = configs[status as keyof typeof configs] || { 
          label: 'Desconhecido', 
          class: 'bg-gray-100 text-gray-800 border border-gray-300',
          icon: '❓'
        };
        
        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${config.class}`}>
            <span className="mr-1">{config.icon}</span>
            {config.label}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Ações',
      className: 'w-32',
      render: (_: unknown, item: Record<string, unknown>) => {
        const manutencao = item as unknown as ManutencaoPreventiva;
        return (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleVerDetalhes(manutencao.lmd_id)}
            className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
          >
            👁️ Detalhes
          </Button>
        );
      }
    }
  ];

  const stats = getStatusStats();

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadHistorico} variant="primary">
            🔄 Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Estatísticas */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">📋 Histórico de Manutenções</h1>
            <p className="text-indigo-100">
              Acompanhe todas as manutenções realizadas e seu histórico completo
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-sm text-indigo-100">Total de registros</div>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Finalizadas</p>
              <p className="text-2xl font-bold">{stats.finalizadas}</p>
            </div>
            <div className="w-12 h-12 bg-green-400 bg-opacity-30 rounded-full flex items-center justify-center text-xl">
              ✅
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Em Andamento</p>
              <p className="text-2xl font-bold">{stats.emAndamento}</p>
            </div>
            <div className="w-12 h-12 bg-blue-400 bg-opacity-30 rounded-full flex items-center justify-center text-xl">
              🔄
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Canceladas</p>
              <p className="text-2xl font-bold">{stats.canceladas}</p>
            </div>
            <div className="w-12 h-12 bg-red-400 bg-opacity-30 rounded-full flex items-center justify-center text-xl">
              ❌
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Taxa de Sucesso</p>
              <p className="text-2xl font-bold">
                {stats.total > 0 ? Math.round((stats.finalizadas / stats.total) * 100) : 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-400 bg-opacity-30 rounded-full flex items-center justify-center text-xl">
              📊
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros Avançados */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-gray-900">🔍 Filtros e Busca</h3>
              {hasActiveFilters() && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  Filtros ativos
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? '📁 Ocultar' : '📂 Expandir'} Filtros
              </Button>
              <Button
                variant="secondary"
                onClick={loadHistorico}
                disabled={loading}
              >
                {loading ? '⏳' : '🔄'} Atualizar
              </Button>
            </div>
          </div>

          {/* Filtros Rápidos */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => applyQuickFilter(1, 'Hoje')}
              className="px-3 py-2 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-800 rounded-lg text-sm font-medium transition-colors"
            >
              📅 Hoje
            </button>
            <button
              onClick={() => applyQuickFilter(7, 'Últimos 7 dias')}
              className="px-3 py-2 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-800 rounded-lg text-sm font-medium transition-colors"
            >
              📊 Últimos 7 dias
            </button>
            <button
              onClick={() => applyQuickFilter(30, 'Últimos 30 dias')}
              className="px-3 py-2 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-800 rounded-lg text-sm font-medium transition-colors"
            >
              🗓️ Últimos 30 dias
            </button>
            <button
              onClick={() => applyQuickFilter(90, 'Últimos 90 dias')}
              className="px-3 py-2 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-800 rounded-lg text-sm font-medium transition-colors"
            >
              📋 Últimos 90 dias
            </button>
          </div>

          {/* Filtros Detalhados */}
          {showFilters && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                  label="📅 Data Início"
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) => setFiltros(prev => ({ ...prev, dataInicio: e.target.value }))}
                />
                
                <Input
                  label="📅 Data Fim"
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => setFiltros(prev => ({ ...prev, dataFim: e.target.value }))}
                />

                <Select
                  label="📊 Status"
                  value={filtros.status}
                  onChange={(value) => setFiltros(prev => ({ ...prev, status: String(value) }))}
                  options={[
                    { value: '', label: 'Todos os status' },
                    { value: 1, label: '🔄 Em Andamento' },
                    { value: 2, label: '✅ Finalizada' },
                    { value: 3, label: '❌ Cancelada' }
                  ]}
                />

                <div className="flex items-end">
                  <Button
                    variant="secondary"
                    onClick={clearFilters}
                    className="w-full hover:bg-red-50 hover:text-red-600"
                    disabled={!hasActiveFilters()}
                  >
                    🗑️ Limpar Filtros
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Tabela Principal */}
      <Card>
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              📋 Registros de Manutenção
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {pagination.totalItems} registro{pagination.totalItems !== 1 ? 's' : ''} encontrado{pagination.totalItems !== 1 ? 's' : ''}
              {hasActiveFilters() && ' (filtrado)'}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Select
              value={pagination.itemsPerPage}
              onChange={(value) => setPagination(prev => ({ 
                ...prev, 
                itemsPerPage: Number(value),
                currentPage: 1,
                totalPages: Math.ceil(prev.totalItems / Number(value))
              }))}
              options={[
                { value: 10, label: '10 por página' },
                { value: 15, label: '15 por página' },
                { value: 25, label: '25 por página' },
                { value: 50, label: '50 por página' }
              ]}
            />
          </div>
        </div>
        
        <Table
          columns={columns}
          data={paginatedData as unknown as Record<string, unknown>[]}
          loading={loading}
          emptyMessage={
            hasActiveFilters() 
              ? "Nenhuma manutenção encontrada com os filtros aplicados" 
              : "Nenhuma manutenção registrada ainda"
          }
        />
        
        {pagination.totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </Card>

      {/* Modal Detalhes */}
      {showDetalhes && selectedManutencao && (
        <DetalhesManutencaoModal
          manutencaoId={selectedManutencao}
          onClose={() => {
            setShowDetalhes(false);
            setSelectedManutencao(null);
          }}
        />
      )}
    </div>
  );
};

export default HistoricoManutencoes;