import { executeQuery, pool } from '../config/database';
import { ResultSetHeader } from 'mysql2';

export interface ManutencaoPreventiva {
  lmd_id: number;
  lmd_dispositivo: number;
  lmd_data_hora_inicio: string;
  lmd_data_hora_fim: string | null;
  lmd_tipo_manutencao: 'PREVENTIVA' | 'CORRETIVA';
  lmd_ciclos_totais_executados: number;
  lmd_data_hora_ultima_manutencao: string | null;
  lmd_tipo_intervalo_manutencao: 'DIA' | 'PLACA';
  lmd_intervalo_dias: number;
  lmd_intervalo_placas: number;
  lmd_placas_executadas: number;
  lmd_observacao: string | null;
  lmd_colaborador: number;
  lmd_status: number; // 1=Em andamento, 2=Finalizada, 3=Cancelada
  
  // Campos relacionados
  dispositivo_descricao?: string;
  colaborador_nome?: string;
  duracao_total?: number;
}

export interface FormularioManutencao {
  fmp_id: number;
  fmp_descricao: string;
  fmp_data_ultima_modificacao: string;
  fmp_modificador: number;
  modificador_nome?: string;
}

export interface ItemFormularioManutencao {
  ifm_id: number;
  ifm_formulario: number;
  ifm_descricao: string;
  ifm_posicao: number;
}

export interface RespostaItemFormulario {
  rif_id?: number;
  rif_item: number;
  rif_log_manutencao: number;
  rif_ok: number; // 0=Não OK, 1=OK
  rif_observacao: string;
  item_descricao?: string;
}

export interface DispositivoManutencao {
  dis_id: number;
  dis_descricao: string;
  dis_com_manutencao: number;
  dis_info_manutencao: number;
  dim_tipo_intervalo: 'DIA' | 'PLACA';
  dim_intervalo_dias: number;
  dim_intervalo_placas: number;
  dim_placas_executadas: number;
  dim_data_ultima_manutencao: string | null;
  dias_desde_ultima: number;
  necessita_manutencao: boolean;
}

export class ManutencaoPreventivaModel {
  // Buscar dispositivos que precisam de manutenção
  static async getDispositivosManutencao(): Promise<DispositivoManutencao[]> {
    try {
      const query = `
        SELECT 
          d.dis_id,
          d.dis_descricao,
          d.dis_com_manutencao,
          d.dis_info_manutencao,
          COALESCE(dim.dim_tipo_intervalo, 'DIA') as dim_tipo_intervalo,
          COALESCE(dim.dim_intervalo_dias, 30) as dim_intervalo_dias,
          COALESCE(dim.dim_intervalo_placas, 1000) as dim_intervalo_placas,
          COALESCE(dim.dim_placas_executadas, 0) as dim_placas_executadas,
          dim.dim_data_ultima_manutencao,
          
          -- ✅ CORREÇÃO: Cálculo correto dos dias/placas desde última manutenção
          CASE 
            WHEN COALESCE(dim.dim_tipo_intervalo, 'DIA') = 'DIA' THEN 
              CASE 
                WHEN dim.dim_data_ultima_manutencao IS NULL THEN 999999 -- Nunca teve manutenção = muito tempo
                ELSE DATEDIFF(NOW(), dim.dim_data_ultima_manutencao)
              END
            ELSE 
              COALESCE(dim.dim_placas_executadas, 0)
          END as dias_desde_ultima,
          
          -- ✅ CORREÇÃO: Lógica para necessita_manutencao
          CASE 
            WHEN COALESCE(dim.dim_tipo_intervalo, 'DIA') = 'DIA' THEN 
              CASE 
                WHEN dim.dim_data_ultima_manutencao IS NULL THEN 1 -- Nunca teve manutenção = necessita
                ELSE (DATEDIFF(NOW(), dim.dim_data_ultima_manutencao) >= COALESCE(dim.dim_intervalo_dias, 30))
              END
            ELSE 
              (COALESCE(dim.dim_placas_executadas, 0) >= COALESCE(dim.dim_intervalo_placas, 1000))
          END as necessita_manutencao,
          
          -- ✅ CORREÇÃO: Cálculo correto do percentual
          CASE 
            WHEN COALESCE(dim.dim_tipo_intervalo, 'DIA') = 'DIA' THEN 
              CASE 
                WHEN dim.dim_data_ultima_manutencao IS NULL THEN 999.99 -- Nunca teve manutenção = 999%
                WHEN COALESCE(dim.dim_intervalo_dias, 30) = 0 THEN 0 -- Evitar divisão por zero
                ELSE ROUND(
                  (DATEDIFF(NOW(), dim.dim_data_ultima_manutencao) / COALESCE(dim.dim_intervalo_dias, 30)) * 100, 
                  2
                )
              END
            ELSE 
              CASE 
                WHEN COALESCE(dim.dim_intervalo_placas, 1000) = 0 THEN 0 -- Evitar divisão por zero
                ELSE ROUND(
                  (COALESCE(dim.dim_placas_executadas, 0) / COALESCE(dim.dim_intervalo_placas, 1000)) * 100, 
                  2
                )
              END
          END as percentual_manutencao
        FROM dispositivos d
        LEFT JOIN dispositivo_info_manutencao dim ON d.dis_info_manutencao = dim.dim_id
        WHERE d.dis_com_manutencao = 1 
        AND d.dis_status = 1
        ORDER BY necessita_manutencao DESC, percentual_manutencao DESC
      `;
  
      const results = await executeQuery(query);
      
      // ✅ LOG para debug
      console.log('📊 Dispositivos carregados:', results.length);
      results.forEach((d: { percentual_manutencao: number; dis_id: any; dis_descricao: any; necessita_manutencao: any; }) => {
        if (d.percentual_manutencao > 70) {
          console.log(`🔍 ${d.dis_id} - ${d.dis_descricao}: ${d.percentual_manutencao}% - ${d.necessita_manutencao ? 'NECESSITA' : 'EM DIA'}`);
        }
      });
      
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar dispositivos para manutenção:', error);
      throw error;
    }
  }

