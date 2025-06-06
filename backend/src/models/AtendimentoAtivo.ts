// models/AtendimentoAtivo.ts - OTIMIZADO
import { executeQuery, pool } from '../config/database';
import { ResultSetHeader } from 'mysql2';

export interface AtendimentoAtivo {
  atc_id: number;
  atc_chamado: number;
  atc_colaborador: number;
  atc_data_hora_inicio: string;
  atc_data_hora_termino: string | null;
  tempo_decorrido?: number;
  colaborador_nome?: string;
  chamado_descricao?: string;
  cliente_nome?: string;
  cha_DT?: string;
  tipo_chamado?: string;
}

export class AtendimentoAtivoModel {
  // Cache para verificações recentes
  private static verificacaoCache = new Map<string, { resultado: boolean; timestamp: number }>();
  private static CACHE_TTL = 5000; // 5 segundos

  // Limpar cache antigo
  private static limparCache() {
    const agora = Date.now();
    for (const [key, value] of this.verificacaoCache) {
      if (agora - value.timestamp > this.CACHE_TTL) {
        this.verificacaoCache.delete(key);
      }
    }
  }

  // Limpar registros órfãos OTIMIZADO
  static async limparRegistrosOrfaos(chamadoId?: number): Promise<void> {
    try {
      if (chamadoId) {
        const query = `
          DELETE FROM atendimentos_chamados 
          WHERE atc_chamado = ? AND atc_data_hora_termino IS NULL
        `;
        await executeQuery(query, [chamadoId]);
        console.log(`🧹 Limpados registros do chamado ${chamadoId}`);
      } else {
        // Limpeza em batch para melhor performance
        const query = `
          UPDATE atendimentos_chamados 
          SET atc_data_hora_termino = NOW() 
          WHERE atc_data_hora_termino IS NULL 
          AND (
            atc_data_hora_inicio < DATE_SUB(NOW(), INTERVAL 1 DAY) 
            OR atc_data_hora_inicio > NOW()
            OR atc_data_hora_inicio IS NULL
          )
        `;
        
        const result = await executeQuery(query);
        console.log(`🧹 Limpados ${(result as ResultSetHeader).affectedRows} registros órfãos`);
      }
    } catch (error) {
      console.error('Erro ao limpar registros órfãos:', error);
    }
  }

