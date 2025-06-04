import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Input, Select, Pagination, Modal } from '../components/ui';
import { ChamadoService, type TipoChamado, type StatusChamado, type Cliente } from '../services/chamadoService';
import { useSocket } from '../contexts/SocketContext';
import { useChamadosRealTime } from '../hooks/useChamadosRealTime';
import { useGlobalAttendance } from '../hooks/useGlobalAttendance';
import type { Chamado, FilterState, PaginationInfo } from '../types';
import ChamadoForm from '../components/forms/ChamadoForm';
import ChamadoAtendimento from '../components/chamados/ChamadoAtendimento';

const Chamados: React.FC = () => {
  const [initialChamados, setInitialChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: undefined,
    cliente: undefined,
    categoria: undefined,
    dataInicio: '',
    dataFim: '',
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingChamado, setEditingChamado] = useState<Chamado | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<Chamado | null>(null);
  const [atendimentoModalOpen, setAtendimentoModalOpen] = useState(false);

  // Dados auxiliares
  const [tipos, setTipos] = useState<TipoChamado[]>([]);
  const [status, setStatus] = useState<StatusChamado[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // Hooks
  const { 
    startAttendance,
    isUserInAttendance,
    currentAttendance
  } = useSocket();
  
  const { 
    chamados, 
    setChamados, 
    formatTimer,
    getTimer
  } = useChamadosRealTime(initialChamados);

  // Hook simplificado
  const { isInAttendance, attendanceChamado } = useGlobalAttendance();

  // EFEITO SIMPLES: Se está em atendimento e modal não está aberto, abrir
  useEffect(() => {
    if (isInAttendance && attendanceChamado && !atendimentoModalOpen) {
      console.log('🔄 Abrindo modal de atendimento');
      setAtendimentoModalOpen(true);
    }
  }, [isInAttendance, attendanceChamado, atendimentoModalOpen]);

  // Carregar dados auxiliares
  useEffect(() => {
    const loadAuxData = async () => {
      try {
        const [tiposData, statusData, clientesData] = await Promise.all([
          ChamadoService.getTipos(),
          ChamadoService.getStatus(),
          ChamadoService.getClientes()
        ]);
        setTipos(tiposData);
        setStatus(statusData);
        setClientes(clientesData);
      } catch (error) {
        console.error('Erro ao carregar dados auxiliares:', error);
      }
    };

    loadAuxData();
  }, []);

  // Carregar chamados
  const loadChamados = useCallback(async (page = 1, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await ChamadoService.getChamados(page, 10, filters);
      setInitialChamados(response.chamados);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Erro ao carregar chamados:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [filters]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      loadChamados(pagination.currentPage, false);
    }, 60000);
    return () => clearInterval(interval);
  }, [pagination.currentPage, loadChamados]);

  // Carregar na inicialização
  useEffect(() => {
    loadChamados();
  }, [loadChamados]);

  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value });
  };

  const handleFilter = (key: keyof FilterState, value: string | number | undefined) => {
    setFilters({ ...filters, [key]: value });
  };

  const handlePageChange = (page: number) => {
    loadChamados(page);
  };

  const handleNewChamado = () => {
    setEditingChamado(null);
    setModalOpen(true);
  };

  const handleViewChamado = async (chamado: Chamado) => {
    try {
      const chamadoAtualizado = await ChamadoService.getChamado(chamado.cha_id);
      setSelectedChamado(chamadoAtualizado);
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Erro ao buscar detalhes do chamado:', error);
      setSelectedChamado(chamado);
      setDetailModalOpen(true);
    }
  };

  const handleIniciarAtendimento = async (chamado: Chamado) => {
    if (isUserInAttendance) {
      alert(`Você já está atendendo o chamado #${currentAttendance?.chamadoId}. Finalize-o antes de atender outro.`);
      return;
    }

    const timer = getTimer(chamado.cha_id);
    if (timer) {
      alert(`Este chamado já está sendo atendido por ${timer.userName}`);
      return;
    }

    const attendanceData = await startAttendance(chamado.cha_id);
    if (!attendanceData) {
      console.log('❌ Falha ao iniciar atendimento');
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setDetailModalOpen(false);
    setAtendimentoModalOpen(false);
    setEditingChamado(null);
    setSelectedChamado(null);
  };

  const handleChamadoUpdated = (updatedChamado: Chamado) => {
    setChamados(prev => 
      prev.map(c => c.cha_id === updatedChamado.cha_id ? updatedChamado : c)
    );
    loadChamados(pagination.currentPage, false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.abs(minutes) % 60;
    const sign = minutes < 0 ? '-' : '';
    return `${sign}${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const canStartAttendance = (chamado: Chamado) => {
    if (chamado.cha_status !== 1) return false;
    const timer = getTimer(chamado.cha_id);
    if (timer) return false;
    if (isUserInAttendance) return false;
    return true;
  };

  const columns = [
    {
      key: 'plano_icon',
      label: '📋',
      className: 'w-12',
      render: (_: unknown, item: Chamado) => {
        if (item.cha_plano === 1) {
          return <span className="text-red-500 text-xl" title="Produto está contido no plano de produção">🔴</span>;
        } else if (item.cha_plano === 0) {
          return <span className="text-yellow-500 text-xl" title="Produto NÃO está contido no plano de produção">🟡</span>;
        } else {
          return <span className="text-blue-500 text-xl" title="Chamado de melhoria">🔵</span>;
        }
      }
    },
    {
      key: 'duracao_total',
      label: 'Duração Total',
      className: 'w-24',
      render: (_: unknown, item: Chamado) => {
        const now = new Date().getTime();
        const openTime = new Date(item.cha_data_hora_abertura).getTime();
        const diffInMinutes = Math.floor((now - openTime) / 60000);
        
        return (
          <span className={`font-mono font-bold ${diffInMinutes > 30 ? 'text-red-600' : diffInMinutes < 0 ? 'text-blue-600' : 'text-black'}`}>
            {formatDuration(diffInMinutes)}
          </span>
        );
      }
    },
    {
      key: 'tempo_atendimento',
      label: 'Atendimento',
      className: 'w-24',
      render: (_: unknown, item: Chamado) => {
        const timer = getTimer(item.cha_id);
        
        if (item.cha_status === 1) return <span className="text-gray-400">--:--</span>;
        
        if (timer) {
          return (
            <span className={`font-mono font-bold ${timer.seconds > 30 * 60 ? 'text-red-600' : 'text-blue-600'}`}>
              {formatTimer(timer.seconds)}
            </span>
          );
        }
        
        if (item.cha_status === 3 && item.cha_data_hora_atendimento && item.cha_data_hora_termino) {
          const startTime = new Date(item.cha_data_hora_atendimento).getTime();
          const endTime = new Date(item.cha_data_hora_termino).getTime();
          const diffInSeconds = Math.floor((endTime - startTime) / 1000);
          
          return (
            <span className="font-mono text-green-600">
              {formatTimer(diffInSeconds)}
            </span>
          );
        }
        
        return <span className="text-gray-400">--:--</span>;
      }
    },
    {
      key: 'cha_operador',
      label: 'Criado Por',
      className: 'w-32',
      render: (value: unknown) => <span className="text-sm">{String(value || 'N/A')}</span>
    },
    {
      key: 'tipo_chamado',
      label: 'Tipo de Chamado',
      className: 'w-40',
      render: (value: unknown) => <span className="text-sm">{String(value || 'Não informado')}</span>
    },
    {
      key: 'cliente_nome',
      label: 'Cliente',
      className: 'w-32',
      render: (value: unknown) => <span className="text-sm">{String(value || 'Não informado')}</span>
    },
    {
      key: 'produto_nome',
      label: 'Produto',
      className: 'w-32',
      render: (value: unknown) => <span className="text-sm">{String(value || 'N/A')}</span>
    },
    {
      key: 'status_info',
      label: 'Status',
      className: 'w-32',
      render: (_: unknown, item: Chamado) => {
        const statusMap = {
          1: { label: 'ABERTO', class: 'bg-yellow-100 text-yellow-800' },
          2: { label: 'EM ANDAMENTO', class: 'bg-blue-100 text-blue-800' },
          3: { label: 'FECHADO', class: 'bg-green-100 text-green-800' },
        };
        
        const statusInfo = statusMap[item.cha_status as keyof typeof statusMap] || { 
          label: 'DESCONHECIDO', 
          class: 'bg-gray-100 text-gray-800' 
        };
        
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusInfo.class}`}>
            {statusInfo.label}
          </span>
        );
      }
    },
    {
      key: 'suporte_responsavel',
      label: 'Suporte Responsável',
      className: 'w-40',
      render: (_: unknown, item: Chamado) => {
        const timer = getTimer(item.cha_id);
        
        if (timer) {
          const isMyAttendance = timer.userId === currentAttendance?.userId;
          return (
            <div className="space-y-1">
              <span className={`text-sm font-medium ${isMyAttendance ? 'text-blue-600' : 'text-gray-700'}`}>
                {timer.userName} {isMyAttendance ? '(Você)' : ''}
              </span>
              <div className={`text-xs font-mono ${timer.seconds > 30 * 60 ? 'text-red-600' : 'text-blue-600'}`}>
                ⏱️ {formatTimer(timer.seconds)}
              </div>
            </div>
          );
        }

        return <span className="text-sm text-gray-500">Não atribuído</span>;
      }
    },
    {
      key: 'cha_descricao',
      label: 'Descrição do Chamado',
      render: (value: unknown) => (
        <div className="max-w-xs">
          <span className="text-sm line-clamp-2" title={String(value || '')}>
            {String(value || '')}
          </span>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (_: unknown, item: Chamado) => {
        const timer = getTimer(item.cha_id);
        const isBeingAttended = !!timer;
        const canStart = canStartAttendance(item);
        const isMyAttendance = timer?.userId === currentAttendance?.userId;

        return (
          <div className="flex space-x-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleViewChamado(item)}
              title="Ver Detalhes"
              className="!px-2 !py-1 !text-xs"
            >
              👁️
            </Button>
            
            {item.cha_status === 1 && (
              <Button
                size="sm"
                variant={canStart ? "success" : "secondary"}
                onClick={() => canStart && handleIniciarAtendimento(item)}
                disabled={!canStart}
                title={
                  isBeingAttended
                    ? `Sendo atendido por ${timer.userName}`
                    : isUserInAttendance 
                    ? `Você está atendendo chamado #${currentAttendance?.chamadoId}`
                    : canStart
                    ? 'Atender Chamado'
                    : 'Não disponível'
                }
                className="!px-2 !py-1 !text-xs"
              >
                {isBeingAttended ? '🔒' : canStart ? '🚀' : '🚫'}
              </Button>
            )}

            {item.cha_status === 2 && isBeingAttended && (
              <div 
                className={`px-2 py-1 text-xs rounded border ${
                  isMyAttendance 
                    ? 'bg-blue-100 text-blue-700 border-blue-300' 
                    : 'bg-gray-100 text-gray-700 border-gray-300'
                }`}
                title={isMyAttendance ? 'Seu atendimento' : `Atendido por ${timer.userName}`}
              >
                {isMyAttendance ? '🔵 Você' : `👤 ${timer.userName}`}
              </div>
            )}
          </div>
        );
      },
      className: 'w-32',
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Suporte à Linha</h1>
          <div className="flex items-center space-x-4 mt-1">
            <p className="text-sm text-secondary-600">
              {pagination.totalItems === 1 ? '1 Chamado' : `${pagination.totalItems} Chamados`}
            </p>
            {isInAttendance && attendanceChamado && (
              <div className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                <span>Atendendo chamado #{attendanceChamado.cha_id}</span>
                {!atendimentoModalOpen && (
                  <button 
                    onClick={() => setAtendimentoModalOpen(true)}
                    className="ml-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Abrir
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="secondary"
            onClick={() => loadChamados(pagination.currentPage)}
            disabled={loading}
          >
            🔄 Atualizar
          </Button>
          <Button 
            onClick={handleNewChamado}
            disabled={isUserInAttendance}
            title={isUserInAttendance ? 'Finalize o atendimento atual primeiro' : 'Criar novo chamado'}
          >
            Novo Chamado
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <Input
            placeholder="Buscar chamados..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <Select
            placeholder="Status"
            value={filters.status || ''}
            onChange={(value) => handleFilter('status', value === '' ? undefined : Number(value))}
            options={[
              { value: '', label: 'Todos os status' },
              ...status.map(s => ({ value: s.stc_id, label: s.stc_descricao }))
            ]}
          />
          <Select
            placeholder="Cliente"
            value={filters.cliente || ''}
            onChange={(value) => handleFilter('cliente', value === '' ? undefined : Number(value))}
            options={[
              { value: '', label: 'Todos os clientes' },
              ...clientes.map(c => ({ value: c.cli_id, label: c.cli_nome }))
            ]}
          />
          <Select
            placeholder="Tipo"
            value={filters.categoria || ''}
            onChange={(value) => handleFilter('categoria', value === '' ? undefined : Number(value))}
            options={[
              { value: '', label: 'Todos os tipos' },
              ...tipos.map(t => ({ value: t.tch_id, label: t.tch_descricao }))
            ]}
          />
          <Input
            type="date"
            placeholder="Data início"
            value={filters.dataInicio}
            onChange={(e) => handleFilter('dataInicio', e.target.value)}
          />
          <Input
            type="date"
            placeholder="Data fim"
            value={filters.dataFim}
            onChange={(e) => handleFilter('dataFim', e.target.value)}
          />
        </div>
      </Card>

      {/* Tabela */}
      <Card>
        <Table
          columns={columns}
          data={chamados}
          loading={loading}
          emptyMessage="Nenhum chamado encontrado"
        />
        {pagination.totalPages > 1 && (
          <Pagination
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        )}
      </Card>

      {/* Modal de Form */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingChamado ? 'Editar Chamado' : 'Novo Chamado'}
        size="lg"
      >
        <ChamadoForm
          chamado={editingChamado}
          onSubmit={() => {
            handleCloseModal();
            loadChamados(pagination.currentPage);
          }}
          onCancel={handleCloseModal}
        />
      </Modal>

      {/* Modal de Detalhes */}
      <Modal
        isOpen={detailModalOpen}
        onClose={handleCloseModal}
        title={`Chamado #${selectedChamado?.cha_id}`}
        size="lg"
      >
        {selectedChamado && (
          <div className="space-y-4">
            {getTimer(selectedChamado.cha_id) && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></span>
                    <span className="font-medium text-blue-800">Atendimento em andamento</span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-blue-900">
                    {formatTimer(getTimer(selectedChamado.cha_id)!.seconds)}
                  </div>
                </div>
                <p className="text-sm text-blue-700 mt-2">
                  Por: {getTimer(selectedChamado.cha_id)!.startedBy}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">DT:</label>
                <p className="text-secondary-900">{selectedChamado.cha_DT}</p>
              </div>
              <div>
                <label className="form-label">Status:</label>
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  selectedChamado.cha_status === 1 ? 'bg-yellow-100 text-yellow-800' :
                  selectedChamado.cha_status === 2 ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {selectedChamado.cha_status === 1 ? 'ABERTO' :
                   selectedChamado.cha_status === 2 ? 'EM ANDAMENTO' : 'FECHADO'}
                </span>
              </div>
              <div>
                <label className="form-label">Cliente:</label>
                <p className="text-secondary-900">{selectedChamado.cliente_nome || 'Não informado'}</p>
              </div>
              <div>
                <label className="form-label">Tipo:</label>
                <p className="text-secondary-900">{selectedChamado.tipo_chamado || 'Não informado'}</p>
              </div>
              <div>
                <label className="form-label">Produto:</label>
                <p className="text-secondary-900">{selectedChamado.produto_nome || 'N/A'}</p>
              </div>
              <div>
                <label className="form-label">Operador:</label>
                <p className="text-secondary-900">{selectedChamado.cha_operador}</p>
              </div>
              <div>
                <label className="form-label">Data Abertura:</label>
                <p className="text-secondary-900">{formatDate(selectedChamado.cha_data_hora_abertura)}</p>
              </div>
            </div>
            <div>
              <label className="form-label">Descrição:</label>
              <p className="text-secondary-900 whitespace-pre-wrap">{selectedChamado.cha_descricao}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Atendimento */}
      <Modal
        isOpen={atendimentoModalOpen}
        onClose={handleCloseModal}
        title={`Atendimento - Chamado #${attendanceChamado?.cha_id}`}
        size="xl"
        preventClose={true}
      >
        {attendanceChamado && (
          <ChamadoAtendimento
            chamado={attendanceChamado}
            onFinish={(updatedChamado) => {
              handleChamadoUpdated(updatedChamado);
              handleCloseModal();
            }}
            onCancel={handleCloseModal}
          />
        )}
      </Modal>
    </div>
  );
};

export default Chamados;