import { executeQuery } from '../config/database';
import { ResultSetHeader } from 'mysql2';

export interface Orcamento {
  orc_id: number;
  cav_id: number;
  orc_centro_custo: string;
  orc_ano: number;
  orc_orcado: number;
  orc_gasto: number;
  // Campos calculados
  orc_disponivel?: number;
  orc_percentual_usado?: number;
  orc_status?: 'NO_LIMITE' | 'PROXIMO_LIMITE' | 'LIMITE_EXCEDIDO';
  // Campos relacionados
  categoria_verba?: string;
}

export interface ResumoOrcamento {
  ano: number;
  centroCusto: string;
  categoria: string;
  orcado: number;
  gasto: number;
  disponivel: number;
  percentualUsado: number;
  status: string;
}

export class OrcamentoModel {
  // Listar orçamentos
  static async findAll(filtros: {
    ano?: number;
    centroCusto?: string;
    categoria?: number;
  } = {}): Promise<Orcamento[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filtros.ano) {
        whereClause += ' AND o.orc_ano = ?';
        params.push(filtros.ano);
      }

      if (filtros.centroCusto) {
        whereClause += ' AND o.orc_centro_custo = ?';
        params.push(filtros.centroCusto);
      }

      if (filtros.categoria) {
        whereClause += ' AND o.cav_id = ?';
        params.push(filtros.categoria);
      }

      const query = `
        SELECT 
          o.*,
          cv.cav_nome as categoria_verba,
          (o.orc_orcado - o.orc_gasto) as orc_disponivel,
          ROUND((o.orc_gasto / o.orc_orcado) * 100, 2) as orc_percentual_usado,
          CASE 
            WHEN (o.orc_gasto / o.orc_orcado) >= 1.0 THEN 'LIMITE_EXCEDIDO'
            WHEN (o.orc_gasto / o.orc_orcado) >= 0.8 THEN 'PROXIMO_LIMITE' 
            ELSE 'NO_LIMITE'
          END as orc_status
        FROM orcamento o
        LEFT JOIN categorias_verbas cv ON o.cav_id = cv.cav_id
        ${whereClause}
        ORDER BY o.orc_ano DESC, o.orc_centro_custo, cv.cav_nome
      `;

