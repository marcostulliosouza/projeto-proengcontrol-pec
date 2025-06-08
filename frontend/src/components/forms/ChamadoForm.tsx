import React, { useState, useEffect } from 'react';
import { Button, CustomSelect, Input, Select } from '../ui';
import { ChamadoService, type TipoChamado, type Cliente, type Produto, type LocalChamado } from '../../services/chamadoService';
import type { Chamado } from '../../types';

interface ChamadoFormProps {
  chamado?: Chamado | null;
  onSubmit: () => void;
  onCancel: () => void;
}

const ChamadoForm: React.FC<ChamadoFormProps> = ({
  chamado,
  onSubmit,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [tipos, setTipos] = useState<TipoChamado[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [locais, setLocais] = useState<LocalChamado[]>([]);

  const [formData, setFormData] = useState({
    cha_tipo: chamado?.cha_tipo || '',
    cha_cliente: chamado?.cha_cliente || '',
    cha_produto: chamado?.cha_produto || '',
    cha_DT: chamado?.cha_DT || '',
    cha_descricao: chamado?.cha_descricao || '',
    local_chamado: chamado?.local_chamado || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carregar dados auxiliares
  useEffect(() => {
    const loadData = async () => {
      try {
        const [tiposData, clientesData, locaisData] = await Promise.all([
          ChamadoService.getTipos(),
          ChamadoService.getClientes(),
          ChamadoService.getLocaisChamado(),
        ]);
        setTipos(tiposData);
        setClientes(clientesData);
        setLocais(locaisData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };

    loadData();
  }, []);

  // Carregar produtos quando cliente mudar
  useEffect(() => {
    const loadProdutos = async () => {
      if (formData.cha_cliente) {
        try {
          const produtosData = await ChamadoService.getProdutosByCliente(Number(formData.cha_cliente));
          setProdutos(produtosData);
        } catch (error) {
          console.error('Erro ao carregar produtos:', error);
          setProdutos([]);
        }
      } else {
        setProdutos([]);
        setFormData(prev => ({ ...prev, cha_produto: '' }));
      }
    };

    loadProdutos();
  }, [formData.cha_cliente]);

  const handleChange = (field: string, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.cha_tipo) {
      newErrors.cha_tipo = 'Tipo é obrigatório';
    }

    if (!formData.cha_cliente) {
      newErrors.cha_cliente = 'Cliente é obrigatório';
    }

    if (!formData.cha_descricao.trim()) {
      newErrors.cha_descricao = 'Descrição é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const submitData = {
        ...formData,
        cha_tipo: Number(formData.cha_tipo),
        cha_cliente: Number(formData.cha_cliente),
        cha_produto: formData.cha_produto ? Number(formData.cha_produto) : undefined,
      };

      if (chamado) {
        await ChamadoService.updateChamado(chamado.cha_id, submitData);
      } else {
        await ChamadoService.createChamado(submitData);
      }

      onSubmit();
    } catch (error) {
      console.error('Erro ao salvar chamado:', error);
      alert('Erro ao salvar chamado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Tipo de Chamado"
          required
          value={formData.cha_tipo}
          onChange={(value) => handleChange('cha_tipo', value)}
          options={tipos.map(tipo => ({
            value: tipo.tch_id,
            label: tipo.tch_descricao
          }))}
          placeholder="Selecione o tipo"
          error={errors.cha_tipo}
        />

        <CustomSelect
          label="Cliente"
          required
          value={formData.cha_cliente}
          onChange={(value) => handleChange('cha_cliente', value)}
          options={clientes.map(cliente => ({
            value: cliente.cli_id,
            label: cliente.cli_nome
          }))}
          placeholder="Selecione o cliente"
          error={errors.cha_cliente}
        />

        <CustomSelect
          label="Produto"
          required
          value={formData.cha_produto}
          onChange={(value) => handleChange('cha_produto', value)}
          options={produtos.map(produto => ({
            value: produto.pro_id,
            label: produto.pro_nome
          }))}
          placeholder="Selecione o produto"
          disabled={!formData.cha_cliente}
        />

        <Input
          label="DT (Identificador da Jiga)"
          required
          value={formData.cha_DT}
          onChange={(e) => handleChange('cha_DT', e.target.value)}
          placeholder="Ex: 000999"
        />

        <CustomSelect
          label="Local"
          required
          value={formData.local_chamado}
          onChange={(value) => handleChange('local_chamado', value)}
          options={locais.map(local => ({
            value: local.loc_id,
            label: local.loc_nome
          }))}
          placeholder="Selecione o local do chamado"
        />
      </div>

      <div>
        <label className="form-label">Descrição</label>
        <textarea
          className={`form-input min-h-[120px] resize-y ${errors.cha_descricao ? 'border-red-500' : ''}`}
          required
          value={formData.cha_descricao}
          onChange={(e) => handleChange('cha_descricao', e.target.value)}
          placeholder="Descreva detalhadamente o problema ou solicitação..."
        />
        {errors.cha_descricao && (
          <p className="form-error">{errors.cha_descricao}</p>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-secondary-200">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={loading}
          disabled={loading}
        >
          {chamado ? 'Atualizar' : 'Criar'} Chamado
        </Button>
      </div>
    </form>
  );
};

export default ChamadoForm;