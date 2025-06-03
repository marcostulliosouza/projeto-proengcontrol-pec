import React, { useState, useEffect } from 'react';
import { DispositivoService } from '../services/dispositivoService';
import type { Dispositivo, FilterState, PaginationInfo } from '../types';
import { StatusDispositivo } from '../types';
import { Card, Button, Input, Select, Table, Pagination, Modal } from '../components/ui';

const Dispositivos: React.FC = () => {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
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
  });

  const [clientes, setClientes] = useState<Array<{ cli_id: number; cli_nome: string }>>([]);
  const [statusOptions, setStatusOptions] = useState<Array<{ sdi_id: number; sdi_descricao: string }>>([]);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDispositivo, setSelectedDispositivo] = useState<Dispositivo | null>(null);

  // Carregar dispositivos
  const loadDispositivos = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await DispositivoService.getDispositivos(page, 10, filters);
      setDispositivos(response.dispositivos);
      setPagination(response.pagination);
    } catch (err) {
      console.error('Erro ao carregar dispositivos:', err);
      alert('Erro ao carregar dispositivos');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados auxiliares
  const loadAuxData = async () => {
    try {
      const [clientesData, statusData] = await Promise.all([
        DispositivoService.getClientes(),
        DispositivoService.getStatus(),
      ]);
      setClientes(clientesData);
      setStatusOptions(statusData);
    } catch (err) {
      console.error('Erro ao carregar dados auxiliares:', err);
    }
  };

  useEffect(() => {
    loadAuxData();
  }, []);

  useEffect(() => {
    loadDispositivos(1);
  }, [filters]);

  // Handlers
  const handleSearch = (search: string) => {
    setFilters({ ...filters, search });
  };

  const handleFilterChange = (key: keyof FilterState, value: string | number | undefined) => {
    setFilters({ ...filters, [key]: value || undefined });
  };

  const handlePageChange = (page: number) => {
    loadDispositivos(page);
  };

  const handleEdit = (dispositivo: Dispositivo) => {
    setSelectedDispositivo(dispositivo);
    setModalOpen(true);
  };

  const handleDelete = async (dispositivo: Dispositivo) => {
    if (window.confirm(`Tem certeza que deseja excluir o dispositivo "${dispositivo.dis_descricao}"?`)) {
      try {
        await DispositivoService.deleteDispositivo(dispositivo.dis_id);
        loadDispositivos(pagination.currentPage);
      } catch (err) {
        console.error('Erro ao excluir dispositivo:', err);
        alert('Erro ao excluir dispositivo');
      }
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedDispositivo(null);
  };

  const handleSave = () => {
    closeModal();
    loadDispositivos(pagination.currentPage);
  };

  // Colunas da tabela
  const columns = [
    {
      key: 'dis_id',
      label: 'ID',
      sortable: true,
      className: 'w-20',
      render: (value: unknown) => String(value || ''),
    },
    {
      key: 'dis_descricao',
      label: 'Descrição',
      sortable: true,
      render: (value: unknown) => String(value || ''),
    },
    {
      key: 'dis_codigo_sap',
      label: 'Código SAP',
      render: (value: unknown) => String(value || '-'),
    },
    {
      key: 'cliente_nome',
      label: 'Cliente',
      render: (value: unknown) => String(value || '-'),
    },
    {
      key: 'dis_local',
      label: 'Local',
      render: (value: unknown) => String(value || '-'),
    },
    {
      key: 'status_descricao',
      label: 'Status',
      render: (value: unknown, item: Dispositivo) => {
        const statusClass = item.dis_status === StatusDispositivo.ATIVO 
          ? 'status-success' 
          : item.dis_status === StatusDispositivo.MANUTENCAO 
          ? 'status-warning' 
          : 'status-danger';
        
        return (
          <span className={`status-badge ${statusClass}`}>
            {String(value || '')}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Ações',
      className: 'w-32',
      render: (_: unknown, item: Dispositivo) => (
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleEdit(item)}
          >
            Editar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(item)}
          >
            Excluir
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Dispositivos</h1>
          <p className="text-secondary-600">Gerenciar equipamentos de teste</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          Novo Dispositivo
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Buscar dispositivos..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          
          <Select
            placeholder="Todos os status"
            options={statusOptions.map(s => ({ value: s.sdi_id, label: s.sdi_descricao }))}
            value={filters.status || ''}
            onChange={(value) => handleFilterChange('status', value)}
          />
          
          <Select
            placeholder="Todos os clientes"
            options={clientes.map(c => ({ value: c.cli_id, label: c.cli_nome }))}
            value={filters.cliente || ''}
            onChange={(value) => handleFilterChange('cliente', value)}
          />
          
          <Button
            variant="secondary"
            onClick={() => setFilters({ search: '', status: undefined, cliente: undefined })}
          >
            Limpar Filtros
          </Button>
        </div>
      </Card>

      {/* Tabela */}
      <Table<Dispositivo>
        columns={columns}
        data={dispositivos}
        loading={loading}
        emptyMessage="Nenhum dispositivo encontrado"
      />

      {/* Paginação */}
      {!loading && dispositivos.length > 0 && (
        <Pagination
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      )}

      {/* Modal de cadastro/edição */}
      {modalOpen && (
        <DispositivoModal
          dispositivo={selectedDispositivo}
          clientes={clientes}
          statusOptions={statusOptions}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Componente Modal separado
interface DispositivoModalProps {
  dispositivo: Dispositivo | null;
  clientes: Array<{ cli_id: number; cli_nome: string }>;
  statusOptions: Array<{ sdi_id: number; sdi_descricao: string }>;
  onClose: () => void;
  onSave: () => void;
}

const DispositivoModal: React.FC<DispositivoModalProps> = ({
  dispositivo,
  clientes,
  statusOptions,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    dis_descricao: dispositivo?.dis_descricao || '',
    dis_cliente: dispositivo?.dis_cliente || undefined,
    dis_codigo_sap: dispositivo?.dis_codigo_sap || '',
    dis_status: dispositivo?.dis_status || StatusDispositivo.ATIVO,
    dis_observacao: dispositivo?.dis_observacao || '',
    dis_ciclos_de_vida: dispositivo?.dis_ciclos_de_vida || 0,
    dis_local: dispositivo?.dis_local || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleChange = (field: string, value: string | number | undefined) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.dis_descricao.trim()) {
      newErrors.dis_descricao = 'Descrição é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setSaving(true);
    try {
      if (dispositivo) {
        await DispositivoService.updateDispositivo(dispositivo.dis_id, formData);
      } else {
        await DispositivoService.createDispositivo(formData);
      }
      onSave();
    } catch (err) {
      console.error('Erro ao salvar dispositivo:', err);
      alert('Erro ao salvar dispositivo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={dispositivo ? 'Editar Dispositivo' : 'Novo Dispositivo'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Descrição"
            value={formData.dis_descricao}
            onChange={(e) => handleChange('dis_descricao', e.target.value)}
            error={errors.dis_descricao}
            required
          />

          <Input
            label="Código SAP"
            value={formData.dis_codigo_sap}
            onChange={(e) => handleChange('dis_codigo_sap', e.target.value)}
          />

          <Select
            label="Cliente"
            placeholder="Selecione um cliente"
            options={clientes.map(c => ({ value: c.cli_id, label: c.cli_nome }))}
            value={formData.dis_cliente || ''}
            onChange={(value) => handleChange('dis_cliente', value)}
          />

          <Select
            label="Status"
            options={statusOptions.map(s => ({ value: s.sdi_id, label: s.sdi_descricao }))}
            value={formData.dis_status}
            onChange={(value) => handleChange('dis_status', value)}
            required
          />

          <Input
            label="Local"
            value={formData.dis_local}
            onChange={(e) => handleChange('dis_local', e.target.value)}
          />

          <Input
            label="Ciclos de Vida"
            type="number"
            value={formData.dis_ciclos_de_vida}
            onChange={(e) => handleChange('dis_ciclos_de_vida', parseInt(e.target.value) || 0)}
          />
        </div>

        <div>
          <label className="form-label">Observação</label>
          <textarea
            className="form-input"
            rows={3}
            value={formData.dis_observacao}
            onChange={(e) => handleChange('dis_observacao', e.target.value)}
            placeholder="Observações sobre o dispositivo"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {dispositivo ? 'Atualizar' : 'Criar'} Dispositivo
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default Dispositivos;