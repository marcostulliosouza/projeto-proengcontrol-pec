import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, ShoppingCart, Clock, CheckCircle, XCircle, Eye, Edit, Package } from 'lucide-react';
import { CompraService, type Compra, type CategoriaVerba, type Fornecedor } from '../services/compraService';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Loading from '../components/ui/Loading';
import Modal from '../components/ui/Modal';
import { usePermissions } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';

// Componente de Badge de Status
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  
  switch (status) {
    case 'PENDENTE':
      return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Pendente</span>;
    case 'APROVADA':
      return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Aprovada</span>;
    case 'RECEBIDA':
      return <span className={`${baseClasses} bg-green-100 text-green-800`}>Recebida</span>;
    case 'CANCELADA':
      return <span className={`${baseClasses} bg-red-100 text-red-800`}>Cancelada</span>;
    default:
      return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>;
  }
};

// Modal de criação/edição de compra
const CompraModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  compra?: Compra | null;
  categorias: CategoriaVerba[];
  fornecedores: Fornecedor[];
  onSuccess: () => void;
}> = ({ isOpen, onClose, compra, categorias, fornecedores, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cav_id: 0,
    com_rc: '',
    com_cod_sap: '',
    com_descricao: '',
    com_qtd: 1,
    com_valor_unit: 0,
    com_utilizacao: '',
    com_centro_custo: '',
    com_conta_razao: '',
    for_id: 0
  });
  const { showSuccessToast, showErrorToast } = useToast();

  useEffect(() => {
    if (compra) {
      setFormData({
        cav_id: compra.cav_id,
        com_rc: compra.com_rc,
        com_cod_sap: compra.com_cod_sap || '',
        com_descricao: compra.com_descricao,
        com_qtd: compra.com_qtd,
        com_valor_unit: compra.com_valor_unit,
        com_utilizacao: compra.com_utilizacao || '',
        com_centro_custo: compra.com_centro_custo,
        com_conta_razao: compra.com_conta_razao,
        for_id: compra.for_id || 0
      });
    } else {
      setFormData({
        cav_id: 0,
        com_rc: '',
        com_cod_sap: '',
        com_descricao: '',
        com_qtd: 1,
        com_valor_unit: 0,
        com_utilizacao: '',
        com_centro_custo: '',
        com_conta_razao: '',
        for_id: 0
      });
    }
  }, [compra]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.com_rc || !formData.com_descricao || formData.cav_id === 0) {
      showErrorToast('Erro', 'RC, descrição e categoria são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      if (compra) {
        await CompraService.updateCompra(compra.com_id, formData);
        showSuccessToast('Sucesso', 'Compra atualizada com sucesso');
      } else {
        await CompraService.createCompra(formData);
        showSuccessToast('Sucesso', 'Compra criada com sucesso');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      showErrorToast('Erro', error.message || 'Erro ao salvar compra');
    } finally {
      setLoading(false);
    }
  };

  const valorTotal = formData.com_qtd * formData.com_valor_unit;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={compra ? 'Editar Compra' : 'Nova Compra'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Categoria de Verba *</label>
            <select
              className="form-input"
              value={formData.cav_id}
              onChange={(e) => setFormData({...formData, cav_