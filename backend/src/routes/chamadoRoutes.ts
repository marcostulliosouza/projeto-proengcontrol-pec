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
  getAcoes
} from '../controllers/chamadoController';
import { AtendimentoAtivoModel } from '../models/AtendimentoAtivo';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// GET /api/v1/chamados - Listar chamados
router.get('/', getChamados);

// GET /api/v1/chamados/tipos - Obter tipos de chamado
router.get('/tipos', getTipos);

// GET /api/v1/chamados/status - Obter status de chamado
router.get('/status', getStatusChamado);

// GET /api/v1/chamados/acoes - Obter ações
router.get('/acoes', getAcoes);

// GET /api/v1/chamados/atendimentos-ativos - MOVER PARA CIMA
router.get('/atendimentos-ativos', async (req, res) => {
  try {
    const atendimentos = await AtendimentoAtivoModel.listarAtivos();
    res.json({
      success: true,
      data: atendimentos,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar atendimentos ativos',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/chamados/produtos/:clienteId - Obter produtos por cliente
router.get('/produtos/:clienteId', getProdutosByCliente);

// GET /api/v1/chamados/:id - Obter chamado específico
router.get('/:id', getChamado);

// POST /api/v1/chamados - Criar chamado
router.post('/', createChamado);

// PUT /api/v1/chamados/:id - Atualizar chamado
router.put('/:id', updateChamado);

// PUT /api/v1/chamados/:id/iniciar - Iniciar atendimento
router.put('/:id/iniciar', iniciarAtendimento);

// PUT /api/v1/chamados/:id/cancelar - Cancelar atendimento
router.put('/:id/cancelar', cancelarAtendimento);

// PUT /api/v1/chamados/:id/finalizar - Finalizar chamado
router.put('/:id/finalizar', requireRole([2, 3, 4, 5]), finalizarChamado); // Engenheiro+

export default router;