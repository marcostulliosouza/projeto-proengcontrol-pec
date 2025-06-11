import React, { useState, useEffect, useCallback } from 'react';
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

  const loadDetalhes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ManutencaoService.getDetalhesManutencao(manutencaoId);
      setDetalhes(data);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    } finally {
      setLoading(false);
    }
  }, [manutencaoId]);

  useEffect(() => {
    loadDetalhes();
  }, [loadDetalhes]);

  const formatDuracao = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    
    if (horas > 0) {
      return `${horas}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const formatData = (data: string | null) => {
    if (!data) return 'Não informado';
    return new Date(data).toLocaleString('pt-BR');
  };

  const formatDataCurta = (data: string | null) => {
    if (!data) return 'Nunca';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const getStatusConfig = (status: number) => {
    const configs = {
      1: { 
        label: 'EM ANDAMENTO', 
        class: 'bg-blue-100 text-blue-800 border-blue-300', 
        icon: '🔄',
        bgClass: 'bg-blue-100',
        textClass: 'text-blue-600'
      },
      2: { 
        label: 'FINALIZADA', 
        class: 'bg-green-100 text-green-800 border-green-300', 
        icon: '✅',
        bgClass: 'bg-green-100',
        textClass: 'text-green-600'
      },
      3: { 
        label: 'CANCELADA', 
        class: 'bg-red-100 text-red-800 border-red-300', 
        icon: '❌',
        bgClass: 'bg-red-100',
        textClass: 'text-red-600'
      }
    };
    
    return configs[status as keyof typeof configs] || { 
      label: 'DESCONHECIDO', 
      class: 'bg-gray-100 text-gray-800 border-gray-300', 
      icon: '❓',
      bgClass: 'bg-gray-100',
      textClass: 'text-gray-600'
    };
  };

  const getTipoIntervaloInfo = (tipo?: string, intervaloDias?: number, intervaloPlacas?: number) => {
    if (tipo === 'DIA') {
      return {
        tipo: 'Por Tempo',
        intervalo: `${intervaloDias || 0} dias`,
        icon: '📅'
      };
    } else if (tipo === 'PLACA') {
      return {
        tipo: 'Por Placas',
        intervalo: `${intervaloPlacas || 0} placas`,
        icon: '🔢'
      };
    } else {
      return {
        tipo: 'Não definido',
        intervalo: 'Sem configuração',
        icon: '❓'
      };
    }
  };

  if (loading || !detalhes) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Carregando..." size="xl">
        <div className="flex items-center justify-center py-12">
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
  const tipoIntervaloInfo = getTipoIntervaloInfo(
    manutencao.lmd_tipo_intervalo_manutencao, 
    manutencao.lmd_intervalo_dias, 
    manutencao.lmd_intervalo_placas
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Manutenção #${manutencao.lmd_id}`}
      size="xl"
    >
      <div className="max-h-[80vh] overflow-y-auto space-y-6">
        {/* Header Principal */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              {/* Status Badge */}
              <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center space-x-2 ${statusConfig.class} border`}>
                <div className={`w-2 h-2 rounded-full ${
                  manutencao.lmd_status === 1 ? 'bg-blue-500 animate-pulse' :
                  manutencao.lmd_status === 2 ? 'bg-green-500' :
                  'bg-red-500'
                }`}></div>
                <span>{statusConfig.label}</span>
              </div>

              {/* Tipo de Manutenção */}
              <div className="px-3 py-1 rounded-lg text-xs font-bold bg-orange-100 text-orange-700 border border-orange-300">
                🔧 {manutencao.lmd_tipo_manutencao}
              </div>
            </div>

            {/* Timer em Tempo Real (se ativo) */}
            {manutencao.lmd_status === 1 && (
              <div className="text-right">
                <div className="text-3xl font-mono font-bold text-blue-600">
                  {formatDuracao(manutencao.duracao_total || 0)}
                </div>
                <div className="text-xs text-slate-500">Tempo decorrido</div>
              </div>
            )}
          </div>

          {/* Cards de Informações Principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-lg border">
              <div className="text-xs text-slate-500 font-medium">DT</div>
              <div className="text-sm font-semibold text-slate-900">
                {String(manutencao.lmd_dispositivo).padStart(6, '0') || 'Não informado'}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border">
              <div className="text-xs text-slate-500 font-medium">Dispositivo</div>
              <div className="text-sm font-semibold text-slate-900">
                {manutencao.dispositivo_descricao || 'Não informado'}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border">
              <div className="text-xs text-slate-500 font-medium">Responsável</div>
              <div className="text-sm font-semibold text-slate-900">
                {manutencao.colaborador_nome || 'Não informado'}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border">
              <div className="text-xs text-slate-500 font-medium">Duração</div>
              <div className="text-sm font-semibold text-slate-900">
                {formatDuracao(manutencao.duracao_total || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Informações de Configuração da Manutenção */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configuração da Manutenção
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Tipo de Intervalo */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">{tipoIntervaloInfo.icon}</span>
                <div className="text-xs text-purple-600 font-medium">Tipo de Intervalo</div>
              </div>
              <div className="text-sm font-semibold text-purple-900">{tipoIntervaloInfo.tipo}</div>
              <div className="text-xs text-purple-700">{tipoIntervaloInfo.intervalo}</div>
            </div>

            {/* Ciclos Executados */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">⚙️</span>
                <div className="text-xs text-blue-600 font-medium">Ciclos Executados</div>
              </div>
              <div className="text-sm font-semibold text-blue-900">
                {manutencao.lmd_ciclos_totais_executados || 0}
              </div>
              <div className="text-xs text-blue-700">no momento da manutenção</div>
            </div>
            

             {/* Progresso do Ciclo */}
             {(() => {
              let percentual = 0;
              let detalhes = '';
              let status = '';
              let corCard = 'bg-gray-50 border-gray-200';
              let corTexto = 'text-gray-600';
              let corValor = 'text-gray-900';
              let icone = '📊';
              
              if (manutencao.lmd_tipo_intervalo_manutencao === 'PLACA' && 
                  manutencao.lmd_placas_executadas !== undefined && 
                  manutencao.lmd_intervalo_placas !== undefined) {
                percentual = Math.round((manutencao.lmd_placas_executadas / manutencao.lmd_intervalo_placas) * 100);
                detalhes = `${manutencao.lmd_placas_executadas}/${manutencao.lmd_intervalo_placas} placas`;
                
                if (percentual <= 80) {
                  status = 'Em dia';
                  corCard = 'bg-green-50 border-green-200';
                  corTexto = 'text-green-600';
                  corValor = 'text-green-900';
                  icone = '✅';
                } else if (percentual <= 100) {
                  status = 'Próximo do limite';
                  corCard = 'bg-yellow-50 border-yellow-200';
                  corTexto = 'text-yellow-600';
                  corValor = 'text-yellow-900';
                  icone = '⚠️';
                } else {
                  status = 'Atrasada';
                  corCard = 'bg-red-50 border-red-200';
                  corTexto = 'text-red-600';
                  corValor = 'text-red-900';
                  icone = '🚨';
                }
              } else if (manutencao.lmd_tipo_intervalo_manutencao === 'DIA' && 
                         manutencao.lmd_data_hora_ultima_manutencao && 
                         manutencao.lmd_intervalo_dias !== undefined) {
                const diasPassados = Math.floor((new Date(manutencao.lmd_data_hora_inicio).getTime() - new Date(manutencao.lmd_data_hora_ultima_manutencao).getTime()) / (1000 * 60 * 60 * 24));
                percentual = Math.round((diasPassados / manutencao.lmd_intervalo_dias) * 100);
                detalhes = `${diasPassados}/${manutencao.lmd_intervalo_dias} dias`;
                
                if (percentual <= 80) {
                  status = 'Em dia';
                  corCard = 'bg-green-50 border-green-200';
                  corTexto = 'text-green-600';
                  corValor = 'text-green-900';
                  icone = '✅';
                } else if (percentual <= 100) {
                  status = 'Próximo do limite';
                  corCard = 'bg-yellow-50 border-yellow-200';
                  corTexto = 'text-yellow-600';
                  corValor = 'text-yellow-900';
                  icone = '⚠️';
                } else {
                  status = 'Atrasada';
                  corCard = 'bg-red-50 border-red-200';
                  corTexto = 'text-red-600';
                  corValor = 'text-red-900';
                  icone = '🚨';
                }
              } else {
                status = 'Sem dados';
                detalhes = 'do ciclo de manutenção';
                percentual = 0;
              }
              
              return (
                <div className={`p-4 rounded-lg border ${corCard}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">{icone}</span>
                    <div className={`text-xs font-medium ${corTexto}`}>Status do Ciclo</div>
                  </div>
                  <div className={`text-sm font-semibold ${corValor}`}>
                    {percentual > 0 ? `${percentual}%` : 'N/A'}
                  </div>
                  <div className={`text-xs ${corTexto}`}>
                    {status} - {detalhes}
                  </div>
                </div>
              );
            })()}

            {/* Data da Última Manutenção */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">📅</span>
                <div className="text-xs text-green-600 font-medium">Contexto Temporal</div>
              </div>
              <div className="text-sm font-semibold text-green-900">
                {formatDataCurta(manutencao.lmd_data_hora_inicio)}
              </div>
              <div className="text-xs text-green-700">Data desta manutenção</div>
            </div>
          </div>
        </div>

        {/* Linha do Tempo / Timeline */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Linha do Tempo
          </h3>
          
          <div className="relative">
            {/* Linha vertical */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" style={{zIndex: 0}}></div>
            
            <div className="space-y-6">
              {/* Início da Manutenção */}
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm" style={{zIndex: 10, position: 'relative'}}>
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">Manutenção Iniciada</h4>
                    <span className="text-xs text-slate-500">
                      {formatData(manutencao.lmd_data_hora_inicio)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="w-6 h-6 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-semibold">
                      {manutencao.colaborador_nome?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {manutencao.colaborador_nome}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Dispositivo: <span className="font-medium">{manutencao.dispositivo_descricao}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Contexto: {manutencao.lmd_ciclos_totais_executados} ciclos executados no dispositivo
                  </div>
                </div>
              </div>

              {/* Execução do Checklist (se houver respostas) */}
              {respostas.length > 0 && (
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm" style={{zIndex: 10, position: 'relative'}}>
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900">Checklist Executado</h4>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center space-x-4 text-xs">
                        <span className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>{respostas.filter(r => r.rif_ok === 1).length} itens OK</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span>{respostas.filter(r => r.rif_ok === 0).length} itens com problema</span>
                        </span>
                        <span className="text-slate-500">
                          Total: {respostas.length} itens verificados
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Finalização */}
              {manutencao.lmd_status !== 1 && (
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${statusConfig.bgClass}`} style={{zIndex: 10, position: 'relative'}}>
                    <svg className={`w-5 h-5 ${statusConfig.textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                        manutencao.lmd_status === 2 
                          ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          : "M6 18L18 6M6 6l12 12"
                      } />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Manutenção {manutencao.lmd_status === 2 ? 'Finalizada' : 'Cancelada'}
                      </h4>
                      {manutencao.lmd_data_hora_fim && (
                        <span className="text-xs text-slate-500">
                          {formatData(manutencao.lmd_data_hora_fim)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                        {manutencao.colaborador_nome?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {manutencao.lmd_status === 2 ? 'Finalizada' : 'Cancelada'} por {manutencao.colaborador_nome}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Duração total: <span className="font-mono font-medium">
                        {formatDuracao(manutencao.duracao_total || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Atendimento Ativo (apenas se em andamento) */}
        {manutencao.lmd_status === 1 && (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="font-medium text-orange-800">Manutenção em andamento</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-mono font-bold text-orange-900">
                  {formatDuracao(manutencao.duracao_total || 0)}
                </div>
                <div className="text-xs text-orange-600">
                  Iniciada às {new Date(manutencao.lmd_data_hora_inicio).toLocaleTimeString('pt-BR')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Checklist de Manutenção - melhorado */}
        {respostas.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Checklist de Manutenção
            </h4>

            {/* Resumo do Checklist */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <div className="text-lg font-bold text-green-800">
                  {respostas.filter(r => r.rif_ok === 1).length}
                </div>
                <div className="text-xs text-green-600 font-medium">Itens OK</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <div className="text-lg font-bold text-red-800">
                  {respostas.filter(r => r.rif_ok === 0).length}
                </div>
                <div className="text-xs text-red-600 font-medium">Com Problemas</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="text-lg font-bold text-blue-800">{respostas.length}</div>
                <div className="text-xs text-blue-600 font-medium">Total de Itens</div>
              </div>
            </div>

            {/* Lista detalhada do checklist */}
            <div className="space-y-3">
              {respostas.map((resposta, index) => (
                <div 
                  key={resposta.rif_item} 
                  className={`border rounded-lg p-4 ${
                    resposta.rif_ok === 1
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        resposta.rif_ok === 1
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'
                      }`}>
                        {resposta.rif_ok === 1 ? '✓' : '✗'}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 text-sm">
                          {index + 1}. {resposta.item_descricao}
                        </p>
                      </div>
                    </div>
                    
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      resposta.rif_ok === 1
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {resposta.rif_ok === 1 ? '✅ OK' : '❌ Não OK'}
                    </span>
                  </div>
                  
                  {resposta.rif_observacao && resposta.rif_observacao.trim() && (
                    <div className="mt-3 bg-white rounded border p-3">
                      <p className="text-xs font-medium text-slate-700 mb-1">Observação:</p>
                      <p className="text-sm text-slate-800">{resposta.rif_observacao}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Observações Gerais */}
        {manutencao.lmd_observacao && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Observações Gerais
            </h4>
            <div className="bg-white p-4 rounded border border-gray-200">
              <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                {manutencao.lmd_observacao}
              </p>
            </div>
          </div>
        )}

        {/* Estatísticas da Manutenção (apenas se finalizada) */}
        {manutencao.lmd_status === 2 && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Estatísticas da Manutenção
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded border border-green-200">
                <div className="text-xs text-green-600 font-medium">Duração Total</div>
                <div className="font-mono text-sm font-bold text-green-800">
                  {formatDuracao(manutencao.duracao_total || 0)}
                </div>
              </div>
              <div className="bg-white p-3 rounded border border-green-200">
                <div className="text-xs text-green-600 font-medium">Itens Verificados</div>
                <div className="font-mono text-sm font-bold text-green-800">
                  {respostas.length}
                </div>
              </div>
              <div className="bg-white p-3 rounded border border-green-200">
                <div className="text-xs text-green-600 font-medium">Taxa de Sucesso</div>
                <div className="font-mono text-sm font-bold text-green-800">
                  {respostas.length > 0 ? Math.round((respostas.filter(r => r.rif_ok === 1).length / respostas.length) * 100) : 0}%
                </div>
              </div>
              <div className="bg-white p-3 rounded border border-green-200">
                <div className="text-xs text-green-600 font-medium">Tipo</div>
                <div className="text-sm font-bold text-green-800">
                  {manutencao.lmd_tipo_manutencao}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DetalhesManutencaoModal;