import { useEffect, useState, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { ChamadoService } from '../services/chamadoService';
import type { Chamado } from '../types';

export const useGlobalAttendance = () => {
  const [attendanceChamado, setAttendanceChamado] = useState<Chamado | null>(null);
  const { isUserInAttendance, currentAttendance } = useSocket();
  const lastLoadedChamadoId = useRef<number | null>(null);
  const isLoading = useRef(false);

  // NOVO: Event listener para limpeza forçada
  useEffect(() => {
    const handleForceClean = () => {
      console.log('🧹 Limpeza forçada do estado de atendimento');
      setAttendanceChamado(null);
      lastLoadedChamadoId.current = null;
    };

    window.addEventListener('forceCleanAttendance', handleForceClean);
    
    return () => {
      window.removeEventListener('forceCleanAttendance', handleForceClean);
    };
  }, []);

  useEffect(() => {
    const loadAttendanceChamado = async () => {
      if (isUserInAttendance && currentAttendance) {
        // Evitar reload desnecessário
        if (lastLoadedChamadoId.current === currentAttendance.chamadoId && attendanceChamado) {
          return;
        }

        if (isLoading.current) {
          return;
        }

        try {
          isLoading.current = true;
          console.log('🔍 Carregando dados do chamado em atendimento:', currentAttendance.chamadoId);
          
          const chamado = await ChamadoService.getChamado(currentAttendance.chamadoId);
          
          if (isUserInAttendance && currentAttendance?.chamadoId === chamado.cha_id) {
            setAttendanceChamado(chamado);
            lastLoadedChamadoId.current = chamado.cha_id;
            console.log('✅ Dados do chamado carregados com sucesso');
          }
        } catch (error) {
          console.error('❌ Erro ao carregar chamado:', error);
          
          setTimeout(() => {
            if (isUserInAttendance && currentAttendance && !attendanceChamado) {
              console.log('🔄 Tentando recarregar chamado após erro...');
              isLoading.current = false;
              loadAttendanceChamado();
            }
          }, 2000);
        } finally {
          isLoading.current = false;
        }
      } else if (!isUserInAttendance) {
        // Limpeza IMEDIATA quando não está em atendimento
        if (attendanceChamado) {
          console.log('🧹 Limpando dados do chamado - usuário não está mais em atendimento');
          setAttendanceChamado(null);
          lastLoadedChamadoId.current = null;
        }
      }
    };

    loadAttendanceChamado();
  }, [isUserInAttendance, currentAttendance?.chamadoId, attendanceChamado]);

  return {
    isInAttendance: isUserInAttendance,
    attendanceChamado
  };
};