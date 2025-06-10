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
      // const query = `
      //   SELECT 
      //     d.dis_id,
      //     d.dis_descricao,
      //     d.dis_com_manutencao,
      //     d.dis_info_manutencao,
      //     dim.dim_tipo_intervalo,
      //     dim.dim_intervalo_dias,
      //     dim.dim_intervalo_placas,
      //     dim.dim_placas_executadas,
      //     dim.dim_data_ultima_manutencao,
      //     CASE 
      //       WHEN dim.dim_tipo_intervalo = 'DIA' THEN 
      //         COALESCE(DATEDIFF(NOW(), dim.dim_data_ultima_manutencao), 9999)
      //       ELSE 
      //         COALESCE(dim.dim_placas_executadas, 0)
      //     END as dias_desde_ultima,
      //     CASE 
      //       WHEN dim.dim_tipo_intervalo = 'DIA' THEN 
      //         COALESCE(DATEDIFF(NOW(), dim.dim_data_ultima_manutencao), 9999) >= dim.dim_intervalo_dias
      //       ELSE 
      //         COALESCE(dim.dim_placas_executadas, 0) >= dim.dim_intervalo_placas
      //     END as necessita_manutencao
      //   FROM dispositivos d
      //   INNER JOIN dispositivo_info_manutencao dim ON d.dis_info_manutencao = dim.dim_id
      //   WHERE d.dis_com_manutencao = 1 
      //   AND d.dis_status = 1
      //   ORDER BY necessita_manutencao DESC, dias_desde_ultima DESC
      // `;
      
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
          CASE 
            WHEN COALESCE(dim.dim_tipo_intervalo, 'DIA') = 'DIA' THEN 
              COALESCE(DATEDIFF(NOW(), dim.dim_data_ultima_manutencao), 9999)
            ELSE 
              COALESCE(dim.dim_placas_executadas, 0)
          END as dias_desde_ultima,
          CASE 
            WHEN COALESCE(dim.dim_tipo_intervalo, 'DIA') = 'DIA' THEN 
              COALESCE(DATEDIFF(NOW(), dim.dim_data_ultima_manutencao), 9999) >= COALESCE(dim.dim_intervalo_dias, 30)
            ELSE 
              COALESCE(dim.dim_placas_executadas, 0) >= COALESCE(dim.dim_intervalo_placas, 1000)
          END as necessita_manutencao,
          -- Cálculo da porcentagem de uso/manutenção
          CASE 
            WHEN COALESCE(dim.dim_tipo_intervalo, 'DIA') = 'DIA' THEN 
              ROUND((COALESCE(DATEDIFF(NOW(), dim.dim_data_ultima_manutencao), 0) / COALESCE(dim.dim_intervalo_dias, 30)) * 100, 2)
            ELSE 
              ROUND((COALESCE(dim.dim_placas_executadas, 0) / COALESCE(dim.dim_intervalo_placas, 1000)) * 100, 2)
          END as percentual_manutencao
        FROM dispositivos d
        LEFT JOIN dispositivo_info_manutencao dim ON d.dis_info_manutencao = dim.dim_id
        WHERE d.dis_com_manutencao = 1 
        AND d.dis_status = 1
        ORDER BY necessita_manutencao DESC, percentual_manutencao DESC
    `;

      const results = await executeQuery(query);
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

  // Finalizar manutenção
  static async finalizarManutencao(
    manutencaoId: number, 
    observacao: string, 
    respostas: RespostaItemFormulario[]
  ): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Inserir respostas dos itens
      if (respostas.length > 0) {
        const insertRespostasQuery = `
          INSERT INTO resposta_item_formulario (rif_item, rif_log_manutencao, rif_ok, rif_observacao)
          VALUES ?
        `;
        
        const values = respostas.map(r => [
          r.rif_item,
          r.rif_log_manutencao,
          r.rif_ok === 1 ? Buffer.from([1]) : Buffer.from([0]),
          r.rif_observacao.toUpperCase()
        ]);

        await connection.query(insertRespostasQuery, [values]);
      }

      // 2. Atualizar log de manutenção
      const updateLogQuery = `
        UPDATE log_manutencao_dispositivo 
        SET lmd_data_hora_fim = NOW(),
            lmd_observacao = UPPER(?),
            lmd_status = 2
        WHERE lmd_id = ?
      `;
      
      await connection.execute(updateLogQuery, [observacao, manutencaoId]);

      // 3. Atualizar info de manutenção do dispositivo
      const updateDispositivoQuery = `
        UPDATE dispositivo_info_manutencao dim
        INNER JOIN log_manutencao_dispositivo lmd ON lmd.lmd_dispositivo = (
          SELECT dis_id FROM dispositivos WHERE dis_info_manutencao = dim.dim_id
        )
        SET dim.dim_placas_executadas = 0,
            dim.dim_data_ultima_manutencao = NOW()
        WHERE lmd.lmd_id = ?
      `;
      
      await connection.execute(updateDispositivoQuery, [manutencaoId]);

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
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

  // Buscar detalhes de uma manutenção específica
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

      // Buscar respostas dos itens
      const respostasQuery = `
        SELECT 
          rif.*,
          ifm.ifm_descricao as item_descricao
        FROM resposta_item_formulario rif
        LEFT JOIN itens_formulario_manutencao ifm ON rif.rif_item = ifm.ifm_id
        WHERE rif.rif_log_manutencao = ?
        ORDER BY ifm.ifm_posicao
      `;
      
      const respostasResult = await executeQuery(respostasQuery, [manutencaoId]);

      console.log('🔍 Respostas brutas do banco:', respostasResult);

      // Converter valores binary para number
      const respostasConvertidas = Array.isArray(respostasResult) 
        ? respostasResult.map((r: any) => {
            let rif_ok_final = r.rif_ok;
            
            // Converter diferentes formatos possíveis
            if (Buffer.isBuffer(r.rif_ok)) {
              rif_ok_final = r.rif_ok[0] === 1 ? 1 : 0;
            } else if (typeof r.rif_ok === 'string') {
              rif_ok_final = r.rif_ok === '1' ? 1 : 0;
            } else if (typeof r.rif_ok === 'boolean') {
              rif_ok_final = r.rif_ok ? 1 : 0;
            }
            
            console.log(`📝 Item ${r.rif_item}: original=${r.rif_ok}, convertido=${rif_ok_final}`);
            
            return {
              ...r,
              rif_ok: rif_ok_final
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