  // Verificar se há manutenção em andamento para um usuário
  static async verificarManutencaoAndamento(userId: number): Promise<ManutencaoPreventiva | null> {
    try {
      const query = `
        SELECT 
          lmd.*,
          d.dis_descricao as dispositivo_descricao,
          c.col_nome as colaborador_nome,
          TIMESTAMPDIFF(MINUTE, lmd_data_hora_inicio, NOW()) as duracao_total
        FROM log_manutencao_dispositivo lmd
        LEFT JOIN dispositivos d ON lmd.lmd_dispositivo = d.dis_id
        LEFT JOIN colaboradores c ON lmd.lmd_colaborador = c.col_id
        WHERE lmd.lmd_colaborador = ? AND lmd.lmd_status = 1
        ORDER BY lmd.lmd_data_hora_inicio DESC
        LIMIT 1
      `;
      
      const results = await executeQuery(query, [userId]);
      return Array.isArray(results) && results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Erro ao verificar manutenção em andamento:', error);
      throw error;
    }
  }

  // Iniciar manutenção
  static async iniciarManutencao(data: {
    dispositivoId: number;
    colaboradorId: number;
    ciclosTotais: number;
    dataUltimaManutencao: string;
    tipoIntervalo: string;
    intervaloDias: number;
    intervaloPlacas: number;
    placasExecutadas: number;
  }): Promise<number> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const insertQuery = `
        INSERT INTO log_manutencao_dispositivo (
          lmd_dispositivo,
          lmd_data_hora_inicio,
          lmd_tipo_manutencao,
          lmd_ciclos_totais_executados,
          lmd_data_hora_ultima_manutencao,
          lmd_tipo_intervalo_manutencao,
          lmd_intervalo_dias,
          lmd_intervalo_placas,
          lmd_placas_executadas,
          lmd_colaborador,
          lmd_status
        ) VALUES (?, NOW(), 'PREVENTIVA', ?, ?, ?, ?, ?, ?, ?, 1)
      `;

      const result = await connection.execute(insertQuery, [
        data.dispositivoId,
        data.ciclosTotais,
        data.dataUltimaManutencao,
        data.tipoIntervalo,
        data.intervaloDias,
        data.intervaloPlacas,
        data.placasExecutadas,
        data.colaboradorId
      ]);

      await connection.commit();
      return (result[0] as ResultSetHeader).insertId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // ✅ CORREÇÃO PRINCIPAL: Finalizar manutenção com atualizações corretas
  static async finalizarManutencao(
    manutencaoId: number, 
    observacao: string, 
    respostas: RespostaItemFormulario[]
  ): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      console.log('🔧 Iniciando finalização da manutenção:', {
        manutencaoId,
        observacao: observacao.substring(0, 100) + '...',
        totalRespostas: respostas.length
      });

