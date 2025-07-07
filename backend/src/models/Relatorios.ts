// src/models/Relatorios.ts

import { executeQuery } from '../config/database';
import { RelatorioFiltros } from '../types/index';

export class RelatoriosModel {
  
  // Relatório de chamados por período
  static async getChamadosPorPeriodo(filtros: RelatorioFiltros) {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      // Aplicar filtros
      if (filtros.dataInicio) {
        whereClause += ` AND DATE(c.cha_data_hora_abertura) >= ?`;
        params.push(filtros.dataInicio);
      }

      if (filtros.dataFim) {
        whereClause += ` AND DATE(c.cha_data_hora_abertura) <= ?`;
        params.push(filtros.dataFim);
      }

      if (filtros.cliente) {
        whereClause += ` AND c.cha_cliente = ?`;
        params.push(filtros.cliente);
      }

      if (filtros.status) {
        whereClause += ` AND c.cha_status = ?`;
        params.push(filtros.status);
      }

      if (filtros.tipo) {
        whereClause += ` AND c.cha_tipo = ?`;
        params.push(filtros.tipo);
      }

      if (filtros.operador) {
        whereClause += ` AND c.cha_operador LIKE ?`;
        params.push(`%${filtros.operador}%`);
      }

      const query = `
        SELECT 
          c.cha_id as id,
          cl.cli_nome as cliente,
          tc.tch_descricao as tipo,
          sc.stc_descricao as status,
          c.cha_operador as operador,
          DATE_FORMAT(c.cha_data_hora_abertura, '%d/%m/%Y %H:%i') as dataAbertura,
          DATE_FORMAT(c.cha_data_hora_atendimento, '%d/%m/%Y %H:%i') as dataAtendimento,
          DATE_FORMAT(c.cha_data_hora_termino, '%d/%m/%Y %H:%i') as dataTermino,
          CASE 
            WHEN c.cha_data_hora_termino IS NOT NULL AND c.cha_data_hora_atendimento IS NOT NULL THEN
              CONCAT(
                TIMESTAMPDIFF(HOUR, c.cha_data_hora_atendimento, c.cha_data_hora_termino), 'h ',
                MOD(TIMESTAMPDIFF(MINUTE, c.cha_data_hora_atendimento, c.cha_data_hora_termino), 60), 'min'
              )
            WHEN c.cha_data_hora_atendimento IS NOT NULL THEN
              CONCAT(
                TIMESTAMPDIFF(HOUR, c.cha_data_hora_atendimento, NOW()), 'h ',
                MOD(TIMESTAMPDIFF(MINUTE, c.cha_data_hora_atendimento, NOW()), 60), 'min'
              )
            ELSE '-'
          END as tempoAtendimento,
          c.cha_descricao as descricao,
          p.pro_nome as produto,
          ac.ach_descricao as acao
        FROM chamados c
        LEFT JOIN clientes cl ON c.cha_cliente = cl.cli_id
        LEFT JOIN tipos_chamado tc ON c.cha_tipo = tc.tch_id
        LEFT JOIN status_chamado sc ON c.cha_status = sc.stc_id
        LEFT JOIN produtos p ON c.cha_produto = p.pro_id
        LEFT JOIN acoes_chamados ac ON c.cha_acao = ac.ach_id
        ${whereClause}
        ORDER BY c.cha_data_hora_abertura DESC
      `;

      const results = await executeQuery(query, params);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar chamados por período:', error);
      throw error;
    }
  }

  // Relatório de status dos dispositivos
  static async getStatusDispositivos(filtros: RelatorioFiltros) {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filtros.cliente) {
        whereClause += ` AND d.dis_cliente = ?`;
        params.push(filtros.cliente);
      }

      if (filtros.status) {
        whereClause += ` AND d.dis_status = ?`;
        params.push(filtros.status);
      }

      const query = `
        SELECT 
          d.dis_id as id,
          CONCAT(d.dis_marca, ' ', d.dis_modelo, ' - ', d.dis_numero_serie) as dispositivo,
          cl.cli_nome as cliente,
          CASE 
            WHEN d.dis_status = 1 THEN 'Ativo'
            WHEN d.dis_status = 2 THEN 'Manutenção'
            WHEN d.dis_status = 3 THEN 'Inativo'
            ELSE 'Desconhecido'
          END as status,
          DATE_FORMAT(d.dis_data_ultima_manutencao, '%d/%m/%Y') as ultimaManutencao,
          DATE_FORMAT(d.dis_data_proxima_manutencao, '%d/%m/%Y') as proximaManutencao,
          d.dis_localizacao as localizacao,
          d.dis_modelo as modelo,
          d.dis_numero_serie as numeroSerie
        FROM dispositivos d
        LEFT JOIN clientes cl ON d.dis_cliente = cl.cli_id
        ${whereClause}
        ORDER BY cl.cli_nome, d.dis_marca, d.dis_modelo
      `;

      const results = await executeQuery(query, params);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar status dos dispositivos:', error);
      throw error;
    }
  }

  // Relatório de manutenções preventivas
  static async getManutencoesPpreventivas(filtros: RelatorioFiltros) {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filtros.dataInicio) {
        whereClause += ` AND DATE(m.man_data_agendada) >= ?`;
        params.push(filtros.dataInicio);
      }

      if (filtros.dataFim) {
        whereClause += ` AND DATE(m.man_data_agendada) <= ?`;
        params.push(filtros.dataFim);
      }

      if (filtros.cliente) {
        whereClause += ` AND d.dis_cliente = ?`;
        params.push(filtros.cliente);
      }

      if (filtros.tecnico) {
        whereClause += ` AND m.man_tecnico LIKE ?`;
        params.push(`%${filtros.tecnico}%`);
      }

      if (filtros.status) {
        whereClause += ` AND m.man_status = ?`;
        params.push(filtros.status);
      }

      const query = `
        SELECT 
          m.man_id as id,
          CONCAT(d.dis_marca, ' ', d.dis_modelo, ' - ', d.dis_numero_serie) as dispositivo,
          cl.cli_nome as cliente,
          CASE 
            WHEN m.man_tipo = 1 THEN 'Preventiva'
            WHEN m.man_tipo = 2 THEN 'Corretiva'
            WHEN m.man_tipo = 3 THEN 'Preditiva'
            ELSE 'Outro'
          END as tipo,
          DATE_FORMAT(m.man_data_agendada, '%d/%m/%Y') as dataAgendada,
          DATE_FORMAT(m.man_data_realizada, '%d/%m/%Y') as dataRealizada,
          m.man_tecnico as tecnico,
          CASE 
            WHEN m.man_status = 1 THEN 'Agendado'
            WHEN m.man_status = 2 THEN 'Em Andamento'
            WHEN m.man_status = 3 THEN 'Concluído'
            WHEN m.man_status = 4 THEN 'Cancelado'
            ELSE 'Pendente'
          END as status,
          m.man_observacoes as observacoes,
          COALESCE(m.man_custos, 0) as custos
        FROM manutencoes m
        LEFT JOIN dispositivos d ON m.man_dispositivo = d.dis_id
        LEFT JOIN clientes cl ON d.dis_cliente = cl.cli_id
        ${whereClause}
        ORDER BY m.man_data_agendada DESC
      `;

      const results = await executeQuery(query, params);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar manutenções preventivas:', error);
      throw error;
    }
  }

  // Relatório de indicadores de produção
  static async getIndicadoresProducao(filtros: RelatorioFiltros) {
    try {
      let whereClause = '';
      const params: any[] = [];

      if (filtros.dataInicio && filtros.dataFim) {
        whereClause = `WHERE DATE(cha_data_hora_abertura) BETWEEN ? AND ?`;
        params.push(filtros.dataInicio, filtros.dataFim);
      } else {
        // Últimos 6 meses se não especificado
        whereClause = `WHERE cha_data_hora_abertura >= DATE_SUB(NOW(), INTERVAL 6 MONTH)`;
      }

      const query = `
        SELECT 
          DATE_FORMAT(cha_data_hora_abertura, '%Y-%m') as periodo,
          COUNT(*) as chamadosAbertos,
          SUM(CASE WHEN cha_status = 3 THEN 1 ELSE 0 END) as chamadosFechados,
          CONCAT(
            AVG(CASE 
              WHEN cha_data_hora_termino IS NOT NULL AND cha_data_hora_atendimento IS NOT NULL 
              THEN TIMESTAMPDIFF(HOUR, cha_data_hora_atendimento, cha_data_hora_termino) 
              ELSE NULL 
            END), 'h ',
            AVG(CASE 
              WHEN cha_data_hora_termino IS NOT NULL AND cha_data_hora_atendimento IS NOT NULL 
              THEN MOD(TIMESTAMPDIFF(MINUTE, cha_data_hora_atendimento, cha_data_hora_termino), 60)
              ELSE NULL 
            END), 'min'
          ) as tempoMedioAtendimento,
          COALESCE(AVG(cha_avaliacao), 0) as satisfacaoCliente,
          ROUND(
            (SUM(CASE WHEN cha_status = 3 AND cha_data_hora_termino <= DATE_ADD(cha_data_hora_abertura, INTERVAL 24 HOUR) THEN 1 ELSE 0 END) / 
             COUNT(*)) * 100, 2
          ) as sla,
          ROUND(
            SUM(CASE WHEN cha_status = 3 THEN 1 ELSE 0 END) / 
            COUNT(DISTINCT cha_operador), 2
          ) as produtividade
        FROM chamados 
        ${whereClause}
        GROUP BY DATE_FORMAT(cha_data_hora_abertura, '%Y-%m')
        ORDER BY periodo DESC
      `;

      const results = await executeQuery(query, params);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar indicadores de produção:', error);
      throw error;
    }
  }

  // Funções auxiliares para opções de filtros
  static async getClientes() {
    try {
      const query = `
        SELECT cli_id as value, cli_nome as label 
        FROM clientes 
        WHERE cli_ativo = 1
        ORDER BY cli_nome
      `;
      
      const results = await executeQuery(query, []);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      throw error;
    }
  }

  static async getStatus() {
    try {
      const query = `
        SELECT stc_id as value, stc_descricao as label 
        FROM status_chamado 
        ORDER BY stc_id
      `;
      
      const results = await executeQuery(query, []);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar status:', error);
      throw error;
    }
  }

  static async getTipos() {
    try {
      const query = `
        SELECT tch_id as value, tch_descricao as label 
        FROM tipos_chamado 
        ORDER BY tch_descricao
      `;
      
      const results = await executeQuery(query, []);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar tipos:', error);
      throw error;
    }
  }

  // Relatórios estatísticos adicionais
  static async getEstatisticasGerais(filtros: RelatorioFiltros) {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filtros.dataInicio) {
        whereClause += ` AND DATE(cha_data_hora_abertura) >= ?`;
        params.push(filtros.dataInicio);
      }

      if (filtros.dataFim) {
        whereClause += ` AND DATE(cha_data_hora_abertura) <= ?`;
        params.push(filtros.dataFim);
      }

      const query = `
        SELECT 
          COUNT(*) as totalChamados,
          SUM(CASE WHEN cha_status IN (1, 2) THEN 1 ELSE 0 END) as chamadosAbertos,
          SUM(CASE WHEN cha_status = 3 THEN 1 ELSE 0 END) as chamadosFechados,
          AVG(CASE 
            WHEN cha_data_hora_atendimento IS NOT NULL 
            THEN TIMESTAMPDIFF(MINUTE, cha_data_hora_abertura, cha_data_hora_atendimento) 
            ELSE NULL 
          END) as tempoMedioResposta,
          AVG(COALESCE(cha_avaliacao, 0)) as satisfacaoMedia,
          ROUND(
            (SUM(CASE WHEN cha_status = 3 AND cha_data_hora_termino <= DATE_ADD(cha_data_hora_abertura, INTERVAL 24 HOUR) THEN 1 ELSE 0 END) / 
             COUNT(*)) * 100, 2
          ) as slaAtendido
        FROM chamados 
        ${whereClause}
      `;

      const results = await executeQuery(query, params);
      return Array.isArray(results) && results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Erro ao buscar estatísticas gerais:', error);
      throw error;
    }
  }

  // Relatório de performance por operador
  static async getPerformancePorOperador(filtros: RelatorioFiltros) {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filtros.dataInicio) {
        whereClause += ` AND DATE(cha_data_hora_abertura) >= ?`;
        params.push(filtros.dataInicio);
      }

      if (filtros.dataFim) {
        whereClause += ` AND DATE(cha_data_hora_abertura) <= ?`;
        params.push(filtros.dataFim);
      }

      const query = `
        SELECT 
          cha_operador as operador,
          COUNT(*) as totalChamados,
          SUM(CASE WHEN cha_status = 3 THEN 1 ELSE 0 END) as chamadosFinalizados,
          AVG(CASE 
            WHEN cha_data_hora_termino IS NOT NULL AND cha_data_hora_atendimento IS NOT NULL 
            THEN TIMESTAMPDIFF(MINUTE, cha_data_hora_atendimento, cha_data_hora_termino) 
            ELSE NULL 
          END) as tempoMedioAtendimento,
          AVG(COALESCE(cha_avaliacao, 0)) as avaliacaoMedia,
          ROUND(
            (SUM(CASE WHEN cha_status = 3 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2
          ) as taxaFinalizacao
        FROM chamados 
        ${whereClause}
        GROUP BY cha_operador
        ORDER BY chamadosFinalizados DESC
      `;

      const results = await executeQuery(query, params);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar performance por operador:', error);
      throw error;
    }
  }
}