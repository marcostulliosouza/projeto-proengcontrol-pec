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

  // const formatDate = (dateString: string) => {
  //   return new Date(dateString).toLocaleString('pt-BR');
  // };

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
      key: 'actions',
      label: 'Ações',
      render: (_: unknown, item: Chamado) => {
        const timer = getTimer(item.cha_id);
        const isBeingAttended = !!timer;
        const canStart = canStartAttendance(item);

        return (
          <div className="flex items-center gap-2 min-w-[140px]">
            {/* Botão Ver Detalhes - sempre visível */}
            <button
              onClick={() => handleViewChamado(item)}
              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
              title="Ver Detalhes"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>

            {/* Ações baseadas no status */}
            {item.cha_status === 1 && (
              <>
                {canStart ? (
                  <button
                    onClick={() => handleIniciarAtendimento(item)}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
                    title="Iniciar Atendimento"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2z" />
                    </svg>
                    Atender
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {isBeingAttended ? 'Ocupado' : 'Bloqueado'}
                  </div>
                )}
              </>
            )}

            {item.cha_status === 2 && isBeingAttended && (
              <button
                disabled 
                onClick={(e) => e.preventDefault()} 
                className={`
                  px-3 py-1.5 
                  bg-gray-400 text-white text-xs font-medium 
                  rounded-lg 
                  cursor-not-allowed
                  flex items-center gap-1.5
                  relative 
                  overflow-hidden 
                `}
                title="Este chamado está sendo atendido por outro usuário" // Mensagem explicativa
              >
                {/* Efeito visual de bloqueio (opcional) */}
                <div className="absolute inset-0 bg-white bg-opacity-30"></div>
                
                {/* Ícone e texto com opacidade reduzida */}
                <svg 
                  className="w-3.5 h-3.5 opacity-70" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                  />
                </svg>
                <span className="opacity-70">Indisponível</span>
              </button>
            )}

            {item.cha_status === 3 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-lg">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Finalizado
              </div>
            )}
          </div>
        );
      },
      className: 'w-40 sticky right-0 bg-white',
    },
    {
      key: 'plano_icon',
      label: 'Prioridade',
      className: 'w-20',
      render: (_: unknown, item: Chamado) => {
        if (item.cha_plano === 1) {
          return (
            <div className="flex items-center justify-center">
              <div className="w-3 h-3 bg-red-500 rounded-full" title="Produto está contido no plano de produção"></div>
            </div>
          );
        } else if (item.cha_plano === 0) {
          return (
            <div className="flex items-center justify-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full" title="Produto NÃO está contido no plano de produção"></div>
            </div>
          );
        } else {
          return (
            <div className="flex items-center justify-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full" title="Chamado de melhoria"></div>
            </div>
          );
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
          <span className={`font-mono text-sm font-medium ${
            diffInMinutes > 30 ? 'text-red-600' :
            diffInMinutes < 0 ? 'text-blue-600' :
            'text-gray-700'
          }`}>
            {formatDuration(diffInMinutes)}
          </span>
        );
      }
    },
    {
      key: 'cha_operador',
      label: 'Criado Por',
      className: 'w-32',
      render: (value: unknown) => (
        <span className="text-sm text-gray-700">{String(value || 'N/A')}</span>
      )
    },
    {
      key: 'tipo_chamado',
      label: 'Tipo',
      className: 'w-40',
      render: (value: unknown) => (
        <span className="text-sm text-gray-900">{String(value || 'Não informado')}</span>
      )
    },
     {
      key: 'cliente_nome',
      label: 'Cliente',
      className: 'w-40',
      render: (value: unknown) => (
        <span className="text-sm font-medium text-gray-900">{String(value || 'Não informado')}</span>
      )
    },
    {
      key: 'produto_nome',
      label: 'Produto',
      className: 'w-32',
      render: (value: unknown) => (
        <span className="text-sm text-gray-700">{String(value || 'N/A')}</span>
      )
    },
    {
      key: 'status_info',
      label: 'Status',
      className: 'w-32',
      render: (_: unknown, item: Chamado) => {
        const statusConfig = {
          1: { label: 'ABERTO', classes: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
          2: { label: 'EM ANDAMENTO', classes: 'bg-blue-100 text-blue-800 border-blue-200' },
          3: { label: 'FECHADO', classes: 'bg-green-100 text-green-800 border-green-200' },
        };

        const config = statusConfig[item.cha_status as keyof typeof statusConfig] || {
          label: 'DESCONHECIDO',
          classes: 'bg-gray-100 text-gray-800 border-gray-200'
        };

        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.classes}`}>
            {config.label}
          </span>
        );
      }
    },
    {
      key: 'suporte_responsavel',
      label: 'Suporte Responsável',
      className: 'w-44',
      render: (_: unknown, item: Chamado) => {
        const timer = getTimer(item.cha_id);

        if (timer) {
          const isMyAttendance = timer.userId === currentAttendance?.userId;
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                  isMyAttendance
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {timer.userName?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium block truncate ${
                    isMyAttendance ? 'text-blue-700' : 'text-gray-900'
                  }`}>
                    {timer.userName}
                    {isMyAttendance && <span className="text-blue-500 ml-1">(Você)</span>}
                  </span>
                  <div className={`text-xs font-mono ${
                    timer.seconds > 30 * 60 ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    ⏱️ {formatTimer(timer.seconds)}
                  </div>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="flex items-center text-sm text-gray-500">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            Não atribuído
          </div>
        );
      }
    },
    {
      key: 'cha_descricao',
      label: 'Descrição do Chamado',
      render: (value: unknown) => (
        <div className="max-w-xs">
          <span className="text-sm text-gray-900 line-clamp-2 leading-relaxed" title={String(value || '')}>
            {String(value || '')}
          </span>
        </div>
      )
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
      // Chamados.tsx - Modal de Detalhes corrigido
      <Modal
        isOpen={detailModalOpen}
        onClose={handleCloseModal}
        title={`Chamado #${selectedChamado?.cha_id}`}
        size="xl"
      >
        {selectedChamado && (
          <div className="space-y-6">
            {/* Header com Status e Timer */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-4">
                {/* Status Badge */}
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  selectedChamado.cha_status === 1 ? 'bg-yellow-100 text-yellow-800' :
                  selectedChamado.cha_status === 2 ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {selectedChamado.cha_status === 1 ? '🟡 ABERTO' :
                  selectedChamado.cha_status === 2 ? '🔵 EM ANDAMENTO' : '🟢 FECHADO'}
                </div>

                {/* Prioridade */}
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedChamado.cha_plano === 1 ? 'bg-red-100 text-red-700' :
                  selectedChamado.cha_plano === 0 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {selectedChamado.cha_plano === 1 ? 'ALTA PRIORIDADE' :
                  selectedChamado.cha_plano === 0 ? 'FORA DO PLANO' : 'MELHORIA'}
                </div>
              </div>

              {/* Timer se ativo */}
              {getTimer(selectedChamado.cha_id) && (
                <div className="text-right">
                  <div className="text-2xl font-mono font-bold text-blue-600">
                    {formatTimer(getTimer(selectedChamado.cha_id)!.seconds)}
                  </div>
                  <div className="text-xs text-gray-500">Tempo decorrido</div>
                </div>
              )}
            </div>

            {getTimer(selectedChamado.cha_id) && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-700 font-semibold text-sm">
                        {getTimer(selectedChamado.cha_id)!.startedBy.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        <span className="font-medium text-blue-800">Atendimento em andamento</span>
                      </div>
                      <p className="text-sm text-blue-700">
                        Por: <span className="font-medium">{getTimer(selectedChamado.cha_id)!.startedBy}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-blue-600">
                      Iniciado às {new Date(getTimer(selectedChamado.cha_id)!.startedAt).toLocaleTimeString('pt-BR')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Informações organizadas em grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coluna Esquerda */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Informações Básicas
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">DT / Código do Equipamento</label>
                      <p className="mt-1 text-sm font-mono bg-white px-3 py-2 rounded border">
                        {selectedChamado.cha_DT || 'Não informado'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tipo de Chamado</label>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {selectedChamado.tipo_chamado || 'Não informado'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Operador</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedChamado.cha_operador}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-2 0H5m14 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2z" />
                    </svg>
                    Cliente e Produto
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cliente</label>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {selectedChamado.cliente_nome || 'Não informado'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Produto</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedChamado.produto_nome || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna Direita */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Cronologia
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Data Abertura</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(selectedChamado.cha_data_hora_abertura).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    {selectedChamado.cha_data_hora_atendimento && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Iniciado Atendimento</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(selectedChamado.cha_data_hora_atendimento).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    )}
                    {selectedChamado.cha_data_hora_termino && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Data Finalização</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(selectedChamado.cha_data_hora_termino).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Métricas de Tempo */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Métricas de Tempo
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Tempo Total:</span>
                      <span className="font-mono font-medium">
                        {(() => {
                          const now = selectedChamado.cha_data_hora_termino 
                            ? new Date(selectedChamado.cha_data_hora_termino).getTime()
                            : new Date().getTime();
                          const start = new Date(selectedChamado.cha_data_hora_abertura).getTime();
                          const diff = Math.floor((now - start) / 60000);
                          return formatDuration(diff);
                        })()}
                      </span>
                    </div>
                    {selectedChamado.cha_data_hora_atendimento && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Tempo Atendimento:</span>
                        <span className="font-mono font-medium">
                          {(() => {
                            const end = selectedChamado.cha_data_hora_termino 
                              ? new Date(selectedChamado.cha_data_hora_termino).getTime()
                              : new Date().getTime();
                            const start = new Date(selectedChamado.cha_data_hora_atendimento).getTime();
                            const diff = Math.floor((end - start) / 60000);
                            return formatDuration(diff);
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Descrição do Problema */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L5.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Descrição do Problema
                  </h4>
                  <div className="bg-white p-4 rounded border border-gray-200">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                      {selectedChamado.cha_descricao}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ação Realizada (se finalizado) */}
            {selectedChamado.cha_status === 3 && selectedChamado.acao_descricao && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Ação Realizada
                </h4>
                <div className="bg-white p-4 rounded border border-green-200">
                  <p className="text-sm text-green-900 whitespace-pre-wrap leading-relaxed">
                    {String(selectedChamado.acao_descricao)}
                  </p>
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={handleCloseModal}
              >
                Fechar
              </Button>
              
              <div className="flex space-x-3">
                {selectedChamado.cha_status === 1 && !isUserInAttendance && !getTimer(selectedChamado.cha_id) && (
                  <Button
                    variant="success"
                    onClick={() => {
                      handleCloseModal();
                      handleIniciarAtendimento(selectedChamado);
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2z" />
                    </svg>
                    Iniciar Atendimento
                  </Button>
                )}
                
                {selectedChamado.cha_status === 2 && getTimer(selectedChamado.cha_id)?.userId === currentAttendance?.userId && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      handleCloseModal();
                      setAtendimentoModalOpen(true);
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Continuar Atendimento
                  </Button>
                )}
              </div>
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