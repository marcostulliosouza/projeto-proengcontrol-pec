/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Modal, Button, Input } from '../ui';
import { ManutencaoService, type DispositivoManutencao } from '../../services/manutencaoService';

interface IniciarManutencaoModalProps {
  dispositivo: DispositivoManutencao;
  onClose: () => void;
  onSuccess: () => void;
}

const IniciarManutencaoModal: React.FC<IniciarManutencaoModalProps> = ({
  dispositivo,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    ciclosTotais: 0,
    dataUltimaManutencao: dispositivo.dim_data_ultima_manutencao || '',
    tipoIntervalo: dispositivo.dim_tipo_intervalo,
    intervaloDias: dispositivo.dim_intervalo_dias,
    intervaloPlacas: dispositivo.dim_intervalo_placas,
    placasExecutadas: dispositivo.dim_placas_executadas
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await ManutencaoService.iniciarManutencao({
        dispositivoId: dispositivo.dis_id,
        ...formData
      });
      onSuccess();
    } catch (error) {
      console.error('Erro ao iniciar manutenção:', error);
      alert('Erro ao iniciar manutenção');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Iniciar Manutenção Preventiva"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações do Dispositivo */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">📱 Dispositivo Selecionado</h4>
          <p className="text-blue-800">
            <strong>{dispositivo.dis_descricao}</strong>
          </p>
          <div className="text-sm text-blue-700 mt-2 space-y-1">
            <p>Tipo de intervalo: <strong>{dispositivo.dim_tipo_intervalo === 'DIA' ? 'Por Dias' : 'Por Placas'}</strong></p>
            <p>
              Situação: {dispositivo.necessita_manutencao 
                ? <span className="text-red-600 font-medium">⚠️ Manutenção necessária</span>
                : <span className="text-green-600 font-medium">✅ Em dia</span>
              }
            </p>
          </div>
        </div>

        {/* Dados da Manutenção */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Ciclos Totais Executados"
            type="number"
            value={formData.ciclosTotais}
            onChange={(e) => handleChange('ciclosTotais', parseInt(e.target.value) || 0)}
            min="0"
          />

          <Input
            label="Data da Última Manutenção"
            type="date"
            value={formData.dataUltimaManutencao}
            onChange={(e) => handleChange('dataUltimaManutencao', e.target.value)}
          />

          {formData.tipoIntervalo === 'DIA' ? (
            <Input
              label="Intervalo em Dias"
              type="number"
              value={formData.intervaloDias}
              onChange={(e) => handleChange('intervaloDias', parseInt(e.target.value) || 0)}
              min="1"
              disabled
            />
          ) : (
            <Input
              label="Intervalo em Placas"
              type="number"
              value={formData.intervaloPlacas}
              onChange={(e) => handleChange('intervaloPlacas', parseInt(e.target.value) || 0)}
              min="1"
              disabled
            />
          )}

          <Input
            label="Placas Executadas"
            type="number"
            value={formData.placasExecutadas}
            onChange={(e) => handleChange('placasExecutadas', parseInt(e.target.value) || 0)}
            min="0"
            disabled
          />
        </div>

        {/* Aviso */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-yellow-800 text-sm">
            ⚠️ Ao iniciar a manutenção, um registro será criado e o timer será iniciado. 
            Certifique-se de ter tempo disponível para completar o processo.
          </p>
        </div>

        {/* Botões */}
        <div className="flex justify-end space-x-3">
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
            variant="warning"
            loading={loading}
            disabled={loading}
          >
            🔧 Iniciar Manutenção
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default IniciarManutencaoModal;