  // VERIFICAÇÃO RIGOROSA OTIMIZADA
  static async podeIniciarAtendimento(chamadoId: number, colaboradorId: number): Promise<{ pode: boolean; motivo?: string }> {
    try {
      // Verificar cache primeiro
      const cacheKey = `${chamadoId}-${colaboradorId}`;
      const cached = this.verificacaoCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
        return { pode: cached.resultado };
      }

      console.log(`🔍 Verificando atendimento: Chamado ${chamadoId}, Colaborador ${colaboradorId}`);
      
      // Query única otimizada para todas as verificações
      const verificacaoQuery = `
        SELECT 
          c.cha_id,
          c.cha_status,
          c.cha_descricao,
          
          -- Verificar se colaborador já está atendendo algo
          (SELECT COUNT(*) FROM atendimentos_chamados ac1 
           WHERE ac1.atc_colaborador = ? AND ac1.atc_data_hora_termino IS NULL) as colaborador_ocupado,
          
          -- Verificar se chamado já está sendo atendido
          (SELECT COUNT(*) FROM atendimentos_chamados ac2 
           WHERE ac2.atc_chamado = ? AND ac2.atc_data_hora_termino IS NULL) as chamado_ocupado,
           
          -- Nome do colaborador atual (se houver)
          (SELECT col.col_nome FROM atendimentos_chamados ac3 
           LEFT JOIN colaboradores col ON ac3.atc_colaborador = col.col_id
           WHERE ac3.atc_chamado = ? AND ac3.atc_data_hora_termino IS NULL 
           LIMIT 1) as colaborador_atual
           
        FROM chamados c 
        WHERE c.cha_id = ?
      `;
      
      const result = await executeQuery(verificacaoQuery, [colaboradorId, chamadoId, chamadoId, chamadoId]);
      
      if (!Array.isArray(result) || result.length === 0) {
        return { pode: false, motivo: 'Chamado não encontrado' };
      }
      
      const dados = result[0];
      
      if (dados.cha_status !== 1) {
        return { pode: false, motivo: 'Chamado não está aberto' };
      }

      if (dados.colaborador_ocupado > 0) {
        return { pode: false, motivo: 'Você já está atendendo outro chamado' };
      }

      if (dados.chamado_ocupado > 0) {
        return { 
          pode: false, 
          motivo: `Chamado já está sendo atendido por ${dados.colaborador_atual || 'outro usuário'}` 
        };
      }

      // Cache o resultado
      this.verificacaoCache.set(cacheKey, { resultado: true, timestamp: Date.now() });
      this.limparCache(); // Limpar cache antigo

      return { pode: true };
      
    } catch (error) {
      console.error('Erro ao verificar atendimento:', error);
      return { pode: false, motivo: 'Erro interno na verificação' };
    }
  }

  // Iniciar atendimento COM TRANSAÇÃO OTIMIZADA
  static async iniciar(chamadoId: number, colaboradorId: number): Promise<boolean> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      console.log(`🚀 Iniciando transação: Chamado ${chamadoId} por colaborador ${colaboradorId}`);
      
      // Limpar cache para esta combinação
     const cacheKey = `${chamadoId}-${colaboradorId}`;
     this.verificacaoCache.delete(cacheKey);
     
     // 1. VERIFICAÇÃO FINAL na transação
     const verificacao = await this.podeIniciarAtendimento(chamadoId, colaboradorId);
     if (!verificacao.pode) {
       await connection.rollback();
       throw new Error(verificacao.motivo);
     }

     // 2. INSERIR novo atendimento
     const insertQuery = `
       INSERT INTO atendimentos_chamados (
         atc_chamado, atc_colaborador, atc_data_hora_inicio
       ) VALUES (?, ?, NOW())
     `;
     await connection.execute(insertQuery, [chamadoId, colaboradorId]);
     
     // 3. Atualizar status do chamado
     const updateQuery = `
       UPDATE chamados 
       SET cha_status = 2, cha_data_hora_atendimento = NOW() 
       WHERE cha_id = ? AND cha_status = 1
     `;
     const updateResult = await connection.execute(updateQuery, [chamadoId]);
     
     if ((updateResult[0] as ResultSetHeader).affectedRows === 0) {
       await connection.rollback();
       throw new Error('Chamado não pôde ser atualizado (foi modificado por outro usuário)');
     }

     await connection.commit();
     console.log(`✅ Atendimento iniciado com sucesso: Chamado ${chamadoId}`);
     return true;
     
   } catch (error) {
     await connection.rollback();
     console.error('Erro ao iniciar atendimento:', error);
     throw error;
   } finally {
     connection.release();
   }
 }

 // Buscar atendimento ativo OTIMIZADO
 static async buscarPorColaborador(colaboradorId: number): Promise<AtendimentoAtivo | null> {
   try {
     const query = `
       SELECT 
         ac.atc_id,
         ac.atc_chamado,
         ac.atc_colaborador,
         ac.atc_data_hora_inicio,
         ac.atc_data_hora_termino,
         c.col_nome as colaborador_nome,
         ch.cha_descricao as chamado_descricao,
         ch.cha_DT,
         cl.cli_nome as cliente_nome,
         tc.tch_descricao as tipo_chamado,
         GREATEST(0, TIMESTAMPDIFF(SECOND, ac.atc_data_hora_inicio, NOW())) as tempo_decorrido
       FROM atendimentos_chamados ac
       LEFT JOIN colaboradores c ON ac.atc_colaborador = c.col_id
       LEFT JOIN chamados ch ON ac.atc_chamado = ch.cha_id
       LEFT JOIN clientes cl ON ch.cha_cliente = cl.cli_id
       LEFT JOIN tipos_chamado tc ON ch.cha_tipo = tc.tch_id
       WHERE ac.atc_colaborador = ? 
       AND ac.atc_data_hora_termino IS NULL
       ORDER BY ac.atc_data_hora_inicio DESC
       LIMIT 1
     `;

     const results = await executeQuery(query, [colaboradorId]);
     return Array.isArray(results) && results.length > 0 ? results[0] : null;
   } catch (error) {
     console.error('Erro ao buscar atendimento por colaborador:', error);
     throw error;
   }
 }

 // Buscar atendimento ativo OTIMIZADO
static async buscarPorChamado(chamadoId: number): Promise<AtendimentoAtivo | null> {
  try {
    const query = `
      SELECT 
        ac.atc_id,
        ac.atc_chamado,
        ac.atc_colaborador,
        ac.atc_data_hora_inicio,
        ac.atc_data_hora_termino,
        c.col_nome as colaborador_nome,
        GREATEST(0, TIMESTAMPDIFF(SECOND, ac.atc_data_hora_inicio, NOW())) as tempo_decorrido
      FROM atendimentos_chamados ac
      LEFT JOIN colaboradores c ON ac.atc_colaborador = c.col_id
      WHERE ac.atc_chamado = ? 
      AND ac.atc_data_hora_termino IS NULL
      ORDER BY ac.atc_data_hora_inicio DESC
      LIMIT 1
    `;

    const results = await executeQuery(query, [chamadoId]);
    return Array.isArray(results) && results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Erro ao buscar atendimento por chamado:', error);
    throw error;
  }
}

