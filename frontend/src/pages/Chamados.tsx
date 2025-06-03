import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Select, Pagination, Modal } from '../components/ui';
import { ChamadoService, type TipoChamado, type StatusChamado, type Cliente } from '../services/chamadoService';
import { useSocket } from '../contexts/SocketContext';
import { useChamadosRealTime } from '../hooks/useChamadosRealTime';
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
  const [chamadoAtendimento, setChamadoAtendimento] = useState<Chamado | null>(null);

  // Dados auxiliares
  const [tipos, setTipos] = useState<TipoChamado[]>([]);
  const [status, setStatus] = useState<StatusChamado[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // Hooks para tempo real
  const { 
  lockChamado, 
    unlockChamado, 
    emitChamadoUpdate,
    startAttendance,        // NOVO
    isUserInAttendance,     // NOVO
    currentAttendance       // NOVO
  } = useSocket();
  const { 
    chamados, 
    setChamados, 
    isLocked, 
    getTimer, 
    formatTimer 
  } = useChamadosRealTime(initialChamados);

  // Auto-refresh a cada 30 segundos para sincronizar
  useEffect(() => {
    const interval = setInterval(() => {
      loadChamados(pagination.currentPage, false);
    }, 30000);

    return () => clearInterval(interval);
  }, [pagination.currentPage, filters]);

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

  // Verificar se usuário tem atendimento ativo ao carregar página
  useEffect(() => {
    if (isUserInAttendance && currentAttendance && !atendimentoModalOpen) {
      // Usuário tem atendimento ativo mas modal não está aberto
      // Buscar o chamado e abrir modal
      const loadActiveAttendance = async () => {
        try {
          const chamado = await ChamadoService.getChamado(currentAttendance.chamadoId);
          setChamadoAtendimento(chamado);
          setAtendimentoModalOpen(true);
        } catch (error) {
          console.error('Erro ao recuperar atendimento ativo:', error);
        }
      };

      loadActiveAttendance();
    }
  }, [isUserInAttendance, currentAttendance, atendimentoModalOpen]);

  // Carregar chamados
  const loadChamados = async (page = 1, showLoading = true) => {
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
  };

  useEffect(() => {
    loadChamados();
  }, [filters]);

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

  const handleEditChamado = async (chamado: Chamado) => {
    // Verificar se usuário está ocupado
    if (isUserInAttendance && currentAttendance?.chamadoId !== chamado.cha_id) {
      alert(`Você está atendendo chamado #${currentAttendance?.chamadoId}. Finalize-o antes de editar outro.`);
      return;
    }

    // Verificar se está sendo atendido por outro usuário
    const timer = getTimer(chamado.cha_id);
    if (timer) {
      alert('Este chamado está sendo atendido por outro usuário.');
      return;
    }

    // Verificar lock para edição
    const locked = await lockChamado(chamado.cha_id);
    
    if (locked) {
      setEditingChamado(chamado);
      setModalOpen(true);
    } else {
      const lockInfo = isLocked(chamado.cha_id);
      alert(`Este chamado está sendo usado por ${lockInfo?.lockedBy.userName || 'outro usuário'}`);
    }
  };

  const handleViewChamado = async (chamado: Chamado) => {
    // Verificar se está sendo atendido (permitir visualizar)
    const timer = getTimer(chamado.cha_id);
    if (timer) {
      // Chamado está sendo atendido, mas permite visualizar
      setSelectedChamado(chamado);
      setDetailModalOpen(true);
      return;
    }

    // Verificar lock apenas para visualização (não atendimento)
    const lockInfo = isLocked(chamado.cha_id);
    const isBeingViewed = lockInfo && !timer; // Lock existe mas não há timer (= visualização)
    
    if (isBeingViewed) {
      alert(`Este chamado está sendo visualizado por ${lockInfo?.lockedBy.userName}`);
      return;
    }

    // Fazer lock para visualização
    const locked = await lockChamado(chamado.cha_id);
    
    if (locked) {
      setSelectedChamado(chamado);
      setDetailModalOpen(true);
    } else {
      alert('Não foi possível abrir o chamado. Tente novamente.');
    }
  };

  const handleIniciarAtendimento = async (chamado: Chamado) => {
    // Verificar se usuário já está atendendo
    if (isUserInAttendance) {
      alert(`Você já está atendendo o chamado #${currentAttendance?.chamadoId}. Finalize-o antes de atender outro.`);
      return;
    }

    // Iniciar atendimento (isso já faz o lock automaticamente)
    const attendanceData = await startAttendance(chamado.cha_id);
    
    if (attendanceData) {
      setChamadoAtendimento(chamado);
      setAtendimentoModalOpen(true);
    } else {
      alert('Não foi possível iniciar o atendimento. Chamado pode estar sendo atendido por outro usuário.');
    }
  };

  const handleCloseModal = (chamadoId?: number) => {
    if (chamadoId) {
      unlockChamado(chamadoId);
    }
    setModalOpen(false);
    setDetailModalOpen(false);
    setAtendimentoModalOpen(false);
    setEditingChamado(null);
    setSelectedChamado(null);
    setChamadoAtendimento(null);
  };

  const handleChamadoUpdated = (updatedChamado: Chamado) => {
    // Emitir atualização para outros usuários - CORRIGIDO
    emitChamadoUpdate(updatedChamado);
    
    // Atualizar localmente
    setChamados(prev => 
      prev.map(c => c.cha_id === updatedChamado.cha_id ? updatedChamado : c)
    );
    // Recarregar lista para sincronizar
    loadChamados(pagination.currentPage, false);
  };

  const getStatusBadge = (status: number, chamadoId: number) => {
    const timer = getTimer(chamadoId);
    const statusMap = {
      1: { label: 'Aberto', class: 'status-warning' },
      2: { label: 'Em Andamento', class: 'status-info' },
      3: { label: 'Fechado', class: 'status-success' },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { 
      label: 'Desconhecido', 
      class: 'status-secondary' 
    };
    
    return (
      <div className="flex flex-col">
        <span className={`status-badge ${statusInfo.class} mb-1`}>
          {statusInfo.label}
        </span>
        {timer && (
          <span className="text-xs text-blue-600 font-mono bg-blue-50 px-1 rounded">
            ⏱️ {formatTimer(timer.seconds)}
          </span>
        )}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const isUserAttending = (chamadoId: number) => {
    const timer = getTimer(chamadoId);
    if (timer) {
      return timer.startedBy; // Retorna quem está atendendo
    }
    return null;
  };

  const columns = [
    {
      key: 'cha_id',
      label: 'ID',
      sortable: true,
      className: 'w-20',
    },
    {
      key: 'cha_DT',
      label: 'DT',
      className: 'w-24',
    },
    {
      key: 'tipo_chamado',
      label: 'Tipo',
      className: 'w-32',
    },
    {
      key: 'cliente_nome',
      label: 'Cliente',
      className: 'w-40',
    },
    {
      key: 'cha_descricao',
      label: 'Descrição',
      render: (value: unknown, item: Chamado) => {
        const attendingUser = isUserAttending(item.cha_id);
        const timer = getTimer(item.cha_id);
        
        return (
          <div className="max-w-xs">
            <div className="truncate" title={String(value)}>
              {String(value)}
            </div>
            {attendingUser && (
              <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded mt-1 flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-1 animate-pulse"></span>
                <span>{attendingUser} - {timer ? formatTimer(timer.seconds) : '00:00'}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'cha_status',
      label: 'Status',
      render: (value: unknown, item: Chamado) => getStatusBadge(Number(value), item.cha_id),
      className: 'w-32',
    },
    {
      key: 'cha_data_hora_abertura',
      label: 'Abertura',
      render: (value: unknown) => formatDate(String(value)),
      className: 'w-36',
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (_: unknown, item: Chamado) => {
        const timer = getTimer(item.cha_id);
        const isBeingAttended = !!timer;
        const userIsBusy = isUserInAttendance && currentAttendance?.chamadoId !== item.cha_id;
        const lockInfo = isLocked(item.cha_id);
        const isBeingViewed = lockInfo && !isBeingAttended; // Lock sem timer = visualização
        
        return (
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleViewChamado(item)}
              disabled={isBeingViewed} // Só bloqueia se sendo visualizado
              title={
                isBeingViewed
                  ? `Sendo visualizado por ${lockInfo?.lockedBy.userName}`
                  : isBeingAttended
                  ? `Sendo atendido - clique para ver detalhes`
                  : 'Visualizar chamado'
              }
            >
              Ver
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleEditChamado(item)}
              disabled={isBeingAttended || userIsBusy || isBeingViewed}
              title={
                isBeingAttended
                  ? 'Chamado está sendo atendido'
                  : userIsBusy 
                  ? `Você está atendendo chamado #${currentAttendance?.chamadoId}`
                  : isBeingViewed
                  ? `Sendo visualizado por ${lockInfo?.lockedBy.userName}`
                  : 'Editar chamado'
              }
            >
              Editar
            </Button>
            {item.cha_status === 1 && (
              <Button
                size="sm"
                variant="success"
                onClick={() => handleIniciarAtendimento(item)}
                disabled={isBeingAttended || userIsBusy}
                title={
                  isBeingAttended
                    ? 'Chamado já está sendo atendido'
                    : userIsBusy 
                    ? `Você está atendendo chamado #${currentAttendance?.chamadoId}`
                    : 'Iniciar atendimento'
                }
              >
                {isBeingAttended ? '⏱️' : userIsBusy ? '🚫' : 'Atender'}
              </Button>
            )}
          </div>
        );
      },
      className: 'w-52',
    },
];

  return (
  <div className="space-y-6">
    {/* Header com indicador de atendimento */}
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Chamados</h1>
        <div className="flex items-center space-x-4 mt-1">
          <p className="text-sm text-secondary-600">
            Atualizações em tempo real • Total: {pagination.totalItems} chamados
          </p>
          {isUserInAttendance && (
            <div className="flex items-center space-x-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
              <span>Atendendo chamado #{currentAttendance?.chamadoId}</span>
            </div>
          )}
        </div>
      </div>
      <Button 
        onClick={handleNewChamado}
        disabled={isUserInAttendance}
        title={isUserInAttendance ? 'Finalize o atendimento atual primeiro' : 'Criar novo chamado'}
      >
        Novo Chamado
      </Button>
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
        onClose={() => handleCloseModal(editingChamado?.cha_id)}
        title={editingChamado ? 'Editar Chamado' : 'Novo Chamado'}
        size="lg"
      >
        <ChamadoForm
          chamado={editingChamado}
          onSubmit={() => {
            handleCloseModal(editingChamado?.cha_id);
            loadChamados(pagination.currentPage);
          }}
          onCancel={() => handleCloseModal(editingChamado?.cha_id)}
        />
      </Modal>

      {/* Modal de Detalhes - MOSTRA TIMER SE EM ATENDIMENTO */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => handleCloseModal(selectedChamado?.cha_id)}
        title={`Chamado #${selectedChamado?.cha_id}`}
        size="lg"
      >
        {selectedChamado && (
          <div className="space-y-4">
            {/* Mostrar timer se em atendimento */}
            {getTimer(selectedChamado.cha_id) && (
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></span>
                    <span className="font-medium text-orange-800">Atendimento em andamento</span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-orange-900">
                    {formatTimer(getTimer(selectedChamado.cha_id)!.seconds)}
                  </div>
                </div>
                <p className="text-sm text-orange-700 mt-2">
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
                {getStatusBadge(selectedChamado.cha_status, selectedChamado.cha_id)}
              </div>
              <div>
                <label className="form-label">Cliente:</label>
                <p className="text-secondary-900">{selectedChamado.cliente_nome}</p>
              </div>
              <div>
                <label className="form-label">Tipo:</label>
                <p className="text-secondary-900">{selectedChamado.tipo_chamado}</p>
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

      {/* Modal de Atendimento - BLOQUEADO*/}
      <Modal
        isOpen={atendimentoModalOpen}
        onClose={() => handleCloseModal(chamadoAtendimento?.cha_id)}
        title={`Atendimento - Chamado #${chamadoAtendimento?.cha_id}`}
        size="xl"
        preventClose={true} // BLOQUEAR FECHAMENTO
      >
        {chamadoAtendimento && (
          <ChamadoAtendimento
            chamado={chamadoAtendimento}
            onFinish={(updatedChamado) => {
              handleChamadoUpdated(updatedChamado);
              handleCloseModal(chamadoAtendimento.cha_id);
            }}
            onCancel={() => handleCloseModal(chamadoAtendimento.cha_id)}
          />
        )}
      </Modal>
    </div>
  );
};

export default Chamados;