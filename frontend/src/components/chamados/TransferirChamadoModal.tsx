import React, { useState, useEffect } from 'react';
import { Modal, Button, Loading } from '../ui';
import { ChamadoService } from '../../services/chamadoService';
import { useAuth } from '../../contexts/AuthContext';
import type { UsuarioOnline, Chamado } from '../../types';
import { useToast } from '../../contexts/ToastContext';

interface TransferirChamadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  chamado: Chamado;
  onTransfer: () => void;
}

const TransferirChamadoModal: React.FC<TransferirChamadoModalProps> = ({
  isOpen,
  onClose,
  chamado,
  onTransfer
}) => {
  const [usuariosOnline, setUsuariosOnline] = useState<UsuarioOnline[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const { state: authState } = useAuth();

  const { showSuccessToast, showErrorToast } = useToast();

  // Carregar usuários online quando modal abrir
  useEffect(() => {
    if (isOpen) {
      loadUsuariosOnline();
      // Atualizar lista a cada 10 segundos
      const interval = setInterval(loadUsuariosOnline, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadUsuariosOnline = async () => {
    try {
      setLoadingUsuarios(true);
      const usuarios = await ChamadoService.getUsuariosOnline();
      
      // Filtrar usuário atual
      const usuariosFiltrados = usuarios.filter(user => user.id !== authState.user?.id);
      setUsuariosOnline(usuariosFiltrados);
    } catch (error) {
      console.error('Erro ao carregar usuários online:', error);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const handleTransferir = async () => {
  if (!usuarioSelecionado || loading) return;

  const usuarioDestino = usuariosOnline.find(u => u.id === usuarioSelecionado);
  if (!usuarioDestino) return;

  try {
    setLoading(true);
    
    await ChamadoService.transferirChamado(
      chamado.cha_id, 
      usuarioSelecionado, 
      usuarioDestino.nome
    );

    console.log(`✅ Chamado ${chamado.cha_id} transferido para ${usuarioDestino.nome}`);
    
    // Notificação de sucesso
    showSuccessToast(
      'Chamado Transferido',
      `Chamado #${chamado.cha_id} transferido para ${usuarioDestino.nome}`
    );

    onTransfer();
    onClose();
  } catch (error) {
    console.error('Erro ao transferir chamado:', error);
    
    // Notificação de erro
    showErrorToast(
      'Erro na Transferência',
      'Não foi possível transferir o chamado. Tente novamente.'
    );
  } finally {
    setLoading(false);
  }
  };
  
  const formatTempoOnline = (connectedAt: string) => {
    const agora = new Date();
    const conexao = new Date(connectedAt);
    const diffMs = agora.getTime() - conexao.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Agora mesmo';
    if (diffMinutes < 60) return `${diffMinutes}min`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ${diffMinutes % 60}min`;
    
    return `${Math.floor(diffHours / 24)}d ${diffHours % 24}h`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Transferir Chamado #${chamado.cha_id}`}
      size="md"
    >
      <div className="space-y-6">
        {/* Info do chamado */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">📋 Chamado a ser transferido</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>Cliente:</strong> {chamado.cliente_nome}</p>
            <p><strong>DT:</strong> {chamado.cha_DT}</p>
            <p><strong>Descrição:</strong> {chamado.cha_descricao?.substring(0, 100)}...</p>
          </div>
        </div>

        {/* Lista de usuários online */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="form-label">Transferir para:</label>
            <button
              onClick={loadUsuariosOnline}
              disabled={loadingUsuarios}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {loadingUsuarios ? (
                <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Atualizar
            </button>
          </div>

          {loadingUsuarios ? (
            <div className="py-8">
              <Loading size="md" text="Carregando usuários online..." />
            </div>
          ) : usuariosOnline.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <p className="text-gray-500">Nenhum usuário online disponível</p>
              <p className="text-gray-400 text-sm mt-1">Tente novamente em alguns minutos</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              {usuariosOnline.map((usuario) => (
                <div
                  key={usuario.id}
                  className={`p-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                    usuarioSelecionado === usuario.id
                      ? 'bg-blue-100 border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setUsuarioSelecionado(usuario.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                        usuarioSelecionado === usuario.id
                          ? 'bg-blue-200 text-blue-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {usuario.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{usuario.nome}</p>
                        <p className="text-xs text-gray-500">
                          Online há {formatTempoOnline(usuario.connectedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      {usuarioSelecionado === usuario.id && (
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Warning */}
        {usuarioSelecionado && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
            <p className="text-yellow-800 text-sm">
              ⚠️ O chamado será transferido imediatamente e você perderá o acesso ao atendimento.
            </p>
          </div>
        )}

        {/* Botões */}
        <div className="flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="warning"
            onClick={handleTransferir}
            disabled={!usuarioSelecionado || loading || usuariosOnline.length === 0}
            loading={loading}
          >
            🔄 Transferir Chamado
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default TransferirChamadoModal;