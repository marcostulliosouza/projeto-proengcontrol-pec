import { executeQuery } from '../config/database';
import { Dispositivo, PaginationParams, FilterParams } from '../types';

export class DispositivoModel {
  // Listar dispositivos com filtros e paginação
  static async findAll(
    pagination: PaginationParams,
    filters: FilterParams = {}
  ): Promise<{ dispositivos: Dispositivo[]; total: number }> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      // Aplicar filtros
      if (filters.search) {
        whereClause += ` AND (d.dis_descricao LIKE ? OR d.dis_codigo_sap LIKE ? OR d.dis_local LIKE ?)`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters.status) {
        whereClause += ` AND d.dis_status = ?`;
        params.push(filters.status);
      }

      if (filters.cliente) {
        whereClause += ` AND d.dis_cliente = ?`;
        params.push(filters.cliente);
      }

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM dispositivos d
        LEFT JOIN clientes c ON d.dis_cliente = c.cli_id
        ${whereClause}
      `;

      // Query para buscar dados
      const dataQuery = `
        SELECT 
          d.*,
          c.cli_nome as cliente_nome,
          sd.sdi_descricao as status_descricao,
          dim.dim_tipo_intervalo,
          dim.dim_intervalo_dias,
          dim.dim_intervalo_placas,
          dim.dim_placas_executadas,
          dim.dim_data_ultima_manutencao
        FROM dispositivos d
        LEFT JOIN clientes c ON d.dis_cliente = c.cli_id
        LEFT JOIN status_dispositivo sd ON d.dis_status = sd.sdi_id
        LEFT JOIN dispositivo_info_manutencao dim ON d.dis_info_manutencao = dim.dim_id
        ${whereClause}
        ORDER BY d.dis_data_cadastro DESC
        LIMIT ? OFFSET ?
      `;

      const [countResult, dispositivos] = await Promise.all([
        executeQuery(countQuery, params),
        executeQuery(dataQuery, [...params, pagination.limit, pagination.offset])
      ]);

      return {
        dispositivos: Array.isArray(dispositivos) ? dispositivos : [],
        total: countResult[0]?.total || 0
      };
    } catch (error) {
      console.error('Erro ao buscar dispositivos:', error);
      throw error;
    }
  }

  // Buscar dispositivo por ID
  static async findById(id: number): Promise<Dispositivo | null> {
    try {
      const query = `
        SELECT 
          d.*,
          c.cli_nome as cliente_nome,
          sd.sdi_descricao as status_descricao,
          dim.dim_tipo_intervalo,
          dim.dim_intervalo_dias,
          dim.dim_intervalo_placas,
          dim.dim_placas_executadas,
          dim.dim_data_ultima_manutencao
        FROM dispositivos d
        LEFT JOIN clientes c ON d.dis_cliente = c.cli_id
        LEFT JOIN status_dispositivo sd ON d.dis_status = sd.sdi_id
        LEFT JOIN dispositivo_info_manutencao dim ON d.dis_info_manutencao = dim.dim_id
        WHERE d.dis_id = ?
      `;

      const results = await executeQuery(query, [id]);
      
      if (Array.isArray(results) && results.length > 0) {
        return results[0] as Dispositivo;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar dispositivo por ID:', error);
      throw error;
    }
  }

  // Criar novo dispositivo
  static async create(dispositivo: Partial<Dispositivo>): Promise<number> {
    try {
      const query = `
        INSERT INTO dispositivos (
          dis_descricao, dis_cliente, dis_com_manutencao, dis_data_cadastro,
          dis_codigo_sap, dis_com_imagem, dis_status, dis_observacao,
          dis_ciclos_de_vida, dis_local
        ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        dispositivo.dis_descricao,
        dispositivo.dis_cliente || null,
        dispositivo.dis_com_manutencao || 0,
        dispositivo.dis_codigo_sap || null,
        dispositivo.dis_com_imagem || 0,
        dispositivo.dis_status || 1,
        dispositivo.dis_observacao || null,
        dispositivo.dis_ciclos_de_vida || 0,
        dispositivo.dis_local || null
      ];

      const result = await executeQuery(query, params);
      return result.insertId;
    } catch (error) {
      console.error('Erro ao criar dispositivo:', error);
      throw error;
    }
  }

  // Atualizar dispositivo
  static async update(id: number, dispositivo: Partial<Dispositivo>): Promise<boolean> {
    try {
      const query = `
        UPDATE dispositivos SET
          dis_descricao = ?,
          dis_cliente = ?,
          dis_com_manutencao = ?,
          dis_codigo_sap = ?,
          dis_status = ?,
          dis_observacao = ?,
          dis_ciclos_de_vida = ?,
          dis_local = ?
        WHERE dis_id = ?
      `;

      const params = [
        dispositivo.dis_descricao,
        dispositivo.dis_cliente || null,
        dispositivo.dis_com_manutencao || 0,
        dispositivo.dis_codigo_sap || null,
        dispositivo.dis_status || 1,
        dispositivo.dis_observacao || null,
        dispositivo.dis_ciclos_de_vida || 0,
        dispositivo.dis_local || null,
        id
      ];

      const result = await executeQuery(query, params);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao atualizar dispositivo:', error);
      throw error;
    }
  }

  // Deletar dispositivo
  static async delete(id: number): Promise<boolean> {
    try {
      const query = 'DELETE FROM dispositivos WHERE dis_id = ?';
      const result = await executeQuery(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao deletar dispositivo:', error);
      throw error;
    }
  }

  // Buscar clientes para dropdown
  static async getClientes() {
    try {
      const query = `
        SELECT cli_id, cli_nome 
        FROM clientes 
        WHERE cli_ativo = 1 
        ORDER BY cli_nome
      `;
      
      const results = await executeQuery(query);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      throw error;
    }
  }

  // Buscar status para dropdown
  static async getStatus() {
    try {
      const query = `
        SELECT sdi_id, sdi_descricao 
        FROM status_dispositivo 
        ORDER BY sdi_id
      `;
      
      const results = await executeQuery(query);
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Erro ao buscar status:', error);
      throw error;
    }
  }
}