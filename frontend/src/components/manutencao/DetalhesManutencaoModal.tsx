import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../ui';
import { ManutencaoService, type ManutencaoPreventiva, type RespostaItem } from '../../services/manutencaoService';

interface DetalhesManutencaoModalProps {
  manutencaoId: number;
  onClose: () => void;
}

const DetalhesManutencaoModal: React.FC<DetalhesManutencaoModalProps> = ({
  manutencaoId,
  onClose
}) => {
  const [detalhes, setDetalhes] = useState<{
    manutencao: ManutencaoPreventiva;
    respostas: RespostaItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDetalhes();
  }, [manutencaoId]);

  const loadDetalhes = async () => {
    try {
      setLoading(true);
      const data = await ManutencaoService.getDetalhesManutencao(manutencaoId);
      setDetalhes(data);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuracao = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    
    if (horas > 0) {
      return `${horas}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const getStatusConfig = (status: number) => {
    const configs = {
      1: { label: 'Em Andamento', class: 'bg-blue-100 text-blue-800', icon: '🔄' },
      2: { label: 'Finalizada', class: 'bg-green-100 text-green-800', icon: '✅' },
      3: { label: 'Cancelada', class: 'bg-red-100 text-red-800', icon: '❌' }
    };
    
    return configs[status as keyof typeof configs] || { label: 'Desconhecido', class: 'bg-gray-100 text-gray-800', icon: '❓' };
  };

  if (loading || !detalhes) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Carregando..." size="lg">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando detalhes da manutenção...</p>
          </div>
        </div>
      </Modal>
    );
  }

  const { manutencao, respostas } = detalhes;
  const statusConfig = getStatusConfig(manutencao.lmd_status);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Detalhes da Manutenção #${manutencao.lmd_id}`}
      size="xl"
    >
      <div className="space-y-6 max-h-[80vh] overflow-y-auto">
        {/* Informações Gerais */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">📱 Informações do Dispositivo</h4>
              <div className="space-y-2 text-sm">
                <p><strong>Dispositivo:</strong> {manutencao.dispositivo_descricao}</p>
                <p><strong>Tipo:</strong> {manutencao.lmd_tipo_manutencao}</p>
                <p><strong>Ciclos Executados:</strong> {manutencao.lmd_ciclos_totais_executados}</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">👤 Informações da Execução</h4>
              <div className="space-y-2 text-sm">
                <p><strong>Responsável:</strong> {manutencao.colaborador_nome}</p>
                <p>
                  <strong>Status:</strong> 
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${statusConfig.class}`}>
                    {statusConfig.icon} {statusConfig.label}
                  </span>
                </p>
                <p><strong>Duração:</strong> {formatDuracao(manutencao.duracao_total || 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">⏰ Timeline da Manutenção</h4>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm">🚀</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Manutenção Iniciada</p>
                <p className="text-sm text-gray-600">
                  {new Date(manutencao.lmd_data_hora_inicio).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            
            {manutencao.lmd_data_hora_fim && (
              <div className="flex items-center space-x-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  manutencao.lmd_status === 2 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <span className={`text-sm ${
                    manutencao.lmd_status === 2 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {manutencao.lmd_status === 2 ? '✅' : '❌'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Manutenção {manutencao.lmd_status === 2 ? 'Finalizada' : 'Cancelada'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(manutencao.lmd_data_hora_fim).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Observação */}
        {manutencao.lmd_observacao && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">📝 Observação Geral</h4>
            <p className="text-blue-800 whitespace-pre-wrap">
              {manutencao.lmd_observacao}
            </p>
          </div>
        )}

        {/* Checklist de Respostas */}
        {respostas.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4">✅ Checklist de Manutenção</h4>
            <div className="space-y-4">
              {respostas.map((resposta, index) => (
                <div key={resposta.rif_item} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {index + 1}. {resposta.item_descricao}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      resposta.rif_ok === 1 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {resposta.rif_ok === 1 ? '✅ OK' : '❌ Não OK'}
                    </span>
                  </div>
                  
                  {resposta.rif_observacao && (
                    <div className="mt-2 bg-gray-50 rounded p-2">
                      <p className="text-xs font-medium text-gray-700 mb-1">Observação:</p>
                      <p className="text-sm text-gray-800">{resposta.rif_observacao}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botão Fechar */}
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DetalhesManutencaoModal;