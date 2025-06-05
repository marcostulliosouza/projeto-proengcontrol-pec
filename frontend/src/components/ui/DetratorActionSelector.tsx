// components/ui/DetratorActionSelector.tsx - Ordenação alfabética

import React, { useState, useEffect } from 'react';
import CustomSelect from './CustomSelect';
import { ChamadoService, type Detrator } from '../../services/chamadoService';

// Removed local Detrator interface as it is now imported from ChamadoService

interface SeletorDetratorProps {
  tipoChamadoId: number;
  selectedDetrator?: number;
  onDetratorChange: (detratorId: number | undefined) => void;
  disabled?: boolean;
}

const SeletorDetrator: React.FC<SeletorDetratorProps> = ({
  tipoChamadoId,
  selectedDetrator,
  onDetratorChange,
  disabled = false
}) => {
  const [detratores, setDetratores] = useState<Detrator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDetratores = async () => {
      if (!tipoChamadoId) {
        setDetratores([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const detratoresData = await ChamadoService.getDetratoresByTipo(tipoChamadoId);
        setDetratores(detratoresData);
      } catch (error) {
        console.error('Erro ao carregar detratores:', error);
        setError('Erro ao carregar detratores');
        setDetratores([]);
      } finally {
        setLoading(false);
      }
    };

    loadDetratores();
  }, [tipoChamadoId]);

  useEffect(() => {
    if (selectedDetrator && detratores.length > 0) {
      const exists = detratores.find(d => d.dtr_id === selectedDetrator);
      if (!exists) {
        onDetratorChange(undefined);
      }
    }
  }, [detratores, selectedDetrator, onDetratorChange]);

  const getDetractorStyle = (detrator: Detrator) => {
    // Indicador 0 fica cinza
    if (detrator.dtr_indicador === 0) {
      return 'text-gray-400';
    }
    return '';
  };

  // Ordenação APENAS alfabética crescente
  const detratoresOrdenados = [...detratores].sort((a, b) => 
    a.dtr_descricao.localeCompare(b.dtr_descricao, 'pt-BR', { sensitivity: 'base' })
  );

  if (error) {
    return (
      <div className="space-y-2">
        <label className="form-label text-red-600">Detrator *</label>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="form-label">Detrator</label>
        <div className="form-input bg-gray-50 text-gray-500 cursor-not-allowed flex items-center">
          <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mr-2"></div>
          Carregando detratores...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <CustomSelect
        label="Detrator"
        placeholder={
          !tipoChamadoId ? "Selecione um tipo de chamado primeiro" :
          detratores.length === 0 ? "Nenhum detrator disponível" :
          "Selecione o detrator que melhor descreve a situação"
        }
        value={selectedDetrator || ''}
        onChange={(value) => onDetratorChange(value ? Number(value) : undefined)}
        options={detratoresOrdenados.map(detrator => ({
          value: detrator.dtr_id,
          label: detrator.dtr_descricao,
          className: getDetractorStyle(detrator)
        }))}
        disabled={disabled || !tipoChamadoId || detratores.length === 0}
        required
        helperText={detratores.length > 0 ? `${detratores.length} detratores disponíveis. Use a busca para encontrar rapidamente.` : undefined}
      />

      {!loading && tipoChamadoId && detratores.length === 0 && (
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border border-dashed border-gray-300">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Nenhum detrator configurado para este tipo de chamado</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeletorDetrator;