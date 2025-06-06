import { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { ChamadoService } from '../services/chamadoService';
import type { Chamado } from '../types';

export const useGlobalAttendance = () => {
  const [attendanceChamado, setAttendanceChamado] = useState<Chamado | null>(null);
  const { isUserInAttendance, currentAttendance } = useSocket();

  // APENAS buscar dados do chamado quando detectar atendimento
  useEffect(() => {
    const loadAttendanceChamado = async () => {
      if (isUserInAttendance && currentAttendance && !attendanceChamado) {
        try {
          console.log('🔍 Carregando dados do chamado em atendimento:', currentAttendance.chamadoId);
          const chamado = await ChamadoService.getChamado(currentAttendance.chamadoId);
          setAttendanceChamado(chamado);
        } catch (error) {
          console.error('Erro ao carregar chamado:', error);
        }
      } else if (!isUserInAttendance) {
        setAttendanceChamado(null);
      }
    };

    loadAttendanceChamado();
  }, [isUserInAttendance, currentAttendance?.chamadoId]); // APENAS essas dependências

  return {
    isInAttendance: isUserInAttendance,
    attendanceChamado
  };
};