/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Modal } from '../ui';
import { ManutencaoService, type ManutencaoPreventiva, type ItemFormulario, type RespostaItem } from '../../services/manutencaoService';

interface ManutencaoAtivaProps {
  manutencao: ManutencaoPreventiva;
  onFinished: () => void;
  onCancelled: () => void;
}

const ManutencaoAtiva: React.FC<ManutencaoAtivaProps> = ({
  manutencao,
  onFinished,
  onCancelled
}) => {
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [itensFormulario, setItensFormulario] = useState<ItemFormulario[]>([]);
  const [respostas, setRespostas] = useState<RespostaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);

  useEffect(() => {
    // Calcular tempo decorrido
    const calcularTempo = () => {
      const inicio = new Date(manutencao.lmd_data_hora_inicio);
      const agora = new Date();
      const diferenca = Math.floor((agora.getTime() - inicio.getTime()) / 1000 / 60); // em minutos
      setTempoDecorrido(diferenca);
    };

    calcularTempo();
    const interval = setInterval(calcularTempo, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, [manutencao.lmd_data_hora_inicio]);

  useEffect(() => {
    // Carregar formulário se necessário
    loadFormulario();
  }, []);

  const loadFormulario = async () => {
    try {
      // Aqui você carregaria o formulário baseado no dispositivo
      // Para este exemplo, vamos criar itens básicos
      const itensBasicos: ItemFormulario[] = [
        { ifm_id: 1, ifm_formulario: 1, ifm_descricao: 'Verificar estado geral do dispositivo', ifm_posicao: 1 },
        { ifm_id: 2, ifm_formulario: 1, ifm_descricao: 'Limpar componentes internos', ifm_posicao: 2 },
        { ifm_id: 3, ifm_formulario: 1, ifm_descricao: 'Verificar conexões elétricas', ifm_posicao: 3 },
        { ifm_id: 4, ifm_formulario: 1, ifm_descricao: 'Testar funcionalidades principais', ifm_posicao: 4 }
      ];
      
      setItensFormulario(itensBasicos);
      
      // Inicializar respostas
      const respostasIniciais = itensBasicos.map(item => ({
        rif_item: item.ifm_id,
        rif_log_manutencao: manutencao.lmd_id,
        rif_ok: 1,
        rif_observacao: ''
      }));
      
      setRespostas(respostasIniciais);
    } catch (error) {
      console.error('Erro ao carregar formulário:', error);
    }
  };

  const handleFinalizarClick = () => {
    if (!observacao.trim()) {
      alert('Por favor, adicione uma observação sobre a manutenção realizada.');
      return;
    }
    setShowFinalizarModal(true);
  };

  const handleFinalizar = async () => {
    try {
      setLoading(true);
      await ManutencaoService.finalizarManutencao(
        manutencao.lmd_id,
        observacao,
        respostas
      );
      setShowFinalizarModal(false);
      onFinished();
    } catch (error) {
      console.error('Erro ao finalizar manutenção:', error);
      alert('Erro ao finalizar manutenção');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async () => {
    if (!confirm('Tem certeza que deseja cancelar esta manutenção? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setLoading(true);
      await ManutencaoService.cancelarManutencao(manutencao.lmd_id);
      onCancelled();
    } catch (error) {
      console.error('Erro ao cancelar manutenção:', error);
      alert('Erro ao cancelar manutenção');
    } finally {
      setLoading(false);
    }
  };

  const updateResposta = (itemId: number, field: string, value: any) => {
    setRespostas(prev => prev.map(resposta => 
      resposta.rif_item === itemId 
        ? { ...resposta, [field]: value }
        : resposta
    ));
  };

  const formatTempo = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    
    if (horas > 0) {
      return `${horas}h ${mins}min`;
    }
    return `${mins}min`;
  };

  return (
    <>
      <Card className="border-l-4 border-l-orange-500 bg-orange-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
            <h2 className="text-lg font-semibold text-orange-900">
              Manutenção em Andamento
            </h2>
          </div>
          <div className="text-sm text-orange-700">
            Tempo decorrido: <strong>{formatTempo(tempoDecorrido)}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-medium text-orange-900 mb-2">📱 Dispositivo</h3>
            <p className="text-orange-800">{manutencao.dispositivo_descricao}</p>
          </div>
          <div>
            <h3 className="font-medium text-orange-900 mb-2">⏰ Iniciado em</h3>
            <p className="text-orange-800">
              {new Date(manutencao.lmd_data_hora_inicio).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Checklist de Manutenção */}
        {itensFormulario.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium text-orange-900 mb-3">✅ Checklist de Manutenção</h3>
            <div className="space-y-3">
              {itensFormulario.map((item, index) => {
                const resposta = respostas.find(r => r.rif_item === item.ifm_id);
                
                return (
                  <div key={item.ifm_id} className="bg-white border border-orange-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {index + 1}. {item.ifm_descricao}
                      </span>
                      <div className="flex space-x-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`item_${item.ifm_id}`}
                            checked={resposta?.rif_ok === 1}
                            onChange={() => updateResposta(item.ifm_id, 'rif_ok', 1)}
                            className="mr-1"
                          />
                          <span className="text-green-600 text-sm">✅ OK</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`item_${item.ifm_id}`}
                            checked={resposta?.rif_ok === 0}
                            onChange={() => updateResposta(item.ifm_id, 'rif_ok', 0)}
                            className="mr-1"
                          />
                          <span className="text-red-600 text-sm">❌ Não OK</span>
                        </label>
                      </div>
                    </div>
                    
                    <Input
                      placeholder="Observação (opcional)"
                      value={resposta?.rif_observacao || ''}
                      onChange={(e) => updateResposta(item.ifm_id, 'rif_observacao', e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Observação Geral */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-orange-900 mb-2">
            📝 Observação Geral da Manutenção *
          </label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Descreva o que foi realizado na manutenção, problemas encontrados, peças trocadas, etc."
            className="w-full p-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={4}
            required
          />
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={handleCancelar}
            disabled={loading}
          >
            ❌ Cancelar Manutenção
          </Button>
          <Button
            variant="warning"
            onClick={handleFinalizarClick}
            disabled={loading || !observacao.trim()}
          >
            ✅ Finalizar Manutenção
          </Button>
        </div>
      </Card>

      {/* Modal de Confirmação */}
      {showFinalizarModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowFinalizarModal(false)}
          title="Confirmar Finalização"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Tem certeza que deseja finalizar esta manutenção? 
              Esta ação não pode ser desfeita.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Dispositivo:</strong> {manutencao.dispositivo_descricao}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Tempo total:</strong> {formatTempo(tempoDecorrido)}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Observação:</strong> {observacao}
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowFinalizarModal(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                variant="warning"
                onClick={handleFinalizar}
                loading={loading}
                disabled={loading}
              >
                ✅ Confirmar Finalização
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ManutencaoAtiva;