// Listar TODOS atendimentos ativos OTIMIZADO
static async listarAtivos(): Promise<AtendimentoAtivo[]> {
  try {
    const query = `
      SELECT 
        ac.atc_id,
        ac.atc_chamado,
        ac.atc_colaborador,
        ac.atc_data_hora_inicio,
        ac.atc_data_hora_termino,
        c.col_nome as colaborador_nome,
        ch.cha_descricao as chamado_descricao,
        ch.cha_DT,
        cl.cli_nome as cliente_nome,
        tc.tch_descricao as tipo_chamado,
        GREATEST(0, TIMESTAMPDIFF(SECOND, ac.atc_data_hora_inicio, NOW())) as tempo_decorrido
      FROM atendimentos_chamados ac
      LEFT JOIN colaboradores c ON ac.atc_colaborador = c.col_id
      LEFT JOIN chamados ch ON ac.atc_chamado = ch.cha_id
      LEFT JOIN clientes cl ON ch.cha_cliente = cl.cli_id
      LEFT JOIN tipos_chamado tc ON ch.cha_tipo = tc.tch_id
      WHERE ac.atc_data_hora_termino IS NULL
      AND ac.atc_data_hora_inicio <= NOW() -- Evitar datas futuras
      ORDER BY ac.atc_data_hora_inicio ASC
    `;

    const results = await executeQuery(query);
    const atendimentos = Array.isArray(results) ? results : [];
    
    console.log(`📋 Atendimentos ativos encontrados: ${atendimentos.length}`);
    return atendimentos;
  } catch (error) {
    console.error('Erro ao listar atendimentos ativos:', error);
    throw error;
  }
}

