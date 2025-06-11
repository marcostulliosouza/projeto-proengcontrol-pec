/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../ui';
import { ManutencaoService, type DispositivoManutencao, type DispositivoDetalhes } from '../../services/manutencaoService';

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
  const [loadingDetalhes, setLoadingDetalhes] = useState(true);
  const [dispositivoDetalhes, setDispositivoDetalhes] = useState<DispositivoDetalhes | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carregar detalhes completos do dispositivo
  useEffect(() => {
    const carregarDetalhes = async () => {
      try {
        setLoadingDetalhes(true);
        console.log(`🔍 Carregando detalhes do dispositivo ${dispositivo.dis_id}...`);
        
        const detalhes = await ManutencaoService.getDispositivoDetalhes(dispositivo.dis_id);
        setDispositivoDetalhes(detalhes);
        
        console.log(`✅ Detalhes carregados:`, detalhes);
      } catch (error) {
        console.error('❌ Erro ao carregar detalhes:', error);
        setError('Erro ao carregar informações do dispositivo');
      } finally {
        setLoadingDetalhes(false);
      }
    };

    carregarDetalhes();
  }, [dispositivo.dis_id]);

  const handleConfirmar = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🚀 Iniciando manutenção para dispositivo ${dispositivo.dis_id}...`);
      
      // Usar o service simplificado que envia apenas o dispositivoId
      const resultado = await ManutencaoService.iniciarManutencao({
        dispositivoId: dispositivo.dis_id
      });

      if (resultado.success) {
        console.log(`✅ Manutenção iniciada com sucesso - ID: ${resultado.id}`);
        onSuccess();
      } else {
        console.log(`❌ Falha ao iniciar manutenção: ${resultado.error}`);
        setError(resultado.error || 'Erro desconhecido ao iniciar manutenção');
      }
    } catch (error: any) {
      console.error('❌ Erro crítico ao iniciar manutenção:', error);
      
      let mensagemErro = 'Erro inesperado ao iniciar manutenção';
      
      if (error.response?.data?.message) {
        mensagemErro = error.response.data.message;
      } else if (error.message) {
        mensagemErro = error.message;
      }
      
      setError(mensagemErro);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = () => {
    if (dispositivo.dim_tipo_intervalo === 'DIA') {
      const diasRestantes = dispositivo.dim_intervalo_dias - dispositivo.dias_desde_ultima;
      if (diasRestantes <= 0) {
        return {
          status: 'Atrasada',
          detalhes: `${Math.abs(diasRestantes)} dias de atraso`,
          cor: 'text-red-600',
          bgCor: 'bg-red-50 border-red-200',
          icone: '🚨'
        };
      }
      return {
        status: 'Manutenção fora do prazo',
        detalhes: `${diasRestantes} dias restantes`,
        cor: 'text-blue-600',
        bgCor: 'bg-blue-50 border-blue-200',
        icone: '🔧'
      };
    } else {
      const placasRestantes = dispositivo.dim_intervalo_placas - dispositivo.dim_placas_executadas;
      if (placasRestantes <= 0) {
        return {
          status: 'Atrasada',
          detalhes: `${Math.abs(placasRestantes)} placas de atraso`,
          cor: 'text-red-600',
          bgCor: 'bg-red-50 border-red-200',
          icone: '🚨'
        };
      }
      return {
        status: 'Manutenção fora do prazo',
        detalhes: `${placasRestantes} placas restantes`,
        cor: 'text-blue-600',
        bgCor: 'bg-blue-50 border-blue-200',
        icone: '🔧'
      };
    }
  };

  const statusInfo = getStatusInfo();

  if (loadingDetalhes) {
    return (
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Carregando informações..."
        size="lg"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando detalhes do dispositivo...</p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Confirmar Início da Manutenção"
      size="lg"
    >
      <div className="space-y-6">
        {/* Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-red-600 mr-2 text-xl">⚠️</span>
              <div>
                <div className="font-medium text-red-800">Erro ao iniciar manutenção</div>
                <div className="text-red-700 text-sm mt-1">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Informações do Dispositivo */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-bold text-blue-900 mb-4 flex items-center text-lg">
            <span className="mr-2 text-xl">🔧</span>
            Dispositivo Selecionado
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-blue-700 text-sm font-medium">DT:</span>
              <div className="font-mono text-xl font-bold text-blue-900">
                {String(dispositivo.dis_id).padStart(6, '0')}
              </div>
            </div>
            
            <div className="space-y-1">
              <span className="text-blue-700 text-sm font-medium">Descrição:</span>
              <div className="font-semibold text-blue-900 text-lg">
                {dispositivo.dis_descricao}
              </div>
            </div>

            {dispositivoDetalhes && (
              <>
                <div className="space-y-1">
                  <span className="text-blue-700 text-sm font-medium">Cliente:</span>
                  <div className="font-semibold text-blue-900">
                    {dispositivoDetalhes.cliente_nome || 'Hi-Mix'}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-blue-700 text-sm font-medium">Código SAP:</span>
                  <div className="font-semibold text-blue-900">
                    {dispositivoDetalhes.dis_codigo_sap || 'N/A'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status da Manutenção */}
        <div className={`border-2 rounded-lg p-6 ${statusInfo.bgCor}`}>
          <h4 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
            <span className="mr-2 text-xl">📊</span>
            Status da Manutenção
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <span className="text-gray-600 text-sm font-medium">Tipo de Intervalo:</span>
              <div className="font-medium text-gray-900 flex items-center">
                {dispositivo.dim_tipo_intervalo === 'DIA' ? (
                  <>
                    <span className="mr-2">📅</span>
                    Por Dias
                  </>
                ) : (
                  <>
                    <span className="mr-2">🔢</span>
                    Por Placas
                  </>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <span className="text-gray-600 text-sm font-medium">Intervalo Configurado:</span>
              <div className="font-medium text-gray-900">
                {dispositivo.dim_tipo_intervalo === 'DIA' 
                  ? `${dispositivo.dim_intervalo_dias} dias`
                  : `${dispositivo.dim_intervalo_placas} placas`
                }
              </div>
            </div>
            
            <div className="space-y-2">
              <span className="text-gray-600 text-sm font-medium">Situação:</span>
              <div className={`font-bold ${statusInfo.cor} flex items-center`}>
                <span className="mr-2">{statusInfo.icone}</span>
                {dispositivo.necessita_manutencao ? 'Manutenção necessária' : statusInfo.status}
              </div>
              <div className="text-xs text-gray-600">
                {statusInfo.detalhes}
              </div>
            </div>
          </div>

          {dispositivoDetalhes?.dim_data_ultima_manutencao && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <span className="text-gray-600 text-sm font-medium">Última Manutenção:</span>
              <div className="font-medium text-gray-900 mt-1">
                {new Date(dispositivoDetalhes.dim_data_ultima_manutencao).toLocaleString('pt-BR')}
              </div>
            </div>
          )}
        </div>

        {/* Formulário de Manutenção */}
        {dispositivoDetalhes && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-bold text-purple-900 mb-2 flex items-center">
              <span className="mr-2">📋</span>
              Formulário de Manutenção
            </h4>
            <div className="text-purple-800 font-semibold">
              {dispositivoDetalhes.formulario_descricao}
            </div>
            <div className="text-purple-600 text-sm mt-1">
              Este formulário será aplicado durante a execução da manutenção
            </div>
          </div>
        )}

        {/* Informações Automáticas */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-800 mb-2 flex items-center">
            <span className="mr-2">🤖</span>
            Dados Automáticos
          </h4>
          <div className="text-green-700 text-sm space-y-1">
            <div>• Ciclos totais serão obtidos automaticamente da última leitura</div>
            <div>• Configurações de intervalo já estão definidas no sistema</div>
            <div>• Formulário específico será carregado automaticamente</div>
            <div>• Não é necessário inserir dados manualmente</div>
          </div>
        </div>

        {/* Aviso importante */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-yellow-600 mr-3 text-xl flex-shrink-0">⚠️</span>
            <div>
              <h4 className="font-medium text-yellow-800 mb-2">Importante:</h4>
              <ul className="text-yellow-700 text-sm space-y-1">
                <li>• Ao confirmar, um registro de manutenção será criado automaticamente</li>
                <li>• O cronômetro será iniciado imediatamente</li>
                <li>• Certifique-se de ter tempo disponível para completar a manutenção</li>
                <li>• Você poderá cancelar a manutenção se necessário antes de finalizar</li>
                <li>• Todos os dados serão preenchidos automaticamente pelo sistema</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="px-6"
          >
            Cancelar
          </Button>
          <Button
            variant="warning"
            onClick={handleConfirmar}
            loading={loading}
            disabled={loading || !dispositivoDetalhes}
            className="px-6"
          >
            {loading ? (
              <>
                <span className="mr-2">⏳</span>
                Iniciando...
              </>
            ) : (
              <>
                <span className="mr-2">{statusInfo.icone}</span>
                {dispositivo.necessita_manutencao ? 'Iniciar Manutenção' : 'Forçar Manutenção'}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default IniciarManutencaoModal;