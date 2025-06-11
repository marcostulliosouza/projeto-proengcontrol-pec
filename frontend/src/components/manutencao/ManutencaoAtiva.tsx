/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Modal } from '../ui';
import { ManutencaoService, type ManutencaoPreventiva, type ItemFormulario, type RespostaItem, type DispositivoDetalhes } from '../../services/manutencaoService';

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
  const [expandedCard, setExpandedCard] = useState(true);
  const [currentStep, setCurrentStep] = useState<'checklist' | 'observacao' | 'finalizar'>('checklist');

  // Para informações do dispositivo e formulário
  const [dispositivoDetalhes, setDispositivoDetalhes] = useState<DispositivoDetalhes | null>(null);
  const [loadingFormulario, setLoadingFormulario] = useState(true);
  const [formularioError, setFormularioError] = useState<string | null>(null);

  useEffect(() => {
    const calcularTempo = () => {
      const inicio = new Date(manutencao.lmd_data_hora_inicio);
      const agora = new Date();
      const diferenca = Math.floor((agora.getTime() - inicio.getTime()) / 1000 / 60);
      setTempoDecorrido(diferenca);
    };

    calcularTempo();
    const interval = setInterval(calcularTempo, 60000);
    return () => clearInterval(interval);
  }, [manutencao.lmd_data_hora_inicio]);

  useEffect(() => {
    loadFormulario();
  }, []);

  // ✅ MÉTODO COMPLETAMENTE REESCRITO - Carrega formulário real do banco
  const loadFormulario = async () => {
    try {
      setLoadingFormulario(true);
      setFormularioError(null);

      console.log('🔍 Carregando detalhes do dispositivo:', manutencao.lmd_dispositivo);

      // 1. Buscar detalhes completos do dispositivo
      const dispositivoDetalhes = await ManutencaoService.getDispositivoDetalhes(manutencao.lmd_dispositivo);
      setDispositivoDetalhes(dispositivoDetalhes);

      console.log('📋 Dispositivo carregado:', dispositivoDetalhes);
      console.log('📝 Formulário ID:', dispositivoDetalhes.dim_formulario_manutencao);

      let itensCarregados: ItemFormulario[] = [];

      // 2. Tentar carregar itens do formulário específico do dispositivo
      if (dispositivoDetalhes.dim_formulario_manutencao) {
        try {
          console.log('🔎 Buscando itens do formulário:', dispositivoDetalhes.dim_formulario_manutencao);
          
          itensCarregados = await ManutencaoService.getItensFormulario(dispositivoDetalhes.dim_formulario_manutencao);
          
          console.log('✅ Itens do formulário carregados:', itensCarregados);

          if (itensCarregados.length === 0) {
            console.log('⚠️ Formulário configurado mas sem itens, usando formulário básico');
            throw new Error('Formulário configurado mas não possui itens');
          }

        } catch (formularioError) {
          console.log('❌ Erro ao carregar formulário específico:', formularioError);
          setFormularioError('Erro ao carregar formulário específico. Usando formulário básico.');
          itensCarregados = [];
        }
      }

      // 3. Se não conseguiu carregar formulário específico, usar formulário básico
      if (itensCarregados.length === 0) {
        console.log('📝 Usando formulário básico padrão');
        
        const itensBasicos: ItemFormulario[] = [
          { ifm_id: 1, ifm_formulario: 1, ifm_descricao: 'Verificar estado geral do dispositivo', ifm_posicao: 1 },
          { ifm_id: 2, ifm_formulario: 1, ifm_descricao: 'Limpar componentes internos', ifm_posicao: 2 },
          { ifm_id: 3, ifm_formulario: 1, ifm_descricao: 'Verificar conexões elétricas', ifm_posicao: 3 },
          { ifm_id: 4, ifm_formulario: 1, ifm_descricao: 'Testar funcionalidades principais', ifm_posicao: 4 },
          { ifm_id: 5, ifm_formulario: 1, ifm_descricao: 'Verificar calibração e ajustes', ifm_posicao: 5 },
          { ifm_id: 6, ifm_formulario: 1, ifm_descricao: 'Documentar irregularidades encontradas', ifm_posicao: 6 }
        ];
        
        itensCarregados = itensBasicos;
        setFormularioError('Usando formulário básico padrão');
      }

      // 4. Configurar os itens do formulário
      setItensFormulario(itensCarregados);

      // 5. Inicializar respostas baseadas nos itens carregados
      const respostasIniciais = itensCarregados.map(item => ({
        rif_item: item.ifm_id,
        rif_log_manutencao: manutencao.lmd_id,
        rif_ok: 1, // OK por padrão
        rif_observacao: ''
      }));
      
      setRespostas(respostasIniciais);

      console.log('✅ Formulário carregado com sucesso:', {
        totalItens: itensCarregados.length,
        formularioId: dispositivoDetalhes.dim_formulario_manutencao,
        formularioNome: dispositivoDetalhes.formulario_descricao
      });

    } catch (error) {
      console.error('❌ Erro crítico ao carregar formulário:', error);
      setFormularioError('Erro ao carregar formulário. Usando formulário básico de emergência.');
      
      // 6. Em caso de erro crítico, usar formulário de emergência
      const itensEmergencia: ItemFormulario[] = [
        { ifm_id: 1, ifm_formulario: 1, ifm_descricao: 'Verificar funcionamento geral', ifm_posicao: 1 },
        { ifm_id: 2, ifm_formulario: 1, ifm_descricao: 'Realizar limpeza básica', ifm_posicao: 2 },
        { ifm_id: 3, ifm_formulario: 1, ifm_descricao: 'Testar funcionalidades principais', ifm_posicao: 3 }
      ];
      
      setItensFormulario(itensEmergencia);
      
      const respostasEmergencia = itensEmergencia.map(item => ({
        rif_item: item.ifm_id,
        rif_log_manutencao: manutencao.lmd_id,
        rif_ok: 1,
        rif_observacao: ''
      }));
      
      setRespostas(respostasEmergencia);
    } finally {
      setLoadingFormulario(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 'checklist') {
      const allCompleted = respostas.every(r => r.rif_ok !== undefined);
      if (!allCompleted) {
        alert('Por favor, complete todos os itens do checklist antes de continuar.');
        return;
      }
      setCurrentStep('observacao');
    } else if (currentStep === 'observacao') {
      if (!observacao.trim()) {
        alert('Por favor, adicione uma observação sobre a manutenção realizada.');
        return;
      }
      setCurrentStep('finalizar');
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 'observacao') {
      setCurrentStep('checklist');
    } else if (currentStep === 'finalizar') {
      setCurrentStep('observacao');
    }
  };

  const handleFinalizar = async () => {
    try {
      setLoading(true);
      
      // ✅ GARANTIR QUE TODAS AS RESPOSTAS TENHAM VALORES CORRETOS
      const respostasCorrigidas = respostas.map(resposta => ({
        ...resposta,
        rif_ok: Number(resposta.rif_ok), // Garantir que é number
        rif_observacao: resposta.rif_observacao || '' // Garantir que não é null
      }));
  
      console.log('🔍 Respostas sendo enviadas:', respostasCorrigidas);
  
      await ManutencaoService.finalizarManutencao(
        manutencao.lmd_id,
        observacao,
        respostasCorrigidas
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
        ? { 
            ...resposta, 
            [field]: field === 'rif_ok' ? Number(value) : value // ✅ GARANTIR QUE É NUMBER
          }
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

  const getProgressPercentage = () => {
    if (currentStep === 'checklist') return 33;
    if (currentStep === 'observacao') return 66;
    return 100;
  };

  const getChecklistProgress = () => {
    const completed = respostas.filter(r => r.rif_ok !== undefined).length;
    return Math.round((completed / respostas.length) * 100);
  };

  return (
    <>
      <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-amber-50 shadow-lg">
        {/* Header Collapsible */}
        <div 
          className="flex items-center justify-between cursor-pointer p-1 -m-1 rounded hover:bg-orange-100 transition-colors"
          onClick={() => setExpandedCard(!expandedCard)}
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-4 h-4 bg-orange-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-4 h-4 bg-orange-300 rounded-full animate-ping"></div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-orange-900 flex items-center">
                🔧 Manutenção em Andamento
                <span className="ml-2 text-sm bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                  {formatTempo(tempoDecorrido)}
                </span>
              </h2>
              <p className="text-orange-700 text-sm">{manutencao.dispositivo_descricao}</p>
              
              {/* ✅ MOSTRAR INFORMAÇÕES DO FORMULÁRIO */}
              {dispositivoDetalhes && (
                <p className="text-orange-600 text-xs mt-1">
                  📋 {dispositivoDetalhes.formulario_descricao} 
                  {formularioError && <span className="text-orange-500"> • {formularioError}</span>}
                </p>
              )}
            </div>
          </div>
          <Button variant="secondary" size="sm">
            {expandedCard ? '▼' : '▶'}
          </Button>
        </div>

        {expandedCard && (
          <div className="mt-6 space-y-6">
            {/* ✅ MOSTRAR LOADING DO FORMULÁRIO */}
            {loadingFormulario && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-blue-800 text-sm">Carregando formulário do dispositivo...</span>
                </div>
              </div>
            )}

            {/* ✅ MOSTRAR INFORMAÇÕES DO DISPOSITIVO E FORMULÁRIO */}
            {dispositivoDetalhes && !loadingFormulario && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="font-medium text-gray-900 mb-2">📱 Informações do Dispositivo</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Código SAP:</span>
                    <span className="ml-2 font-medium">{dispositivoDetalhes.dis_codigo_sap || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Cliente:</span>
                    <span className="ml-2 font-medium">{dispositivoDetalhes.cliente_nome || 'Hi-Mix'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tipo Intervalo:</span>
                    <span className="ml-2 font-medium">{dispositivoDetalhes.dim_tipo_intervalo}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Formulário:</span>
                    <span className="ml-2 font-medium">{dispositivoDetalhes.formulario_descricao}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Progresso da Manutenção ({itensFormulario.length} itens)
                </span>
                <span className="text-sm text-gray-500">{getProgressPercentage()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span className={currentStep === 'checklist' ? 'text-orange-600 font-medium' : ''}>
                  1. Checklist
                </span>
                <span className={currentStep === 'observacao' ? 'text-orange-600 font-medium' : ''}>
                  2. Observações
                </span>
                <span className={currentStep === 'finalizar' ? 'text-orange-600 font-medium' : ''}>
                  3. Finalizar
                </span>
              </div>
            </div>

            {/* Step Content */}
            {currentStep === 'checklist' && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    ✅ Checklist de Manutenção
                  </h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getChecklistProgress()}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{getChecklistProgress()}%</span>
                  </div>
                </div>

                <div className="grid gap-4">
                  {itensFormulario.map((item, index) => {
                    const resposta = respostas.find(r => r.rif_item === item.ifm_id);
                    const isCompleted = resposta?.rif_ok !== undefined;
                    
                    return (
                      <div 
                        key={item.ifm_id} 
                        className={`border-2 rounded-lg p-4 transition-all duration-200 ${
                          isCompleted 
                            ? resposta?.rif_ok === 1 // ✅ CORRIGIDO: Era === true
                              ? 'border-green-200 bg-green-50' 
                              : 'border-red-200 bg-red-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              isCompleted 
                                ? resposta?.rif_ok === 1 // ✅ CORRIGIDO: Era === true
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-red-500 text-white'
                                : 'bg-gray-300 text-gray-600'
                            }`}>
                              {isCompleted ? (resposta?.rif_ok === 1 ? '✓' : '✗') : index + 1} {/* ✅ CORRIGIDO */}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{item.ifm_descricao}</p>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                          <button
                            onClick={() => updateResposta(item.ifm_id, 'rif_ok', 1)} // ✅ NÚMERO 1
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              resposta?.rif_ok === 1 
                                ? 'bg-green-500 text-white shadow-md'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            ✅ OK
                          </button>

                          <button
                            onClick={() => updateResposta(item.ifm_id, 'rif_ok', 0)} // ✅ NÚMERO 0
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              resposta?.rif_ok === 0 
                                ? 'bg-red-500 text-white shadow-md'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            ❌ Não OK
                          </button>
                          </div>
                        </div>
                        
                        <Input
                          placeholder="Observação específica (opcional)"
                          value={resposta?.rif_observacao || ''}
                          onChange={(e) => updateResposta(item.ifm_id, 'rif_observacao', e.target.value)}
                          className="mt-2"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {currentStep === 'observacao' && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  📝 Observações Gerais da Manutenção
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Relatório detalhado da manutenção realizada *
                    </label>
                    <textarea
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      placeholder="Descreva detalhadamente:&#10;• Procedimentos realizados&#10;• Problemas encontrados&#10;• Peças trocadas ou ajustadas&#10;• Recomendações para próximas manutenções"
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                      rows={8}
                      required
                    />
                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                      <span>Mínimo recomendado: 50 caracteres</span>
                      <span>{observacao.length} caracteres</span>
                    </div>
                  </div>
                  
                  {observacao.length < 50 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-yellow-800 text-sm">
                        💡 Dica: Adicione mais detalhes para um relatório completo da manutenção
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 'finalizar' && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  🎯 Resumo da Manutenção
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">📋 Checklist Realizado</h4>
                    <div className="space-y-2">
                      {respostas.map((resposta) => {
                        const item = itensFormulario.find(i => i.ifm_id === resposta.rif_item);
                        return (
                          <div key={resposta.rif_item} className="flex items-center space-x-2 text-sm">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                              resposta.rif_ok === 1 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600' // ✅ CORRIGIDO
                            }`}>
                              {resposta.rif_ok === 1 ? '✓' : '✗'} {/* ✅ CORRIGIDO */}
                            </span>
                            <span className="text-gray-700">{item?.ifm_descricao}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">📊 Informações</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Dispositivo:</strong> {manutencao.dispositivo_descricao}</p>
                      <p><strong>Duração:</strong> {formatTempo(tempoDecorrido)}</p>
                      <p><strong>Itens OK:</strong> {respostas.filter(r => r.rif_ok === 1).length}/{respostas.length}</p> {/* ✅ CORRIGIDO */}
                      <p><strong>Observações:</strong> {observacao.length} caracteres</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    ✨ Pronto para finalizar! Verifique se todas as informações estão corretas antes de confirmar.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <div className="flex space-x-2">
                {currentStep !== 'checklist' && (
                  <Button
                    variant="secondary"
                    onClick={handlePrevStep}
                    disabled={loading}
                  >
                    ← Voltar
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={handleCancelar}
                  disabled={loading}
                  className="text-red-600 hover:bg-red-50"
                >
                  ❌ Cancelar Manutenção
                </Button>
              </div>
              
              <div>
                {currentStep !== 'finalizar' ? (
                  <Button
                    variant="warning"
                    onClick={handleNextStep}
                    disabled={loading}
                  >
                    Continuar →
                  </Button>
                ) : (
                  <Button
                    variant="warning"
                    onClick={() => setShowFinalizarModal(true)}
                    disabled={loading}
                  >
                    ✅ Finalizar Manutenção
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Confirmação */}
      {showFinalizarModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowFinalizarModal(false)}
          title="🎯 Confirmar Finalização da Manutenção"
          size="lg"
        >
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">✅ Manutenção Concluída</h4>
              <p className="text-green-800 text-sm">
                Todos os procedimentos foram realizados e documentados. Esta ação irá finalizar 
                definitivamente a manutenção e não poderá ser desfeita.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Dispositivo:</strong> {manutencao.dispositivo_descricao}</p>
                <p><strong>Tempo total:</strong> {formatTempo(tempoDecorrido)}</p>
              </div>
              <div>
                <p><strong>Itens verificados:</strong> {respostas.length}</p>
                <p><strong>Status OK:</strong> {respostas.filter(r => r.rif_ok === 1).length}</p> {/* ✅ CORRIGIDO */}
              </div>
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