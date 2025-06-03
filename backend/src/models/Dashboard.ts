import { executeQuery } from '../config/database';
import { DashboardStats } from '../types';

export class DashboardModel {
  // Obter estatísticas gerais do dashboard
  static async getStats(): Promise<DashboardStats> {
    try {
      // Total de dispositivos
      const totalDispositivosQuery = `
        SELECT COUNT(*) as total FROM dispositivos
      `;
      
      // Dispositivos ativos
      const dispositivosAtivosQuery = `
        SELECT COUNT(*) as total FROM dispositivos WHERE dis_status = 1
      `;
      
      // Chamados abertos
      const chamadosAbertosQuery = `
        SELECT COUNT(*) as total FROM chamados WHERE cha_status = 1
      `;
      
      // Manutenções pendentes
      const manutencoesPendentesQuery = `
        SELECT COUNT(*) as total FROM log_manutencao_dispositivo WHERE lmd_status = 1
      `;
      
      // Indicadores do mês atual
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const indicadoresMensalQuery = `
        SELECT 
          COALESCE(SUM(ind_minutos_mensal), 0) as minutos,
          COALESCE(SUM(ind_atendimento_mensal), 0) as atendimentos,
          COALESCE(SUM(ind_atraso_mensal), 0) as atrasos
        FROM indicadores 
        WHERE MONTH(ind_data) = ? AND YEAR(ind_data) = ?
      `;

      // Executar todas as queries
      const [
        totalDispositivos,
        dispositivosAtivos,
        chamadosAbertos,
        manutencoesPendentes,
        indicadorMensal
      ] = await Promise.all([
        executeQuery(totalDispositivosQuery),
        executeQuery(dispositivosAtivosQuery),
        executeQuery(chamadosAbertosQuery),
        executeQuery(manutencoesPendentesQuery),
        executeQuery(indicadoresMensalQuery, [currentMonth, currentYear])
      ]);

      return {
        totalDispositivos: totalDispositivos[0]?.total || 0,
        dispositivosAtivos: dispositivosAtivos[0]?.total || 0,
        chamadosAbertos: chamadosAbertos[0]?.total || 0,
        manutencoesPendentes: manutencoesPendentes[0]?.total || 0,
        indicadorMensal: {
          minutos: indicadorMensal[0]?.minutos || 0,
          atendimentos: indicadorMensal[0]?.atendimentos || 0,
          atrasos: indicadorMensal[0]?.atrasos || 0
        }
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas do dashboard:', error);
      throw error;
    }
  }

  // Obter chamados recentes
  static async getRecentChamados(limit: number = 10) {
    try {
      const query = `
        SELECT 
          c.cha_id,
          c.cha_DT,
          c.cha_descricao,
          c.cha_data_hora_abertura,
          c.cha_operador,
          tc.tch_descricao as tipo_chamado,
          sc.stc_descricao as status_chamado,
          cl.cli_nome as cliente_nome
        FROM chamados c
        LEFT JOIN tipos_chamado tc ON c.cha_tipo = tc.tch_id
        LEFT JOIN status_chamado sc ON c.cha_status = sc.stc_id
        LEFT JOIN clientes cl ON c.cha_cliente = cl.cli_id
        ORDER BY c.cha_data_hora_abertura DESC
        LIMIT ?
      `;
      
      const results = await executeQuery(query, [limit]);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao obter chamados recentes:', error);
      throw error;
    }
  }

  // Obter dispositivos que precisam de manutenção
  static async getDispositivosManutencao(limit: number = 10) {
    try {
      const query = `
        SELECT 
          d.dis_id,
          d.dis_descricao,
          d.dis_local,
          d.dis_ciclos_executados,
          d.dis_ciclos_de_vida,
          dim.dim_data_ultima_manutencao,
          dim.dim_tipo_intervalo,
          dim.dim_intervalo_dias,
          dim.dim_intervalo_placas,
          dim.dim_placas_executadas,
          CASE 
            WHEN dim.dim_tipo_intervalo = 'DIA' THEN 
              DATEDIFF(NOW(), dim.dim_data_ultima_manutencao)
            ELSE 
              dim.dim_placas_executadas
          END as necessidade_manutencao
        FROM dispositivos d
        LEFT JOIN dispositivo_info_manutencao dim ON d.dis_info_manutencao = dim.dim_id
        WHERE d.dis_com_manutencao = 1 
        AND d.dis_status = 1
        AND (
          (dim.dim_tipo_intervalo = 'DIA' AND DATEDIFF(NOW(), dim.dim_data_ultima_manutencao) >= dim.dim_intervalo_dias)
          OR 
          (dim.dim_tipo_intervalo = 'PLACA' AND dim.dim_placas_executadas >= dim.dim_intervalo_placas)
        )
        ORDER BY necessidade_manutencao DESC
        LIMIT ?
      `;
      
      const results = await executeQuery(query, [limit]);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao obter dispositivos para manutenção:', error);
      throw error;
    }
  }
}