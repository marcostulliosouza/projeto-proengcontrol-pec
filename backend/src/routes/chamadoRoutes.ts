import { Router } from 'express';
import {
  getChamados,
  getChamado,
  createChamado,
  updateChamado,
  iniciarAtendimento,
  finalizarChamado,
  cancelarAtendimento,
  getTipos,
  getStatusChamado,
  getProdutosByCliente,
  getAcoes,
  getDetratoresByTipo,
  getAcoesByDetrator,
  getRelatorioDetratores,
  transferirChamado,
  getUsuariosDisponiveis
} from '../controllers/chamadoController';
import { AtendimentoAtivoModel } from '../models/AtendimentoAtivo';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { executeQuery } from '../config/database';

const router = Router();

// ⚠️ ROTA PÚBLICA - Deve ficar ANTES do authenticateToken
router.get('/atendimentos-ativos', async (req, res) => {
  try {
    console.log('📡 Buscando atendimentos ativos...');
    const atendimentos = await AtendimentoAtivoModel.listarAtivos();
    console.log(`📡 Encontrados ${atendimentos.length} atendimentos ativos`);
    
    res.json({
      success: true,
      data: atendimentos,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao buscar atendimentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar atendimentos ativos',
      timestamp: new Date().toISOString()
    });
  }
});

// ROTA PÚBLICA para usuários disponíveis - MOVIDA PARA ANTES DA AUTENTICAÇÃO
router.get('/usuarios-disponiveis', async (req, res) => {
  try {
    console.log('👥 Buscando usuários disponíveis...');
    const usuarios = await AtendimentoAtivoModel.buscarUsuariosDisponiveis();
    console.log(`👥 Encontrados ${usuarios.length} usuários disponíveis`);
    
    res.json({
      success: true,
      data: usuarios,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao buscar usuários disponíveis:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar usuários disponíveis',
      timestamp: new Date().toISOString()
    });
  }
});

// ROTA para limpar atendimentos órfãos (TEMPORÁRIA)
router.get('/limpar-orfaos', async (req, res) => {
  try {
    const query = `
      UPDATE atendimentos_chamados 
      SET atc_data_hora_termino = NOW() 
      WHERE atc_data_hora_termino IS NULL 
      AND atc_data_hora_inicio < DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `;
    
    const result = await executeQuery(query);
    
    res.json({
      success: true,
      message: `${result.affectedRows} atendimentos órfãos limpos`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao limpar órfãos',
      timestamp: new Date().toISOString()
    });
  }
});