      // 1. ✅ CRÍTICO: Inserir respostas com conversão correta
      if (respostas.length > 0) {
        console.log('📝 Salvando respostas do checklist...');
        
        // Validar e converter cada resposta individualmente
        for (const resposta of respostas) {
          const insertRespostaQuery = `
            INSERT INTO resposta_item_formulario (rif_item, rif_log_manutencao, rif_ok, rif_observacao)
            VALUES (?, ?, ?, ?)
          `;
          
          // ✅ GARANTIR que rif_ok é 0 ou 1
          const rifOkValue = Number(resposta.rif_ok) === 1 ? 1 : 0;
          
          console.log(`💾 Salvando resposta - Item: ${resposta.rif_item}, OK: ${resposta.rif_ok} → ${rifOkValue}`);
          
          await connection.execute(insertRespostaQuery, [
            resposta.rif_item,
            resposta.rif_log_manutencao,
            rifOkValue,
            (resposta.rif_observacao || '').toUpperCase().trim()
          ]);
        }
        
        console.log('✅ Todas as respostas foram salvas');
      }

      // 2. ✅ Atualizar log de manutenção
      console.log('📋 Finalizando log de manutenção...');
      const updateLogQuery = `
        UPDATE log_manutencao_dispositivo 
        SET lmd_data_hora_fim = NOW(),
            lmd_observacao = ?,
            lmd_status = 2
        WHERE lmd_id = ?
      `;
      
      await connection.execute(updateLogQuery, [observacao.toUpperCase().trim(), manutencaoId]);
      console.log('✅ Log de manutenção atualizado');

      // 3. ✅ CRÍTICO: Buscar dispositivo relacionado à manutenção
      const buscarDispositivoQuery = `
        SELECT lmd_dispositivo 
        FROM log_manutencao_dispositivo 
        WHERE lmd_id = ?
      `;
      
      const [manutencaoInfo] = await connection.execute(buscarDispositivoQuery, [manutencaoId]) as any;
      
      if (!manutencaoInfo || manutencaoInfo.length === 0) {
        throw new Error('Manutenção não encontrada');
      }
      
      const dispositivoId = manutencaoInfo[0].lmd_dispositivo;
      console.log('🔍 Dispositivo identificado:', dispositivoId);

      // 4. ✅ CRÍTICO: Atualizar informações de manutenção do dispositivo
      console.log('🔄 Atualizando dados do dispositivo após manutenção...');
      
      const updateDispositivoQuery = `
        UPDATE dispositivo_info_manutencao 
        SET dim_placas_executadas = 0,
            dim_data_ultima_manutencao = NOW()
        WHERE dim_id = (
          SELECT dis_info_manutencao 
          FROM dispositivos 
          WHERE dis_id = ?
        )
      `;
      
      const updateResult = await connection.execute(updateDispositivoQuery, [dispositivoId]) as any;
      console.log('✅ Dispositivo atualizado. Linhas afetadas:', updateResult[0].affectedRows);

      // 5. ✅ ADICIONAL: Atualizar ciclos do dispositivo se necessário
      const updateCiclosQuery = `
        UPDATE dispositivos 
        SET dis_ciclos_executados = COALESCE(dis_ciclos_executados, 0)
        WHERE dis_id = ?
      `;
      
      await connection.execute(updateCiclosQuery, [dispositivoId]);
      console.log('✅ Ciclos do dispositivo verificados');

