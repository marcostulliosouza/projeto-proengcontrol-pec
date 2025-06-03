import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Select, Pagination, Modal } from '../components/ui';
import { ChamadoService, type TipoChamado, type StatusChamado, type Cliente } from '../services/chamadoService';
import type { Chamado, FilterState, PaginationInfo } from '../types';
import ChamadoForm from '../components/forms/ChamadoForm';

const Chamados: React.FC = () => {
  const [chamados, setChamados] = useState<Chamado[]>([]);
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

  // Dados auxiliares
  const [tipos, setTipos] = useState<TipoChamado[]>([]);
  const [status, setStatus] = useState<StatusChamado[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

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
  const loadChamados = async (page = 1) => {
    try {
      setLoading(true);
      const response = await ChamadoService.getChamados(page, 10, filters);
      setChamados(response.chamados);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Erro ao carregar chamados:', error);
    } finally {
      setLoading(false);
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

  const handleEditChamado = (chamado: Chamado) => {
    setEditingChamado(chamado);
    setModalOpen(true);
  };

  const handleViewChamado = (chamado: Chamado) => {
    setSelectedChamado(chamado);
    setDetailModalOpen(true);
  };

  const handleIniciarAtendimento = async (id: number) => {
    try {
      await ChamadoService.iniciarAtendimento(id);
      loadChamados(pagination.currentPage);
    } catch (error) {
      console.error('Erro ao iniciar atendimento:', error);
    }
  };

  const getStatusBadge = (status: number) => {
    const statusMap = {
      1: { label: 'Aberto', class: 'status-warning' },
      2: { label: 'Em Andamento', class: 'status-info' },
      3: { label: 'Fechado', class: 'status-success' },
    };
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: 'Desconhecido', class: 'status-secondary' };
    return (
      <span className={`status-badge ${statusInfo.class}`}>
        {statusInfo.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
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
      render: (value: unknown) => (
        <div className="max-w-xs truncate" title={String(value)}>
          {String(value)}
        </div>
      ),
    },
    {
      key: 'cha_status',
      label: 'Status',
      render: (value: unknown) => getStatusBadge(Number(value)),
      className: 'w-28',
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
      render: (_: unknown, item: Chamado) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleViewChamado(item)}
          >
            Ver
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleEditChamado(item)}
          >
            Editar
          </Button>
          {item.cha_status === 1 && (
            <Button
              size="sm"
              variant="success"
              onClick={() => handleIniciarAtendimento(item.cha_id)}
            >
              Iniciar
            </Button>
          )}
        </div>
      ),
      className: 'w-48',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-secondary-900">Chamados</h1>
        <Button onClick={handleNewChamado}>
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
        onClose={() => setModalOpen(false)}
        title={editingChamado ? 'Editar Chamado' : 'Novo Chamado'}
        size="lg"
      >
        <ChamadoForm
          chamado={editingChamado}
          onSubmit={() => {
            setModalOpen(false);
            loadChamados(pagination.currentPage);
          }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      {/* Modal de Detalhes */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Chamado #${selectedChamado?.cha_id}`}
        size="lg"
      >
        {selectedChamado && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">DT:</label>
                <p className="text-secondary-900">{selectedChamado.cha_DT}</p>
              </div>
              <div>
                <label className="form-label">Status:</label>
                {getStatusBadge(selectedChamado.cha_status)}
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
    </div>
  );
};

export default Chamados;