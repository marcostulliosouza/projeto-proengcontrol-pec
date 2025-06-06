import { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { ChamadoService } from '../services/chamadoService';
import type { Chamado } from '../types';

export const useGlobalAttendance = () => {
  const [attendanceChamado, setAttendanceChamado] = useState<Chamado | null>(null);
  const { isUserInAttendance, currentAttendance } = useSocket();

  // APENAS buscar dados do chamado quando detectar atendimento
  useEffect(() => {
    const loadAttendanceChamado = async () => {
      if (isUserInAttendance && currentAttendance) {
        try {
          // Se já tem o chamado carregado e é o mesmo, não recarregar
          if (attendanceChamado?.cha_id === currentAttendance.chamadoId) {
            return;
          }

          console.log('🔍 Carregando dados do chamado em atendimento:', currentAttendance.chamadoId);
          const chamado = await ChamadoService.getChamado(currentAttendance.chamadoId);
          setAttendanceChamado(chamado);
          
          console.log('✅ Dados do chamado carregados com sucesso');
        } catch (error) {
          console.error('❌ Erro ao carregar chamado:', error);
          
          // Em caso de erro, tentar novamente após um tempo
          setTimeout(() => {
            if (isUserInAttendance && currentAttendance) {
              console.log('🔄 Tentando recarregar chamado após erro...');
              loadAttendanceChamado();
            }
          }, 3000);
        }
      } else if (!isUserInAttendance) {
        // Só limpar se realmente não está em atendimento
        if (attendanceChamado) {
          console.log('🧹 Limpando dados do chamado - usuário não está mais em atendimento');
          setAttendanceChamado(null);
        }
      }
    };

    loadAttendanceChamado();
  }, [isUserInAttendance, currentAttendance?.chamadoId]);

  useEffect(() => {
    // Se detectar que o attendanceChamado mudou para null mas isUserInAttendance ainda é true,
    // pode indicar uma transferência em andamento
    if (isUserInAttendance && !attendanceChamado && currentAttendance) {
      console.log('🔄 Possível transferência detectada, recarregando...');
      
      // Aguardar um pouco e tentar recarregar
      const timeout = setTimeout(async () => {
        if (isUserInAttendance && currentAttendance) {
          try {
            const chamado = await ChamadoService.getChamado(currentAttendance.chamadoId);
            setAttendanceChamado(chamado);
          } catch (error) {
            console.error('Erro ao recarregar chamado após possível transferência:', error);
          }
        }
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [isUserInAttendance, attendanceChamado, currentAttendance]);

  return {
    isInAttendance: isUserInAttendance,
    attendanceChamado
  };
};