      await connection.commit();
      console.log('🎉 Manutenção finalizada com sucesso!');
      
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('❌ Erro ao finalizar manutenção:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Cancelar manutenção
  static async cancelarManutencao(manutencaoId: number): Promise<boolean> {
    try {
      const deleteQuery = `DELETE FROM log_manutencao_dispositivo WHERE lmd_id = ?`;
      const result = await executeQuery(deleteQuery, [manutencaoId]);
      return (result as ResultSetHeader).affectedRows > 0;
    } catch (error) {
      console.error('Erro ao cancelar manutenção:', error);
      throw error;
    }
  }

  // Buscar histórico de manutenções
  static async getHistoricoManutencoes(filtros: {
    dataInicio?: string;
    dataFim?: string;
    dispositivo?: number;
    colaborador?: number;
    status?: number;
  } = {}): Promise<ManutencaoPreventiva[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filtros.dataInicio) {
        whereClause += ' AND DATE(lmd_data_hora_inicio) >= ?';
        params.push(filtros.dataInicio);
      }

      if (filtros.dataFim) {
        whereClause += ' AND DATE(lmd_data_hora_inicio) <= ?';
        params.push(filtros.dataFim);
      }

      if (filtros.dispositivo) {
        whereClause += ' AND lmd_dispositivo = ?';
        params.push(filtros.dispositivo);
      }

      if (filtros.colaborador) {
        whereClause += ' AND lmd_colaborador = ?';
        params.push(filtros.colaborador);
      }

      if (filtros.status) {
        whereClause += ' AND lmd_status = ?';
        params.push(filtros.status);
      } else {
        whereClause += ' AND lmd_status IN (2, 3)'; // Apenas finalizadas e canceladas por padrão
      }

      const query = `
        SELECT 
          lmd.*,
          d.dis_descricao as dispositivo_descricao,
          c.col_nome as colaborador_nome,
          TIMESTAMPDIFF(MINUTE, lmd_data_hora_inicio, COALESCE(lmd_data_hora_fim, NOW())) as duracao_total
        FROM log_manutencao_dispositivo lmd
        LEFT JOIN dispositivos d ON lmd.lmd_dispositivo = d.dis_id
        LEFT JOIN colaboradores c ON lmd.lmd_colaborador = c.col_id
        ${whereClause}
        ORDER BY lmd_data_hora_inicio DESC
      `;
      
      const results = await executeQuery(query, params);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar histórico de manutenções:', error);
      throw error;
    }
  }

  // ✅ CORREÇÃO: Buscar detalhes com conversão correta das respostas
  static async getDetalhesManutencao(manutencaoId: number): Promise<{
    manutencao: ManutencaoPreventiva;
    respostas: RespostaItemFormulario[];
  } | null> {
    try {
      // Buscar manutenção
      const manutencaoQuery = `
        SELECT 
          lmd.*,
          d.dis_descricao as dispositivo_descricao,
          c.col_nome as colaborador_nome,
          TIMESTAMPDIFF(MINUTE, lmd_data_hora_inicio, COALESCE(lmd_data_hora_fim, NOW())) as duracao_total
        FROM log_manutencao_dispositivo lmd
        LEFT JOIN dispositivos d ON lmd.lmd_dispositivo = d.dis_id
        LEFT JOIN colaboradores c ON lmd.lmd_colaborador = c.col_id
        WHERE lmd.lmd_id = ?
      `;
      
      const manutencaoResult = await executeQuery(manutencaoQuery, [manutencaoId]);
      
      if (!Array.isArray(manutencaoResult) || manutencaoResult.length === 0) {
        return null;
      }

      // ✅ Buscar respostas com conversão correta
      const respostasQuery = `
        SELECT 
          rif.*,
          ifm.ifm_descricao as item_descricao,
          CAST(rif.rif_ok AS UNSIGNED) as rif_ok_converted
        FROM resposta_item_formulario rif
        LEFT JOIN itens_formulario_manutencao ifm ON rif.rif_item = ifm.ifm_id
        WHERE rif.rif_log_manutencao = ?
        ORDER BY ifm.ifm_posicao
      `;
      
      const respostasResult = await executeQuery(respostasQuery, [manutencaoId]);

      console.log('🔍 Respostas brutas do banco:', respostasResult);

      // ✅ CORREÇÃO PRINCIPAL: Conversão confiável de valores
      const respostasConvertidas = Array.isArray(respostasResult) 
        ? respostasResult.map((r: any) => {
            // Usar o valor convertido da query ou fazer conversão manual
            let rif_ok_final = r.rif_ok_converted !== undefined ? r.rif_ok_converted : r.rif_ok;
            
            // Garantir conversão para 0 ou 1
            if (typeof rif_ok_final === 'boolean') {
              rif_ok_final = rif_ok_final ? 1 : 0;
            } else if (Buffer.isBuffer(rif_ok_final)) {
              rif_ok_final = rif_ok_final[0] === 1 ? 1 : 0;
            } else {
              rif_ok_final = Number(rif_ok_final) ? 1 : 0;
            }
            
            console.log(`📝 Item ${r.rif_item}: original=${r.rif_ok}, convertido=${rif_ok_final}`);
            
            return {
              rif_id: r.rif_id,
              rif_item: r.rif_item,
              rif_log_manutencao: r.rif_log_manutencao,
              rif_ok: rif_ok_final,
              rif_observacao: r.rif_observacao || '',
              item_descricao: r.item_descricao
            };
          })
        : [];

      console.log('✅ Respostas convertidas finais:', respostasConvertidas);

      return {
        manutencao: manutencaoResult[0],
        respostas: respostasConvertidas
      };
    } catch (error) {
      console.error('Erro ao buscar detalhes da manutenção:', error);
      throw error;
    }
  }

  // Verificar se dispositivo já está em manutenção
  static async verificarDispositivoEmManutencao(dispositivoId: number): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM log_manutencao_dispositivo 
        WHERE lmd_dispositivo = ? AND lmd_status = 1
      `;
      
      const results = await executeQuery(query, [dispositivoId]);
      const count = Array.isArray(results) && results.length > 0 ? results[0].count : 0;
      return count > 0;
    } catch (error) {
      console.error('Erro ao verificar dispositivo em manutenção:', error);
      throw error;
    }
  }

  // Verificar se usuário já está em atendimento
  static async verificarUsuarioEmAtendimento(userId: number): Promise<ManutencaoPreventiva | null> {
    try {
      const query = `
        SELECT 
          lmd.*,
          d.dis_descricao as dispositivo_descricao,
          c.col_nome as colaborador_nome,
          TIMESTAMPDIFF(MINUTE, lmd_data_hora_inicio, NOW()) as duracao_total
        FROM log_manutencao_dispositivo lmd
        LEFT JOIN dispositivos d ON lmd.lmd_dispositivo = d.dis_id
        LEFT JOIN colaboradores c ON lmd.lmd_colaborador = c.col_id
        WHERE lmd.lmd_colaborador = ? AND lmd.lmd_status  = 1
        LIMIT 1
      `;
      
      const results = await executeQuery(query, [userId]);
      return Array.isArray(results) && results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Erro ao verificar usuário em atendimento:', error);
      throw error;
    }
  }

  // Iniciar manutenção com verificações de concorrência
  static async iniciarManutencaoSegura(data: {
    dispositivoId: number;
    colaboradorId: number;
    ciclosTotais: number;
    dataUltimaManutencao: string;
    tipoIntervalo: string;
    intervaloDias: number;
    intervaloPlacas: number;
    placasExecutadas: number;
  }): Promise<{ success: boolean; manutencaoId?: number; error?: string }> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Verificar se o dispositivo já está em manutenção
      const dispositivoEmManutencao = await this.verificarDispositivoEmManutencao(data.dispositivoId);
      if (dispositivoEmManutencao) {
        await connection.rollback();
        return {
          success: false,
          error: 'Este dispositivo já está em manutenção por outro usuário.'
        };
      }

      // 2. Verificar se o usuário já está em atendimento
      const usuarioEmAtendimento = await this.verificarUsuarioEmAtendimento(data.colaboradorId);
      if (usuarioEmAtendimento) {
        await connection.rollback();
        return {
          success: false,
          error: `Você já está atendendo o dispositivo: ${usuarioEmAtendimento.dispositivo_descricao}`
        };
      }

      // 3. Inserir nova manutenção (com lock)
      const insertQuery = `
        INSERT INTO log_manutencao_dispositivo (
          lmd_dispositivo,
          lmd_data_hora_inicio,
          lmd_tipo_manutencao,
          lmd_ciclos_totais_executados,
          lmd_data_hora_ultima_manutencao,
          lmd_tipo_intervalo_manutencao,
          lmd_intervalo_dias,
          lmd_intervalo_placas,
          lmd_placas_executadas,
          lmd_colaborador,
          lmd_status
        ) VALUES (?, NOW(), 'PREVENTIVA', ?, ?, ?, ?, ?, ?, ?, 1)
      `;

      const result = await connection.execute(insertQuery, [
        data.dispositivoId,
        data.ciclosTotais,
        data.dataUltimaManutencao,
        data.tipoIntervalo,
        data.intervaloDias,
        data.intervaloPlacas,
        data.placasExecutadas,
        data.colaboradorId
      ]);

      await connection.commit();
      
      return {
        success: true,
        manutencaoId: (result[0] as ResultSetHeader).insertId
      };

    } catch (error) {
      await connection.rollback();
      console.error('Erro ao iniciar manutenção segura:', error);
      
      // Verificar se é erro de duplicação/concorrência
      if (error instanceof Error && error.message.includes('Duplicate')) {
        return {
          success: false,
          error: 'Este dispositivo já foi selecionado por outro usuário. Tente novamente.'
        };
      }
      
      throw error;
    } finally {
      connection.release();
    }
  }

  // Obter estatísticas de dispositivos
  static async getEstatisticasDispositivos(): Promise<{
    total: number;
    emManutencao: number;
    necessitamManutencao: number;
    emDia: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN em_manutencao.lmd_id IS NOT NULL THEN 1 ELSE 0 END) as em_manutencao,
          SUM(CASE WHEN necessita_manutencao THEN 1 ELSE 0 END) as necessitam_manutencao,
          SUM(CASE WHEN NOT necessita_manutencao AND em_manutencao.lmd_id IS NULL THEN 1 ELSE 0 END) as em_dia
        FROM (
          SELECT 
            d.dis_id,
            CASE 
              WHEN COALESCE(dim.dim_tipo_intervalo, 'DIA') = 'DIA' THEN 
                COALESCE(DATEDIFF(NOW(), dim.dim_data_ultima_manutencao), 9999) >= COALESCE(dim.dim_intervalo_dias, 30)
              ELSE 
                COALESCE(dim.dim_placas_executadas, 0) >= COALESCE(dim.dim_intervalo_placas, 1000)
            END as necessita_manutencao
          FROM dispositivos d
          LEFT JOIN dispositivo_info_manutencao dim ON d.dis_info_manutencao = dim.dim_id
          WHERE d.dis_com_manutencao = 1 AND d.dis_status = 1
        ) dispositivos_info
        LEFT JOIN log_manutencao_dispositivo em_manutencao ON dispositivos_info.dis_id = em_manutencao.lmd_dispositivo 
          AND em_manutencao.lmd_status = 1
      `;
      
      const results = await executeQuery(query);
      return Array.isArray(results) && results.length > 0 ? results[0] : {
        total: 0,
        emManutencao: 0,
        necessitamManutencao: 0,
        emDia: 0
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }

    // Buscar métricas completas de manutenção
    static async getMetricas(dataInicio?: string, dataFim?: string): Promise<{
      totalManutencoes: number;
      tempoMedioMinutos: number;
      manutencoesPendentes: number;
      totalDispositivos: number;
      porDispositivo: Array<{ nome: string; total: number }>;
      porColaborador: Array<{ nome: string; total: number }>;
      evolucaoMensal: Array<{ mes: string; total: number; tempo_medio: number }>;
    }> {
      try {
        // Definir período padrão se não fornecido
        const inicio = dataInicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const fim = dataFim || new Date().toISOString().split('T')[0];
  
        console.log(`🔍 Buscando métricas para período: ${inicio} até ${fim}`);
  
        // 1. Métricas principais
        const metricasQuery = `
          SELECT 
            COUNT(CASE WHEN lmd_status IN (2, 3) THEN 1 END) as total_manutencoes,
            ROUND(AVG(CASE 
              WHEN lmd_status IN (2, 3) AND lmd_data_hora_fim IS NOT NULL THEN 
                TIMESTAMPDIFF(MINUTE, lmd_data_hora_inicio, lmd_data_hora_fim)
              END)) as tempo_medio_minutos,
            COUNT(CASE WHEN lmd_status = 1 THEN 1 END) as manutencoes_pendentes
          FROM log_manutencao_dispositivo lmd
          WHERE DATE(lmd_data_hora_inicio) BETWEEN ? AND ?
        `;
  
        const metricasResult = await executeQuery(metricasQuery, [inicio, fim]);
        const metricas = Array.isArray(metricasResult) && metricasResult.length > 0 ? metricasResult[0] : {
          total_manutencoes: 0,
          tempo_medio_minutos: 0,
          manutencoes_pendentes: 0
        };
  
        console.log('📊 Métricas principais:', metricas);
  
        // 2. Total de dispositivos com manutenção
        const dispositivosQuery = `
          SELECT COUNT(DISTINCT dis_id) as total_dispositivos
          FROM dispositivos d
          WHERE d.dis_com_manutencao = 1 AND d.dis_status = 1
        `;
  
        const dispositivosResult = await executeQuery(dispositivosQuery);
        const totalDispositivos = Array.isArray(dispositivosResult) && dispositivosResult.length > 0 
          ? dispositivosResult[0].total_dispositivos 
          : 0;
  
        console.log('📱 Total dispositivos:', totalDispositivos);
  
        // 3. Manutenções por dispositivo
        const porDispositivoQuery = `
          SELECT 
            d.dis_descricao as nome,
            COUNT(lmd.lmd_id) as total
          FROM log_manutencao_dispositivo lmd
          INNER JOIN dispositivos d ON lmd.lmd_dispositivo = d.dis_id
          WHERE DATE(lmd.lmd_data_hora_inicio) BETWEEN ? AND ?
            AND lmd.lmd_status IN (2, 3)
          GROUP BY d.dis_id, d.dis_descricao
          HAVING COUNT(lmd.lmd_id) > 0
          ORDER BY total DESC
          LIMIT 20
        `;
  
        const porDispositivoResult = await executeQuery(porDispositivoQuery, [inicio, fim]);
        const porDispositivo = Array.isArray(porDispositivoResult) ? porDispositivoResult : [];
  
        console.log('🔧 Manutenções por dispositivo:', porDispositivo.length, 'dispositivos');
  
        // 4. Manutenções por colaborador
        const porColaboradorQuery = `
          SELECT 
            c.col_nome as nome,
            COUNT(lmd.lmd_id) as total
          FROM log_manutencao_dispositivo lmd
          INNER JOIN colaboradores c ON lmd.lmd_colaborador = c.col_id
          WHERE DATE(lmd.lmd_data_hora_inicio) BETWEEN ? AND ?
            AND lmd.lmd_status IN (2, 3)
          GROUP BY c.col_id, c.col_nome
          HAVING COUNT(lmd.lmd_id) > 0
          ORDER BY total DESC
          LIMIT 20
        `;
  
        const porColaboradorResult = await executeQuery(porColaboradorQuery, [inicio, fim]);
        const porColaborador = Array.isArray(porColaboradorResult) ? porColaboradorResult : [];
  
        console.log('👥 Manutenções por colaborador:', porColaborador.length, 'colaboradores');
  
        // 5. Evolução mensal
        const evolucaoQuery = `
          SELECT 
            DATE_FORMAT(lmd_data_hora_inicio, '%Y-%m') as mes,
            COUNT(lmd.lmd_id) as total,
            ROUND(AVG(CASE 
              WHEN lmd_data_hora_fim IS NOT NULL THEN
                TIMESTAMPDIFF(MINUTE, lmd_data_hora_inicio, lmd_data_hora_fim)
              END)) as tempo_medio
          FROM log_manutencao_dispositivo lmd
          WHERE DATE(lmd_data_hora_inicio) BETWEEN ? AND ?
            AND lmd.lmd_status IN (2, 3)
          GROUP BY DATE_FORMAT(lmd_data_hora_inicio, '%Y-%m')
          ORDER BY mes ASC
        `;
  
        const evolucaoResult = await executeQuery(evolucaoQuery, [inicio, fim]);
        const evolucaoMensal = Array.isArray(evolucaoResult) 
          ? evolucaoResult.map(item => ({
              mes: item.mes,
              total: item.total,
              tempo_medio: item.tempo_medio || 0
            }))
          : [];
  
        console.log('📈 Evolução mensal:', evolucaoMensal.length, 'meses');
  
        const resultado = {
          totalManutencoes: Number(metricas.total_manutencoes) || 0,
          tempoMedioMinutos: Number(metricas.tempo_medio_minutos) || 0,
          manutencoesPendentes: Number(metricas.manutencoes_pendentes) || 0,
          totalDispositivos: Number(totalDispositivos) || 0,
          porDispositivo: porDispositivo,
          porColaborador: porColaborador,
          evolucaoMensal: evolucaoMensal
        };
  
        console.log('✅ Métricas finais calculadas:', {
          totalManutencoes: resultado.totalManutencoes,
          tempoMedio: resultado.tempoMedioMinutos,
          pendentes: resultado.manutencoesPendentes,
          dispositivos: resultado.totalDispositivos,
          topDispositivos: resultado.porDispositivo.length,
          topColaboradores: resultado.porColaborador.length,
          mesesEvolucao: resultado.evolucaoMensal.length
        });
  
        return resultado;
  
      } catch (error) {
        console.error('❌ Erro ao buscar métricas de manutenção:', error);
        throw error;
      }
    }
  
}

