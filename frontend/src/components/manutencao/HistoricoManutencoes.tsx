import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Select } from '../ui';
import Pagination from '../ui/Pagination';
import { ManutencaoService, type ManutencaoPreventiva } from '../../services/manutencaoService';
import DetalhesManutencaoModal from './DetalhesManutencaoModal';
import type { PaginationInfo } from '../../types';

const HistoricoManutencoes: React.FC = () => {
  const [manutencoes, setManutencoes] = useState<ManutencaoPreventiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedManutencao, setSelectedManutencao] = useState<number | null>(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [filtros, setFiltros] = useState({
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
    itemsPerPage: 10,
  });

  useEffect(() => {
    loadHistorico();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, pagination.currentPage]);

  const loadHistorico = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

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

  const formatDuracao = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    
    if (horas > 0) {
      return `${horas}h ${mins}min`;
    }
    return `${mins}min`;
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
      className: 'w-16',
      render: (value: unknown) => `#${value}`
    },
    {
      key: 'dispositivo_descricao',
      label: 'Dispositivo',
      render: (value: unknown) => (
        <span className="font-medium text-gray-900">{String(value || '')}</span>
      )
    },
    {
      key: 'colaborador_nome',
      label: 'Colaborador',
      className: 'w-40',
      render: (value: unknown) => String(value || '')
    },
    {
      key: 'lmd_data_hora_inicio',
      label: 'Início',
      className: 'w-36',
      render: (value: unknown) => {
        const date = new Date(String(value));
        return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
    },
    {
      key: 'lmd_data_hora_fim',
      label: 'Fim',
      className: 'w-36',
      render: (value: unknown) => {
        if (!value) return <span className="text-gray-400">Em andamento</span>;
        const date = new Date(String(value));
        return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
    },
    {
      key: 'duracao_total',
      label: 'Duração',
      className: 'w-24',
      render: (value: unknown) => {
        const minutos = Number(value) || 0;
        return formatDuracao(minutos);
      }
    },
    {
      key: 'lmd_status',
      label: 'Status',
      className: 'w-32',
      render: (value: unknown) => {
        const status = Number(value);
        const configs = {
          1: { label: 'Em Andamento', class: 'bg-blue-100 text-blue-800' },
          2: { label: 'Finalizada', class: 'bg-green-100 text-green-800' },
          3: { label: 'Cancelada', class: 'bg-red-100 text-red-800' }
        };
        
        const config = configs[status as keyof typeof configs] || { label: 'Desconhecido', class: 'bg-gray-100 text-gray-800' };
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}`}>
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
          >
            👁️ Ver Detalhes
          </Button>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="Data Início"
            type="date"
            value={filtros.dataInicio}
            onChange={(e) => setFiltros(prev => ({ ...prev, dataInicio: e.target.value }))}
          />
          
          <Input
            label="Data Fim"
            type="date"
            value={filtros.dataFim}
            onChange={(e) => setFiltros(prev => ({ ...prev, dataFim: e.target.value }))}
          />

          <Select
            label="Status"
            value={filtros.status}
            onChange={(value) => setFiltros(prev => ({ ...prev, status: String(value) }))}
            options={[
              { value: '', label: 'Todos' },
              { value: 1, label: 'Em Andamento' },
              { value: 2, label: 'Finalizada' },
              { value: 3, label: 'Cancelada' }
            ]}
          />

          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={() => {
                setFiltros({ dataInicio: '', dataFim: '', dispositivo: '', colaborador: '', status: '' });
                setPagination(prev => ({ ...prev, currentPage: 1 }));
              }}
              className="w-full"
            >
              🗑️ Limpar Filtros
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabela */}
      <Card>
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Histórico de Manutenções ({pagination.totalItems})
          </h3>
          <Button
            variant="secondary"
            onClick={loadHistorico}
            disabled={loading}
          >
            🔄 Atualizar
          </Button>
        </div>
        
        <Table
          columns={columns}
          data={paginatedData as unknown as Record<string, unknown>[]}
          loading={loading}
          emptyMessage="Nenhuma manutenção encontrada"
        />
        
        {pagination.totalPages > 1 && (
          <Pagination
            pagination={pagination}
            onPageChange={handlePageChange}
          />
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