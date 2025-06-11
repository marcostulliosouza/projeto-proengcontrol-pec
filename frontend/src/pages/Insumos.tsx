/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Package, AlertTriangle, TrendingUp, Edit, Trash2, ArrowUpDown } from 'lucide-react';
import { InsumoService, type Insumo, type CategoriaInsumo, type EstatisticasInsumos } from '../services/insumoService';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Loading from '../components/ui/Loading';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../types/permissions';

// Componentes auxiliares
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  
  if (status === 'SEM_ESTOQUE') {
    return <span className={`${baseClasses} bg-red-100 text-red-800`}>Sem Estoque</span>;
  }
  if (status === 'ESTOQUE_BAIXO') {
    return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Estoque Baixo</span>;
  }
  return <span className={`${baseClasses} bg-green-100 text-green-800`}>Em Dia</span>;
};

// Modal de criação/edição de insumo
const InsumoModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  insumo?: Insumo | null;
  categorias: CategoriaInsumo[];
  onSuccess: () => void;
}> = ({ isOpen, onClose, insumo, categorias, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cai_id: 0,
    ins_cod_sap: '',
    ins_nome: '',
    ins_descricao: '',
    ins_qtd: 0,
    ins_valor_unit: 0,
    ins_estoque_minimo: 0,
    ins_localizacao: '',
    ins_observacoes: ''
  });
  const { showSuccessToast, showErrorToast } = useToast();

  useEffect(() => {
    if (insumo) {
      setFormData({
        cai_id: insumo.cai_id,
        ins_cod_sap: insumo.ins_cod_sap || '',
        ins_nome: insumo.ins_nome,
        ins_descricao: insumo.ins_descricao || '',
        ins_qtd: insumo.ins_qtd,
        ins_valor_unit: insumo.ins_valor_unit,
        ins_estoque_minimo: insumo.ins_estoque_minimo,
        ins_localizacao: insumo.ins_localizacao || '',
        ins_observacoes: insumo.ins_observacoes || ''
      });
    } else {
      setFormData({
        cai_id: 0,
        ins_cod_sap: '',
        ins_nome: '',
        ins_descricao: '',
        ins_qtd: 0,
        ins_valor_unit: 0,
        ins_estoque_minimo: 0,
        ins_localizacao: '',
        ins_observacoes: ''
      });
    }
  }, [insumo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ins_nome || formData.cai_id === 0) {
      showErrorToast('Erro', 'Nome e categoria são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      if (insumo) {
        await InsumoService.updateInsumo(insumo.ins_id, formData);
        showSuccessToast('Sucesso', 'Insumo atualizado com sucesso');
      } else {
        await InsumoService.createInsumo(formData);
        showSuccessToast('Sucesso', 'Insumo criado com sucesso');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      showErrorToast('Erro', error.message || 'Erro ao salvar insumo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={insumo ? 'Editar Insumo' : 'Novo Insumo'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Categoria *</label>
            <select
              className="form-input"
              value={formData.cai_id}
              onChange={(e) => setFormData({...formData, cai_id: parseInt(e.target.value)})}
              required
            >
              <option value={0}>Selecione uma categoria</option>
              {categorias.map(cat => (
                <option key={cat.cai_id} value={cat.cai_id}>{cat.cai_nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Código SAP</label>
            <input
              type="text"
              className="form-input"
              value={formData.ins_cod_sap}
              onChange={(e) => setFormData({...formData, ins_cod_sap: e.target.value})}
              placeholder="Ex: MAT001"
            />
          </div>

          <div className="md:col-span-2">
            <label className="form-label">Nome *</label>
            <input
              type="text"
              className="form-input"
              value={formData.ins_nome}
              onChange={(e) => setFormData({...formData, ins_nome: e.target.value})}
              placeholder="Nome do insumo"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="form-label">Descrição</label>
            <textarea
              className="form-input"
              rows={3}
              value={formData.ins_descricao}
              onChange={(e) => setFormData({...formData, ins_descricao: e.target.value})}
              placeholder="Descrição detalhada do insumo"
            />
          </div>

          <div>
            <label className="form-label">Quantidade Inicial</label>
            <input
              type="number"
              className="form-input"
              value={formData.ins_qtd}
              onChange={(e) => setFormData({...formData, ins_qtd: parseInt(e.target.value) || 0})}
              min="0"
            />
          </div>

          <div>
            <label className="form-label">Valor Unitário (R$)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={formData.ins_valor_unit}
              onChange={(e) => setFormData({...formData, ins_valor_unit: parseFloat(e.target.value) || 0})}
              min="0"
            />
          </div>

          <div>
            <label className="form-label">Estoque Mínimo</label>
            <input
              type="number"
              className="form-input"
              value={formData.ins_estoque_minimo}
              onChange={(e) => setFormData({...formData, ins_estoque_minimo: parseInt(e.target.value) || 0})}
              min="0"
            />
          </div>

          <div>
            <label className="form-label">Localização</label>
            <input
              type="text"
              className="form-input"
              value={formData.ins_localizacao}
              onChange={(e) => setFormData({...formData, ins_localizacao: e.target.value})}
              placeholder="Ex: Estante A-1"
            />
          </div>

          <div className="md:col-span-2">
            <label className="form-label">Observações</label>
            <textarea
              className="form-input"
              rows={2}
              value={formData.ins_observacoes}
              onChange={(e) => setFormData({...formData, ins_observacoes: e.target.value})}
              placeholder="Observações adicionais"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            loading={loading}
          >
            {insumo ? 'Atualizar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Modal de movimentação de estoque
const MovimentacaoModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  insumo: Insumo | null;
  onSuccess: () => void;
}> = ({ isOpen, onClose, insumo, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    mov_tipo: 'ENTRADA' as 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'TRANSFERENCIA',
    mov_quantidade: 0,
    mov_motivo: '',
    mov_observacao: '',
    mov_documento: '',
    mov_centro_custo: ''
  });
  const { showSuccessToast, showErrorToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insumo || formData.mov_quantidade <= 0) {
      showErrorToast('Erro', 'Quantidade deve ser maior que zero');
      return;
    }

    setLoading(true);
    try {
      await InsumoService.movimentarEstoque(insumo.ins_id, formData);
      showSuccessToast('Sucesso', 'Movimentação realizada com sucesso');
      onSuccess();
      onClose();
    } catch (error: any) {
      showErrorToast('Erro', error.message || 'Erro ao movimentar estoque');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Movimentar Estoque - ${insumo?.ins_nome}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-600">
            <strong>Estoque Atual:</strong> {insumo?.ins_qtd} unidades
          </p>
        </div>

        <div>
          <label className="form-label">Tipo de Movimentação *</label>
          <select
            className="form-input"
            value={formData.mov_tipo}
            onChange={(e) => setFormData({...formData, mov_tipo: e.target.value as any})}
            required
          >
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
            <option value="AJUSTE">Ajuste</option>
            <option value="TRANSFERENCIA">Transferência</option>
          </select>
        </div>

        <div>
          <label className="form-label">Quantidade *</label>
          <input
            type="number"
            className="form-input"
            value={formData.mov_quantidade}
            onChange={(e) => setFormData({...formData, mov_quantidade: parseInt(e.target.value) || 0})}
            min="1"
            required
          />
        </div>

        <div>
          <label className="form-label">Motivo</label>
          <input
            type="text"
            className="form-input"
            value={formData.mov_motivo}
            onChange={(e) => setFormData({...formData, mov_motivo: e.target.value})}
            placeholder="Motivo da movimentação"
          />
        </div>

        <div>
          <label className="form-label">Documento</label>
          <input
            type="text"
            className="form-input"
            value={formData.mov_documento}
            onChange={(e) => setFormData({...formData, mov_documento: e.target.value})}
            placeholder="Ex: NF-123, RC-456"
          />
        </div>

        <div>
          <label className="form-label">Observação</label>
          <textarea
            className="form-input"
            rows={3}
            value={formData.mov_observacao}
            onChange={(e) => setFormData({...formData, mov_observacao: e.target.value})}
            placeholder="Observações adicionais"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            loading={loading}
          >
            Movimentar
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Componente principal
const Insumos: React.FC = () => {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [categorias, setCategorias] = useState<CategoriaInsumo[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasInsumos | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  });

  // Estados dos filtros
  const [filtros, setFiltros] = useState({
    search: '',
    categoria: 0,
    status: '',
    estoqueBaixo: false
  });

  // Estados dos modais
  const [showInsumoModal, setShowInsumoModal] = useState(false);
  const [showMovimentacaoModal, setShowMovimentacaoModal] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState<Insumo | null>(null);

  const { showSuccessToast, showErrorToast } = useToast();
  const { state: authState } = useAuth();
  const permissions = usePermissions(authState.user?.categoria);

  // Carregar dados
  const loadInsumos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await InsumoService.getInsumos(
        pagination.currentPage,
        pagination.itemsPerPage,
        filtros
      );
      setInsumos(response.insumos);
      setPagination(response.pagination);
    } catch (error: any) {
      showErrorToast('Erro', error.message || 'Erro ao carregar insumos');
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.itemsPerPage, filtros, showErrorToast]);

  const loadCategorias = async () => {
    try {
      const categorias = await InsumoService.getCategorias();
      setCategorias(categorias);
    } catch (error: any) {
      showErrorToast('Erro', error.message || 'Erro ao carregar categorias');
    }
  };

  const loadEstatisticas = async () => {
    try {
      const stats = await InsumoService.getEstatisticas();
      setEstatisticas(stats);
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  useEffect(() => {
    loadInsumos();
  }, [loadInsumos]);

  useEffect(() => {
    loadCategorias();
    loadEstatisticas();
  }, []);

  // Handlers
  const handleEdit = (insumo: Insumo) => {
    setSelectedInsumo(insumo);
    setShowInsumoModal(true);
  };

  const handleMovimentar = (insumo: Insumo) => {
    setSelectedInsumo(insumo);
    setShowMovimentacaoModal(true);
  };

  const handleDelete = async (insumo: Insumo) => {
    if (!confirm(`Tem certeza que deseja remover o insumo "${insumo.ins_nome}"?`)) {
      return;
    }

    try {
      await InsumoService.deleteInsumo(insumo.ins_id);
      showSuccessToast('Sucesso', 'Insumo removido com sucesso');
      loadInsumos();
    } catch (error: any) {
      showErrorToast('Erro', error.message || 'Erro ao remover insumo');
    }
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const resetFiltros = () => {
    setFiltros({
      search: '',
      categoria: 0,
      status: '',
      estoqueBaixo: false
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Controle de Insumos</h1>
          <p className="text-gray-600">Gerencie o estoque de materiais e insumos</p>
        </div>
        {permissions.hasPermission('CREATE_DISPOSITIVO') && (
          <Button
            onClick={() => {
              setSelectedInsumo(null);
              setShowInsumoModal(true);
            }}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Insumo</span>
          </Button>
        )}
      </div>

      {/* Estatísticas */}
      {estatisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Insumos</p>
                <p className="text-2xl font-bold">{estatisticas.totalInsumos}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Valor Total Estoque</p>
                <p className="text-2xl font-bold">{formatCurrency(estatisticas.valorTotalEstoque)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Estoque Baixo</p>
                <p className="text-2xl font-bold">{estatisticas.itensBaixoEstoque}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Package className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Em Falta</p>
                <p className="text-2xl font-bold">{estatisticas.itensEmFalta}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-medium">Filtros</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por nome, código SAP..."
                  className="form-input pl-10"
                  value={filtros.search}
                  onChange={(e) => setFiltros({...filtros, search: e.target.value})}
                />
              </div>
            </div>

            <div>
              <select
                className="form-input"
                value={filtros.categoria}
                onChange={(e) => setFiltros({...filtros, categoria: parseInt(e.target.value)})}
              >
                <option value={0}>Todas as categorias</option>
                {categorias.map(cat => (
                  <option key={cat.cai_id} value={cat.cai_id}>{cat.cai_nome}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                className="form-input"
                value={filtros.status}
                onChange={(e) => setFiltros({...filtros, status: e.target.value})}
              >
                <option value="">Todos os status</option>
                <option value="SUFICIENTE">Suficiente</option>
                <option value="NECESSIDADE DE COMPRA">Necessidade de Compra</option>
              </select>
            </div>

            <div className="flex space-x-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filtros.estoqueBaixo}
                  onChange={(e) => setFiltros({...filtros, estoqueBaixo: e.target.checked})}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Apenas estoque baixo</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={resetFiltros}
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabela */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loading />
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left">Código SAP</th>
                    <th className="text-left">Nome</th>
                    <th className="text-left">Categoria</th>
                    <th className="text-center">Estoque</th>
                    <th className="text-center">Mínimo</th>
                    <th className="text-right">Valor Unit.</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {insumos.map((insumo) => (
                    <tr key={insumo.ins_id} className="hover:bg-gray-50">
                      <td>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {insumo.ins_cod_sap || '-'}
                        </code>
                      </td>
                      <td>
                        <div>
                          <p className="font-medium">{insumo.ins_nome}</p>
                          {insumo.ins_descricao && (
                            <p className="text-sm text-gray-500">{insumo.ins_descricao}</p>
                          )}
                        </div>
                      </td>
                      <td>{insumo.categoria_nome}</td>
                      <td className="text-center">
                        <span className={`font-medium ${
                          insumo.ins_qtd <= insumo.ins_estoque_minimo ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {insumo.ins_qtd}
                        </span>
                      </td>
                      <td className="text-center">{insumo.ins_estoque_minimo}</td>
                      <td className="text-right">{formatCurrency(insumo.ins_valor_unit)}</td>
                      <td className="text-center">
                        <StatusBadge status={insumo.status_analise || 'ESTOQUE_OK'} />
                      </td>
                      <td className="text-center">
                        <div className="flex justify-center space-x-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleMovimentar(insumo)}
                            title="Movimentar Estoque"
                          >
                            <ArrowUpDown className="w-4 h-4" />
                          </Button>
                          
                          {permissions.hasPermission('EDIT_DISPOSITIVO') && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleEdit(insumo)}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {permissions.hasPermission('DELETE_DISPOSITIVO') && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleDelete(insumo)}
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600">
                  Mostrando {insumos.length} de {pagination.totalItems} insumos
                </p>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pagination.currentPage === 1}
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="px-3 py-1 text-sm">
                    {pagination.currentPage} / {pagination.totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pagination.currentPage === pagination.totalPages}
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Modais */}
      <InsumoModal
        isOpen={showInsumoModal}
        onClose={() => setShowInsumoModal(false)}
        insumo={selectedInsumo}
        categorias={categorias}
        onSuccess={() => {
          loadInsumos();
          loadEstatisticas();
        }}
      />

      <MovimentacaoModal
        isOpen={showMovimentacaoModal}
        onClose={() => setShowMovimentacaoModal(false)}
        insumo={selectedInsumo}
        onSuccess={() => {
          loadInsumos();
          loadEstatisticas();
        }}
      />
    </div>
  );
};

export default Insumos;