// models/FormularioManutencao.ts
export class FormularioManutencaoModel {
  // Buscar todos os formulários
  static async getFormularios(): Promise<FormularioManutencao[]> {
    try {
      const query = `
        SELECT 
          fmp.*,
          c.col_nome as modificador_nome
        FROM formularios_manutencao_preventiva fmp
        LEFT JOIN colaboradores c ON fmp.fmp_modificador = c.col_id
        ORDER BY fmp.fmp_descricao ASC
      `;
      
      const results = await executeQuery(query);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar formulários:', error);
      throw error;
    }
  }

  // Buscar itens de um formulário
  static async getItensFormulario(formularioId: number): Promise<ItemFormularioManutencao[]> {
    try {
      const query = `
        SELECT * FROM itens_formulario_manutencao 
        WHERE ifm_formulario = ?
        ORDER BY ifm_posicao ASC
      `;
      
      const results = await executeQuery(query, [formularioId]);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar itens do formulário:', error);
      throw error;
    }
  }

  // Criar novo formulário
  static async criarFormulario(
    descricao: string, 
    modificadorId: number, 
    itens: Array<{ descricao: string; posicao: number }>
  ): Promise<number> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Inserir formulário
      const insertFormQuery = `
        INSERT INTO formularios_manutencao_preventiva (fmp_descricao, fmp_data_ultima_modificacao, fmp_modificador)
        VALUES (UPPER(?), NOW(), ?)
      `;
      