// ROTA para corrigir datas futuras
router.get('/corrigir-datas-futuras', async (req, res) => {
  try {
    console.log('🔧 Iniciando correção de datas futuras...');
    
    // 1. Buscar registros com datas futuras
    const buscarFuturasQuery = `
      SELECT atc_id, atc_chamado, atc_data_hora_inicio
      FROM atendimentos_chamados 
      WHERE atc_data_hora_termino IS NULL 
      AND atc_data_hora_inicio > NOW()
    `;
    
    const registrosFuturos = await executeQuery(buscarFuturasQuery);
    console.log(`📅 Encontrados ${registrosFuturos.length} registros com datas futuras`);
    
    if (registrosFuturos.length > 0) {
      // 2. Corrigir datas futuras para agora
      const corrigirQuery = `
        UPDATE atendimentos_chamados 
        SET atc_data_hora_inicio = NOW() 
        WHERE atc_data_hora_termino IS NULL 
        AND atc_data_hora_inicio > NOW()
      `;
      
      const resultado = await executeQuery(corrigirQuery);
      console.log(`✅ Corrigidos ${resultado.affectedRows} registros`);
      
      // 3. Atualizar também os chamados correspondentes
      const atualizarChamadosQuery = `
        UPDATE chamados 
        SET cha_data_hora_atendimento = NOW() 
        WHERE cha_id IN (
          SELECT DISTINCT atc_chamado 
          FROM atendimentos_chamados 
          WHERE atc_data_hora_termino IS NULL
        )
        AND cha_status = 2
      `;
      
      await executeQuery(atualizarChamadosQuery);
      
      res.json({
        success: true,
        message: `Corrigidos ${resultado.affectedRows} registros com datas futuras`,
        registrosCorrigidos: registrosFuturos,
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        success: true,
        message: 'Nenhum registro com data futura encontrado',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Erro ao corrigir datas futuras:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao corrigir datas futuras',
      timestamp: new Date().toISOString()
    });
  }
});

// ROTA para limpeza forçada de dados inconsistentes
router.get('/limpar-dados-inconsistentes', async (req, res) => {
  try {
    // Limpar registros com datas futuras ou muito antigas
    const query1 = `
      UPDATE atendimentos_chamados 
      SET atc_data_hora_termino = NOW() 
      WHERE atc_data_hora_termino IS NULL 
      AND (
        atc_data_hora_inicio < DATE_SUB(NOW(), INTERVAL 1 DAY) 
        OR atc_data_hora_inicio > NOW()
      )
    `;
    
    // Limpar chamados órfãos (status 2 sem atendimento ativo)
    const query2 = `
      UPDATE chamados 
      SET cha_status = 1, cha_data_hora_atendimento = NULL 
      WHERE cha_status = 2 
      AND cha_id NOT IN (
        SELECT DISTINCT atc_chamado 
        FROM atendimentos_chamados 
        WHERE atc_data_hora_termino IS NULL
      )
    `;
    
    const [result1, result2] = await Promise.all([
      executeQuery(query1),
      executeQuery(query2)
    ]);
    
    res.json({
      success: true,
      message: `Limpeza concluída: ${result1.affectedRows} atendimentos + ${result2.affectedRows} chamados corrigidos`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro na limpeza',
      timestamp: new Date().toISOString()
    });
  }
});

// ROTA CORRIGIDA PARA USUÁRIOS REALMENTE ONLINE
router.get('/usuarios-online-disponiveis', async (req, res) => {
  try {
    console.log('👥 Buscando usuários REALMENTE online e disponíveis...');
    
    const io = req.app.get('io');
    if (!io || !io.sockets) {
      console.log('⚠️ Socket.IO não disponível, retornando lista vazia');
      return res.json({
        success: true,
        data: [],
        message: 'Sistema de usuários online não disponível',
        timestamp: new Date().toISOString()
      });
    }
    
    // Coletar IDs de usuários realmente conectados
    const connectedUserIds = new Set<number>();
    
    // Iterar pelos sockets conectados
    for (const [socketId, socket] of io.sockets.sockets) {
      // Verificar se o socket tem dados de usuário
      const socketData = (socket as any).userData;
      if (socketData && socketData.id) {
        connectedUserIds.add(socketData.id);
        console.log(`👤 Usuário conectado: ${socketData.nome} (ID: ${socketData.id})`);
      }
    }
    
    console.log(`📊 Total de usuários conectados: ${connectedUserIds.size}`);
    
    if (connectedUserIds.size === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'Nenhum usuário online no momento',
        timestamp: new Date().toISOString()
      });
    }
    
    // Buscar dados dos usuários conectados que estão disponíveis
    const userIdsArray = Array.from(connectedUserIds);
    const placeholders = userIdsArray.map(() => '?').join(',');
    
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
      AND col.col_id IN (${placeholders})
      AND col.col_id NOT IN (
        SELECT DISTINCT atc_colaborador 
        FROM atendimentos_chamados 
        WHERE atc_data_hora_termino IS NULL
        AND atc_data_hora_inicio <= NOW()
      )
      ORDER BY col.col_nome ASC
    `;
    
    const usuariosOnlineDisponiveis = await executeQuery(query, userIdsArray);
    const usuariosArray = Array.isArray(usuariosOnlineDisponiveis) ? usuariosOnlineDisponiveis : [];
    
    console.log(`✅ Usuários online e disponíveis: ${usuariosArray.length}`);
    
    return res.json({
      success: true,
      data: usuariosArray.map(usuario => ({
        ...usuario,
        online: true,
        status: 'Disponível'
      })),
      total: usuariosArray.length,
      totalConnected: connectedUserIds.size,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar usuários online disponíveis:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao buscar usuários online',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/detratores/:tipoId', getDetratoresByTipo);
router.get('/acoes/detrator/:detratorId', getAcoesByDetrator);
router.get('/relatorio/detratores', getRelatorioDetratores);

// ⚠️ AUTENTICAÇÃO OBRIGATÓRIA A PARTIR DAQUI
router.use(authenticateToken);

// Resto das rotas protegidas...
router.get('/', getChamados);
router.get('/tipos', getTipos);
router.get('/status', getStatusChamado);
router.get('/acoes', getAcoes);
router.get('/produtos/:clienteId', getProdutosByCliente);
router.get('/:id', getChamado);
router.post('/', createChamado);
router.put('/:id', updateChamado);
router.put('/:id/iniciar', iniciarAtendimento);
router.put('/:id/cancelar', cancelarAtendimento);
router.put('/:id/finalizar', finalizarChamado);
router.put('/:id/transferir', transferirChamado);

export default router;