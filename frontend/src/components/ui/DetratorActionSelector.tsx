import React, { useState, useEffect } from 'react';
import { Select } from '../ui';
import { ChamadoService } from '../../services/chamadoService';

interface Detrator {
  dtr_id: number;
  dtr_descricao: string;
  dtr_tipo: number | null;
  tch_descricao: string | null;
  dtr_indicador: number;
}

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

  // Carregar detratores quando o tipo de chamado mudar
  useEffect(() => {
    const loadDetratores = async () => {
      if (!tipoChamadoId) {
        setDetratores([]);
        return;
      }

      try {
        setLoading(true);
        const detratoresData = await ChamadoService.getDetratoresByTipo(tipoChamadoId);
        // setDetratores(detratoresData);
        setDetratores(detratoresData.map(data => ({
          dtr_id: data.dtr_id,
          dtr_descricao: data.dtr_descricao,
          dtr_tipo: null, // Adjust this field based on your data structure
          tch_descricao: null, // Adjust this field based on your data structure
          dtr_indicador: 0 // Adjust this field based on your data structure
        })));
      } catch (error) {
        console.error('Erro ao carregar detratores:', error);
        setDetratores([]);
      } finally {
        setLoading(false);
      }
    };

    loadDetratores();
  }, [tipoChamadoId]);

  const getDetractorLabel = (detrator: Detrator) => {
    // Lógica similar ao Python: detratores com indicador 1 são críticos (bold)
    const criticoSuffix = detrator.dtr_indicador === 1 ? ' 🔴' : '';
    return `${detrator.dtr_descricao}${criticoSuffix}`;
  };

  const getDetractorStyle = (detrator: Detrator) => {
    // Detratores com indicador 0 ficam acinzentados (como no Python)
    if (detrator.dtr_indicador === 0) {
      return 'text-gray-400';
    }
    // Detratores com indicador 1 ficam em negrito (críticos)
    if (detrator.dtr_indicador === 1) {
      return 'font-bold text-red-600';
    }
    return '';
  };

  return (
    <div className="space-y-2">
      <Select
        label="Detrator *"
        placeholder={loading ? "Carregando detratores..." : "Selecione o detrator"}
        value={selectedDetrator || ''}
        onChange={(value) => onDetratorChange(value ? Number(value) : undefined)}
        options={detratores.map(detrator => ({
          value: detrator.dtr_id,
          label: getDetractorLabel(detrator),
          className: getDetractorStyle(detrator)
        }))}
        disabled={disabled || loading || !tipoChamadoId}
      />

      {selectedDetrator && (
        <div className="text-xs text-gray-600">
          {(() => {
            const detrator = detratores.find(d => d.dtr_id === selectedDetrator);
            if (!detrator) return null;
            
            if (detrator.dtr_indicador === 1) {
              return (
                <div className="bg-red-50 border border-red-200 p-2 rounded text-red-800">
                  ⚠️ Detrator crítico - impacta diretamente na produção
                </div>
              );
            } else if (detrator.dtr_indicador === 0) {
              return (
                <div className="bg-gray-50 border border-gray-200 p-2 rounded text-gray-600">
                  ℹ️ Detrator informativo
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}
    </div>
  );
};

export default SeletorDetrator;