      const formResult = await connection.execute(insertFormQuery, [descricao, modificadorId]);
      const formularioId = (formResult[0] as ResultSetHeader).insertId;

      // Inserir itens
      if (itens.length > 0) {
        const insertItensQuery = `
          INSERT INTO itens_formulario_manutencao (ifm_formulario, ifm_descricao, ifm_posicao)
          VALUES ?
        `;
        
        const values = itens.map(item => [
          formularioId,
          item.descricao.toUpperCase(),
          item.posicao
        ]);

        await connection.query(insertItensQuery, [values]);
      }

      await connection.commit();
      return formularioId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Atualizar formulário
  static async atualizarFormulario(
    formularioId: number,
    descricao: string,
    modificadorId: number,
    itensInserir: Array<{ descricao: string; posicao: number }>,
    itensAtualizar: Array<{ id: number; descricao: string; posicao: number }>,
    itensRemover: number[]
  ): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Atualizar formulário
      const updateFormQuery = `
        UPDATE formularios_manutencao_preventiva 
        SET fmp_descricao = UPPER(?), fmp_data_ultima_modificacao = NOW(), fmp_modificador = ?
        WHERE fmp_id = ?
      `;
      
      await connection.execute(updateFormQuery, [descricao, modificadorId, formularioId]);