      const results = await executeQuery(query, params);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar orçamentos:', error);
      throw error;
    }
  }

  // Buscar orçamento por ID
  static async findById(id: number): Promise<Orcamento | null> {
    try {
      const query = `
        SELECT 
          o.*,
          cv.cav_nome as categoria_verba,
          (o.orc_orcado - o.orc_gasto) as orc_disponivel,
          ROUND((o.orc_gasto / o.orc_orcado) * 100, 2) as orc_percentual_usado,
          CASE 
            WHEN (o.orc_gasto / o.orc_orcado) >= 1.0 THEN 'LIMITE_EXCEDIDO'
            WHEN (o.orc_gasto / o.orc_orcado) >= 0.8 THEN 'PROXIMO_LIMITE' 
            ELSE 'NO_LIMITE'
          END as orc_status
        FROM orcamento o
        LEFT JOIN categorias_verbas cv ON o.cav_id = cv.cav_id
        WHERE o.orc_id = ?
      `;

      const results = await executeQuery(query, [id]);
      return Array.isArray(results) && results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Erro ao buscar orçamento:', error);
      throw error;
    }
  }

  // Criar orçamento
  static async create(orcamento: Partial<Orcamento>): Promise<number> {
    try {
      // Verificar se já existe orçamento para a combinação ano + centro de custo + categoria
      const existeQuery = `
        SELECT COUNT(*) as count 
        FROM orcamento 
        WHERE orc_ano = ? AND orc_centro_custo = ? AND cav_id = ?
      `;
      
      const existe = await executeQuery(existeQuery, [
        orcamento.orc_ano,
        orcamento.orc_centro_custo,
        orcamento.cav_id
      ]);

      if (Array.isArray(existe) && existe[0] && existe[0].count > 0) {
        throw new Error('Já existe orçamento para esta combinação de ano, centro de custo e categoria');
      }

      const query = `
        INSERT INTO orcamento (
          cav_id, orc_centro_custo, orc_ano, orc_orcado, orc_gasto
        ) VALUES (?, ?, ?, ?, ?)
      `;

      const result = await executeQuery(query, [
        orcamento.cav_id,
        orcamento.orc_centro_custo,
        orcamento.orc_ano,
        orcamento.orc_orcado || 0,
        0 // Gasto sempre inicia em 0
      ]);

      return (result as ResultSetHeader).insertId;
    } catch (error) {
      console.error('Erro ao criar orçamento:', error);
      throw error;
    }
  }

  // Atualizar orçamento
  static async update(id: number, orcamento: Partial<Orcamento>): Promise<boolean> {
    try {
      const query = `
        UPDATE orcamento SET
          cav_id = ?,
          orc_centro_custo = ?,
          orc_ano = ?,
          orc_orcado = ?
        WHERE orc_id = ?
      `;

      const result = await executeQuery(query, [
        orcamento.cav_id,
        orcamento.orc_centro_custo,
        orcamento.orc_ano,
        orcamento.orc_orcado || 0,
        id
      ]);

      return (result as ResultSetHeader).affectedRows > 0;
    } catch (error) {
      console.error('Erro ao atualizar orçamento:', error);
      throw error;
    }
  }

  // Deletar orçamento
  static async delete(id: number): Promise<boolean> {
    try {
      // Verificar se há gastos registrados
      const gastosQuery = 'SELECT orc_gasto FROM orcamento WHERE orc_id = ?';
      const gastos = await executeQuery(gastosQuery, [id]);
      
      if (Array.isArray(gastos) && gastos[0] && gastos[0].orc_gasto > 0) {
        throw new Error('Não é possível excluir orçamento que já possui gastos registrados');
      }

      const query = 'DELETE FROM orcamento WHERE orc_id = ?';
      const result = await executeQuery(query, [id]);
      return (result as ResultSetHeader).affectedRows > 0;
    } catch (error) {
      console.error('Erro ao deletar orçamento:', error);
      throw error;
    }
  }

  // Verificar disponibilidade orçamentária para uma compra
  static async verificarDisponibilidade(
    categoriaId: number,
    centroCusto: string,
    ano: number,
    valor: number
  ): Promise<{
    disponivel: boolean;
    orcado: number;
    gasto: number;
    disponivel_valor: number;
    percentual_usado: number;
  }> {
    try {
      const query = `
        SELECT 
          orc_orcado,
          orc_gasto,
          (orc_orcado - orc_gasto) as disponivel_valor,
          ROUND((orc_gasto / orc_orcado) * 100, 2) as percentual_usado
        FROM orcamento
        WHERE cav_id = ? AND orc_centro_custo = ? AND orc_ano = ?
      `;

      const results = await executeQuery(query, [categoriaId, centroCusto, ano]);
      
      if (!Array.isArray(results) || results.length === 0) {
        return {
          disponivel: false,
          orcado: 0,
          gasto: 0,
          disponivel_valor: 0,
          percentual_usado: 0
        };
      }

      const orcamento = results[0];
      const disponivel = orcamento.disponivel_valor >= valor;

      return {
        disponivel,
        orcado: orcamento.orc_orcado,
        gasto: orcamento.orc_gasto,
        disponivel_valor: orcamento.disponivel_valor,
        percentual_usado: orcamento.percentual_usado
      };
    } catch (error) {
      console.error('Erro ao verificar disponibilidade:', error);
      throw error;
    }
  }

  // Registrar gasto (quando uma compra é aprovada)
  static async registrarGasto(
    categoriaId: number,
    centroCusto: string,
    ano: number,
    valor: number
  ): Promise<boolean> {
    try {
      // Verificar disponibilidade primeiro
      const disponibilidade = await this.verificarDisponibilidade(categoriaId, centroCusto, ano, valor);
      
      if (!disponibilidade.disponivel) {
        throw new Error('Orçamento insuficiente para esta operação');
      }

      const query = `
        UPDATE orcamento 
        SET orc_gasto = orc_gasto + ?
        WHERE cav_id = ? AND orc_centro_custo = ? AND orc_ano = ?
      `;

      const result = await executeQuery(query, [valor, categoriaId, centroCusto, ano]);
      return (result as ResultSetHeader).affectedRows > 0;
    } catch (error) {
      console.error('Erro ao registrar gasto:', error);
      throw error;
    }
  }

  // Estornar gasto (quando uma compra é cancelada)
  static async estornarGasto(
    categoriaId: number,
    centroCusto: string,
    ano: number,
    valor: number
  ): Promise<boolean> {
    try {
      const query = `
        UPDATE orcamento 
        SET orc_gasto = GREATEST(0, orc_gasto - ?)
        WHERE cav_id = ? AND orc_centro_custo = ? AND orc_ano = ?
      `;

      const result = await executeQuery(query, [valor, categoriaId, centroCusto, ano]);
      return (result as ResultSetHeader).affectedRows > 0;
    } catch (error) {
      console.error('Erro ao estornar gasto:', error);
      throw error;
    }
  }

  // Resumo geral do orçamento
  static async getResumoGeral(ano?: number): Promise<{
    resumoPorCategoria: any[];
    resumoPorCentro: any[];
    totais: {
      orcadoTotal: number;
      gastoTotal: number;
      disponivelTotal: number;
      percentualUsadoGeral: number;
    };
  }> {
    try {
      const anoAtual = ano || new Date().getFullYear();

      // Resumo por categoria
      const resumoCategoriaQuery = `
        SELECT 
          cv.cav_nome as categoria,
          SUM(o.orc_orcado) as orcado_total,
          SUM(o.orc_gasto) as gasto_total,
          SUM(o.orc_orcado - o.orc_gasto) as disponivel_total,
          ROUND(AVG((o.orc_gasto / o.orc_orcado) * 100), 2) as percentual_medio
        FROM orcamento o
        LEFT JOIN categorias_verbas cv ON o.cav_id = cv.cav_id
        WHERE o.orc_ano = ?
        GROUP BY o.cav_id, cv.cav_nome
        ORDER BY gasto_total DESC
      `;

      // Resumo por centro de custo
      const resumoCentroQuery = `
        SELECT 
          o.orc_centro_custo as centro_custo,
          SUM(o.orc_orcado) as orcado_total,
          SUM(o.orc_gasto) as gasto_total,
          SUM(o.orc_orcado - o.orc_gasto) as disponivel_total,
          ROUND(AVG((o.orc_gasto / o.orc_orcado) * 100), 2) as percentual_medio
        FROM orcamento o
        WHERE o.orc_ano = ?
        GROUP BY o.orc_centro_custo
        ORDER BY gasto_total DESC
      `;

      // Totais gerais
      const totaisQuery = `
        SELECT 
          SUM(orc_orcado) as orcado_total,
          SUM(orc_gasto) as gasto_total,
          SUM(orc_orcado - orc_gasto) as disponivel_total,
          ROUND((SUM(orc_gasto) / SUM(orc_orcado)) * 100, 2) as percentual_usado_geral
        FROM orcamento
        WHERE orc_ano = ?
      `;

      const [resumoCategoria, resumoCentro, totaisResult] = await Promise.all([
        executeQuery(resumoCategoriaQuery, [anoAtual]),
        executeQuery(resumoCentroQuery, [anoAtual]),
        executeQuery(totaisQuery, [anoAtual])
      ]);

      const totais = Array.isArray(totaisResult) && totaisResult[0] ? totaisResult[0] : {
        orcado_total: 0,
        gasto_total: 0,
        disponivel_total: 0,
        percentual_usado_geral: 0
      };

      return {
        resumoPorCategoria: Array.isArray(resumoCategoria) ? resumoCategoria : [],
        resumoPorCentro: Array.isArray(resumoCentro) ? resumoCentro : [],
        totais: {
          orcadoTotal: parseFloat(totais.orcado_total) || 0,
          gastoTotal: parseFloat(totais.gasto_total) || 0,
          disponivelTotal: parseFloat(totais.disponivel_total) || 0,
          percentualUsadoGeral: parseFloat(totais.percentual_usado_geral) || 0
        }
      };
    } catch (error) {
      console.error('Erro ao gerar resumo geral:', error);
      throw error;
    }
  }

  // Alerta de orçamentos próximos ao limite
  static async getAlertasOrcamento(limite: number = 80): Promise<Orcamento[]> {
    try {
      const query = `
        SELECT 
          o.*,
          cv.cav_nome as categoria_verba,
          (o.orc_orcado - o.orc_gasto) as orc_disponivel,
          ROUND((o.orc_gasto / o.orc_orcado) * 100, 2) as orc_percentual_usado,
          CASE 
            WHEN (o.orc_gasto / o.orc_orcado) >= 1.0 THEN 'LIMITE_EXCEDIDO'
            WHEN (o.orc_gasto / o.orc_orcado) >= 0.8 THEN 'PROXIMO_LIMITE' 
            ELSE 'NO_LIMITE'
          END as orc_status
        FROM orcamento o
        LEFT JOIN categorias_verbas cv ON o.cav_id = cv.cav_id
        WHERE o.orc_ano = YEAR(NOW())
        AND (o.orc_gasto / o.orc_orcado) * 100 >= ?
        ORDER BY orc_percentual_usado DESC
      `;

      const results = await executeQuery(query, [limite]);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar alertas de orçamento:', error);
      throw error;
    }
  }

  // Obter centros de custo únicos
  static async getCentrosCusto(): Promise<string[]> {
    try {
      const query = `
        SELECT DISTINCT orc_centro_custo 
        FROM orcamento 
        ORDER BY orc_centro_custo
      `;

      const results = await executeQuery(query);
      return Array.isArray(results) ? results.map(r => r.orc_centro_custo) : [];
    } catch (error) {
      console.error('Erro ao buscar centros de custo:', error);
      throw error;
    }
  }

  // Obter anos com orçamento
  static async getAnosOrcamento(): Promise<number[]> {
    try {
      const query = `
        SELECT DISTINCT orc_ano 
        FROM orcamento 
        ORDER BY orc_ano DESC
      `;

      const results = await executeQuery(query);
      return Array.isArray(results) ? results.map(r => r.orc_ano) : [];
    } catch (error) {
      console.error('Erro ao buscar anos de orçamento:', error);
      throw error;
    }
  }
}