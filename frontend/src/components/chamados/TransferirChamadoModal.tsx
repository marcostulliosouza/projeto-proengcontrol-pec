import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Loading, Input } from '../ui';
import { ChamadoService } from '../../services/chamadoService';
import type { Chamado } from '../../types';
import { useSocket } from '../../hooks/useSocket';

interface Usuario {
  col_id: number;
  col_nome: string;
  col_categoria: number;
  categoria_nome: string;
  col_login: string;
  col_ativo: number;
  col_ultimo_acesso?: string;
  minutos_inativo?: number;
  online?: boolean; 
}

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
  onTransfer,
}) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [selectedUsuario, setSelectedUsuario] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocket(); // Move useSocket here

  // Filtrar usuários com base na pesquisa
  const filteredUsuarios = useMemo(() => {
    if (!searchTerm.trim()) return usuarios;
    
    const term = searchTerm.toLowerCase();
    return usuarios.filter(usuario => 
      usuario.col_nome.toLowerCase().includes(term) ||
      usuario.col_login.toLowerCase().includes(term) ||
      usuario.categoria_nome.toLowerCase().includes(term)
    );
  }, [usuarios, searchTerm]);

  useEffect(() => {
    if (isOpen) {
      loadUsuarios();
      // Solicitar permissão para notificações
      if (window.Notification && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [isOpen]);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Modal: Carregando usuários online e disponíveis...');
      
      // MUDANÇA: Usar nova função com fallback
      let usuariosData;
      try {
        usuariosData = await ChamadoService.getUsuariosOnlineDisponiveis();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        console.log('⚠️ Erro com usuários online, tentando todos disponíveis...');
        usuariosData = await ChamadoService.getUsuariosDisponiveis();
      }
      
      console.log('✅ Modal: Usuários carregados:', usuariosData);
      
      setUsuarios(usuariosData);
      
      if (usuariosData.length === 0) {
        console.log('⚠️ Modal: Nenhum usuário disponível encontrado');
      }
    } catch (error) {
      console.error('❌ Modal: Erro ao carregar usuários:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao carregar usuários';
      setError(errorMessage);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedUsuario) {
      alert('Selecione um usuário para transferir');
      return;
    }
  
    const selectedUser = usuarios.find(u => u.col_id === selectedUsuario);
    if (!selectedUser) return;
  
    try {
      setTransferring(true);
      console.log(`🔄 Modal: Transferindo chamado ${chamado.cha_id} para ${selectedUser.col_nome}`);
      
      // USAR MÉTODO VIA SOCKET para transferência mais rápida
      if (socket) {
        socket.emit('transfer_call_socket', {
          chamadoId: chamado.cha_id,
          toUserId: selectedUsuario
        });
        
        // Aguardar confirmação via socket
        const transferPromise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout na transferência'));
          }, 10000);
          
          const onSuccess = () => {
            clearTimeout(timeout);
            socket.off('transfer_completed', onSuccess);
            socket.off('transfer_error', onError);
            resolve();
          };
          
          const onError = (data: { message: string }) => {
            clearTimeout(timeout);
            socket.off('transfer_completed', onSuccess);
            socket.off('transfer_error', onError);
            reject(new Error(data.message));
          };
          
          socket.once('transfer_completed', onSuccess);
          socket.once('transfer_error', onError);
        });
        
        await transferPromise;
      } else {
        // Fallback para API se socket não disponível
        await ChamadoService.transferirChamado(chamado.cha_id, selectedUsuario);
      }
      
      console.log('✅ Modal: Chamado transferido com sucesso');
      onTransfer();
      onClose();
      
      setSelectedUsuario(null);
      setSearchTerm('');
      
      alert(`Chamado transferido com sucesso para ${selectedUser.col_nome}!`);
    } catch (error) {
      console.error('❌ Modal: Erro ao transferir chamado:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao transferir chamado';
      alert(`Erro ao transferir chamado: ${errorMessage}`);
    } finally {
      setTransferring(false);
    }
  };

  const handleClose = () => {
    if (!transferring) {
      setSelectedUsuario(null);
      setSearchTerm('');
      setError(null);
      onClose();
    }
  };

  const handleRefresh = () => {
    setSelectedUsuario(null);
    setSearchTerm('');
    loadUsuarios();
  };

  const getStatusIcon = (usuario: Usuario) => {
    // Simplificado já que não temos dados de tempo online precisos
    if (usuario.online) {
      return <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Online agora"></span>;
    } else {
      return <span className="w-2 h-2 bg-gray-400 rounded-full" title="Status desconhecido"></span>;
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Transferir Chamado" 
      size="lg"
      preventClose={transferring}
    >
      <div className="space-y-6">
        {/* Informações do chamado */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">📋 Chamado a ser transferido</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>ID:</strong> #{chamado.cha_id}</p>
            <p><strong>DT:</strong> {chamado.cha_DT || 'Não informado'}</p>
            <p><strong>Cliente:</strong> {chamado.cliente_nome}</p>
            <p><strong>Descrição:</strong> {chamado.cha_descricao}</p>
          </div>
        </div>

        {/* Busca e controles */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="form-label">Transferir para usuário online:</label>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={loading || transferring}
              title="Atualizar lista de usuários"
            >
              🔄 Atualizar
            </Button>
          </div>
          
          {!loading && !error && usuarios.length > 0 && (
            <Input
              placeholder="Pesquisar por nome, login ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={transferring}
              className="w-full"
            />
          )}
        </div>
          
        {loading && (
          <div className="text-center p-8">
            <Loading text="Carregando usuários online..." />
          </div>
        )}
        
        {error && (
          <div className="text-center p-8 bg-red-50 rounded-lg border-2 border-dashed border-red-300">
            <div className="text-red-600">
              <svg className="mx-auto h-12 w-12 text-red-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium mb-2">Erro ao carregar usuários</p>
              <p className="text-sm">{error}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
                className="mt-3"
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        )}
        
        {!loading && !error && usuarios.length === 0 && (
          <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-lg font-medium">Nenhum usuário online e disponível</p>
              <p className="text-sm mt-1">Todos os usuários estão ocupados ou offline</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
                className="mt-3"
              >
                🔄 Verificar novamente
              </Button>
            </div>
          </div>
        )}
        
        {!loading && !error && filteredUsuarios.length > 0 && (
          <div className="space-y-2">
            {searchTerm && (
              <p className="text-sm text-gray-600">
                {filteredUsuarios.length} de {usuarios.length} usuários encontrados
              </p>
            )}
            
            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-lg">
              {filteredUsuarios.map((usuario) => (
                <div
                  key={usuario.col_id}
                  className={`
                    p-3 border-b border-gray-200 last:border-b-0 cursor-pointer transition-colors
                    ${selectedUsuario === usuario.col_id 
                      ? 'bg-primary-50 border-primary-200' 
                      : 'hover:bg-gray-50'
                    }
                    ${transferring ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  onClick={() => !transferring && setSelectedUsuario(usuario.col_id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`
                      w-4 h-4 rounded-full border-2 transition-colors
                      ${selectedUsuario === usuario.col_id 
                        ? 'bg-primary-600 border-primary-600' 
                        : 'border-gray-300'
                      }
                    `}>
                      {selectedUsuario === usuario.col_id && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">{usuario.col_nome}</p>
                        {getStatusIcon(usuario)}
                      </div>
                      <p className="text-xs text-gray-500">
                        {usuario.categoria_nome} • Login: {usuario.col_login}
                      </p>
                      {usuario.minutos_inativo !== undefined && (
                        <p className="text-xs text-gray-400">
                          Ativo há {usuario.minutos_inativo} minutos
                        </p>
                      )}
                    </div>
                    
                    <div className="text-xs text-green-600 font-medium">
                      ✅ Online
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && usuarios.length > 0 && filteredUsuarios.length === 0 && searchTerm && (
          <div className="text-center p-6 bg-yellow-50 rounded-lg">
            <p className="text-yellow-800">
              Nenhum usuário encontrado para "<strong>{searchTerm}</strong>"
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSearchTerm('')}
              className="mt-2"
            >
              Limpar pesquisa
            </Button>
          </div>
        )}

        {/* Aviso */}
        {filteredUsuarios.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <p className="text-yellow-800 text-sm">
              ⚠️ O chamado será transferido imediatamente e você perderá o controle sobre ele.
              O usuário destinatário receberá uma notificação.
            </p>
          </div>
        )}

        {/* Botões */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={transferring}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleTransfer}
            loading={transferring}
            disabled={transferring || !selectedUsuario || filteredUsuarios.length === 0}
          >
            🔄 Transferir Chamado
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default TransferirChamadoModal;