      // Inserir novos itens
      if (itensInserir.length > 0) {
        const insertQuery = `
          INSERT INTO itens_formulario_manutencao (ifm_formulario, ifm_descricao, ifm_posicao)
          VALUES ?
        `;
        
        const values = itensInserir.map(item => [
          formularioId,
          item.descricao.toUpperCase(),
          item.posicao
        ]);

        await connection.query(insertQuery, [values]);
      }

      // Atualizar itens existentes
      for (const item of itensAtualizar) {
        const updateQuery = `
          UPDATE itens_formulario_manutencao 
          SET ifm_descricao = UPPER(?), ifm_posicao = ?
          WHERE ifm_id = ?
        `;
        
        await connection.execute(updateQuery, [item.descricao, item.posicao, item.id]);
      }

      // Remover itens
      if (itensRemover.length > 0) {
        const deleteQuery = `DELETE FROM itens_formulario_manutencao WHERE ifm_id IN (${itensRemover.map(() => '?').join(',')})`;
        await connection.execute(deleteQuery, itensRemover);
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

export class DebugManutencaoModel {
  static async verificarRespostasSalvas(manutencaoId: number) {
    try {
      const query = `
        SELECT 
          rif_id,
          rif_item,
          rif_log_manutencao,
          rif_ok,
          HEX(rif_ok) as rif_ok_hex,
          CAST(rif_ok AS UNSIGNED) as rif_ok_unsigned,
          CASE 
            WHEN rif_ok = 0x01 THEN 'OK (1)'
            WHEN rif_ok = 0x00 THEN 'NOK (0)'
            ELSE 'UNKNOWN'
          END as rif_ok_interpretado,
          rif_observacao,
          ifm.ifm_descricao
        FROM resposta_item_formulario rif
        LEFT JOIN itens_formulario_manutencao ifm ON rif.rif_item = ifm.ifm_id
        WHERE rif.rif_log_manutencao = ?
        ORDER BY ifm.ifm_posicao
      `;
      
      const results = await executeQuery(query, [manutencaoId]);
      
      console.log('🔍 DEBUG - Respostas salvas no banco:');
      console.table(results);
      
      return results;
    } catch (error) {
      console.error('Erro ao verificar respostas salvas:', error);
      throw error;
    }
  }
}