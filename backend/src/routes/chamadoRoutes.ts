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
  getUsuariosOnline,
  getLocais,
  transferirChamado
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

router.get('/detratores/:tipoId', getDetratoresByTipo);
router.get('/acoes/detrator/:detratorId', getAcoesByDetrator);
router.get('/relatorio/detratores', getRelatorioDetratores);

// router.get('/:id/historico', getHistoricoAtendimentos);

// ⚠️ AUTENTICAÇÃO OBRIGATÓRIA A PARTIR DAQUI
router.use(authenticateToken);

// Resto das rotas protegidas...
router.get('/', getChamados);
router.get('/tipos', getTipos);
router.get('/status', getStatusChamado);
router.get('/acoes', getAcoes);
router.get('/locais', getLocais)
router.get('/produtos/:clienteId', getProdutosByCliente);
router.get('/usuarios-online', getUsuariosOnline);
router.get('/:id', getChamado);
router.post('/', createChamado);
router.put('/:id', updateChamado);
router.put('/:id/iniciar', iniciarAtendimento);
router.put('/:id/cancelar', cancelarAtendimento);
router.put('/:id/finalizar', finalizarChamado);
router.put('/:id/transferir', transferirChamado);

export default router;