// Cancelar atendimento OTIMIZADO
static async cancelar(chamadoId: number): Promise<boolean> {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    console.log(`🚫 Cancelando atendimento do chamado ${chamadoId}`);
    
    // 1. Buscar atendimento ativo específico
    const atendimentoAtivo = await this.buscarPorChamado(chamadoId);
    if (!atendimentoAtivo) {
      await connection.rollback();
      console.log(`⚠️ Nenhum atendimento ativo encontrado para chamado ${chamadoId}`);
      return false;
    }

    // 2. DELETAR atendimento específico por ID
    const deleteQuery = `
      DELETE FROM atendimentos_chamados 
      WHERE atc_id = ?
    `;

    // 3. Voltar chamado para status aberto
    const updateQuery = `
      UPDATE chamados 
      SET cha_status = 1, 
          cha_data_hora_atendimento = NULL,
          cha_visualizado = 0
      WHERE cha_id = ?
    `;

    await connection.execute(deleteQuery, [atendimentoAtivo.atc_id]);
    await connection.execute(updateQuery, [chamadoId]);

    // Limpar cache
    this.verificacaoCache.clear();

    await connection.commit();
    console.log(`✅ Atendimento cancelado com sucesso`);
    return true;
    
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao cancelar atendimento:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Resto dos métodos mantidos iguais...
static async finalizarComDetrator(
  chamadoId: number, 
  detratorId: number,
  descricaoAtendimento: string
): Promise<boolean> {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    console.log(`🏁 Finalizando chamado: ${chamadoId}, Detrator: ${detratorId}`);
    
    if (!descricaoAtendimento || descricaoAtendimento.trim().length === 0) {
      throw new Error('Descrição do atendimento é obrigatória');
    }
    
    if (descricaoAtendimento.trim().length > 250) {
      throw new Error('Descrição do atendimento deve ter no máximo 250 caracteres');
    }

    const atendimentoAtivo = await this.buscarPorChamado(chamadoId);
    if (!atendimentoAtivo) {
      await connection.rollback();
      throw new Error('Nenhum atendimento ativo encontrado para este chamado');
    }

    const finalizarQuery = `
      UPDATE atendimentos_chamados 
      SET atc_data_hora_termino = NOW()
      WHERE atc_chamado = ? AND atc_data_hora_termino IS NULL
    `;
    await connection.execute(finalizarQuery, [chamadoId]);

    const insertAcaoQuery = `
      INSERT INTO acoes_chamados (ach_descricao, ach_detrator) 
      VALUES (?, ?)
    `;
    const acaoResult = await connection.execute(insertAcaoQuery, [descricaoAtendimento.trim().toUpperCase(), detratorId]);

    const updateChamadoQuery = `
      UPDATE chamados 
      SET cha_status = 3, 
          cha_data_hora_termino = NOW(), 
          cha_acao = ?
      WHERE cha_id = ?
    `;
    await connection.execute(updateChamadoQuery, [(acaoResult[0] as ResultSetHeader).insertId, chamadoId]);

    // Limpar cache
    this.verificacaoCache.clear();

    await connection.commit();
    console.log(`✅ Chamado ${chamadoId} finalizado com sucesso`);
    return true;
    
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao finalizar atendimento:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Transferir chamado OTIMIZADO
static async transferirChamado(
  chamadoId: number, 
  usuarioAnterior: number, 
  novoUsuario: number
): Promise<boolean> {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    console.log(`🔄 Transferindo chamado ${chamadoId}: ${usuarioAnterior} → ${novoUsuario}`);
    
    // Verificações em uma única query
    const verificacaoQuery = `
      SELECT 
        (SELECT COUNT(*) FROM atendimentos_chamados 
         WHERE atc_chamado = ? AND atc_colaborador = ? AND atc_data_hora_termino IS NULL) as atendimento_atual,
        (SELECT COUNT(*) FROM atendimentos_chamados 
         WHERE atc_colaborador = ? AND atc_data_hora_termino IS NULL) as novo_usuario_ocupado
    `;
    
    const verificacao = await connection.execute(verificacaoQuery, [chamadoId, usuarioAnterior, novoUsuario]);
    const dados = (verificacao[0] as any[])[0];
    
    if (dados.atendimento_atual === 0) {
      await connection.rollback();
      throw new Error('Chamado não está sendo atendido pelo usuário especificado');
    }

    if (dados.novo_usuario_ocupado > 0) {
      await connection.rollback();
      throw new Error('O usuário de destino já está atendendo outro chamado');
    }

    // Finalizar atendimento atual
    const finalizarQuery = `
      UPDATE atendimentos_chamados 
      SET atc_data_hora_termino = NOW()
      WHERE atc_chamado = ? AND atc_colaborador = ? AND atc_data_hora_termino IS NULL
    `;
    await connection.execute(finalizarQuery, [chamadoId, usuarioAnterior]);

    // Criar novo atendimento
    const novoAtendimentoQuery = `
      INSERT INTO atendimentos_chamados (atc_chamado, atc_colaborador, atc_data_hora_inicio) 
      VALUES (?, ?, NOW())
    `;
    await connection.execute(novoAtendimentoQuery, [chamadoId, novoUsuario]);

    // Limpar cache
    this.verificacaoCache.clear();

    await connection.commit();
    console.log(`✅ Chamado ${chamadoId} transferido com sucesso`);
    return true;
    
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao transferir chamado:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Buscar usuários disponíveis OTIMIZADO
static async buscarUsuariosDisponiveis(): Promise<any[]> {
 try {
   console.log('🔍 Modelo: Buscando usuários disponíveis...');
   
   // Query simplificada sem col_ultimo_acesso (que não existe na tabela)
   const query = `
     SELECT 
       col.col_id,
       col.col_nome,
       col.col_categoria,
       cac.cac_descricao as categoria_nome,
       col.col_login,
       col.col_ativo
     FROM colaboradores col
     LEFT JOIN categorias_colaboradores cac ON col.col_categoria = cac.cac_id
     WHERE col.col_ativo = 1
     AND col.col_id NOT IN (
       SELECT DISTINCT atc_colaborador 
       FROM atendimentos_chamados 
       WHERE atc_data_hora_termino IS NULL
       AND atc_data_hora_inicio <= NOW()
     )
     ORDER BY col.col_nome ASC
   `;

   const usuarios = await executeQuery(query, []);
   const usuariosArray = Array.isArray(usuarios) ? usuarios : [];
   
   console.log(`✅ Modelo: ${usuariosArray.length} usuários disponíveis encontrados:`, 
     usuariosArray.map(u => ({ 
       id: u.col_id, 
       nome: u.col_nome, 
       categoria: u.categoria_nome
     }))
   );
   
   return usuariosArray;
 } catch (error) {
   console.error('❌ Modelo: Erro ao buscar usuários disponíveis:', error);
   throw new Error('Falha ao buscar usuários disponíveis no banco de dados');
 }
}
}

