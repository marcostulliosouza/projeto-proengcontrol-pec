import { Router } from 'express';
import {
  getOrcamentos,
  getOrcamento,
  createOrcamento,
  updateOrcamento,
  deleteOrcamento,
  verificarDisponibilidade,
  getResumoGeral,
  getAlertasOrcamento,
  getCentrosCusto,
  getAnosOrcamento,
  getDashboardOrcamento
} from '../controllers/orcamentoController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// ===== ROTAS PÚBLICAS (todos os usuários autenticados) =====

// GET /api/v1/orcamentos - Listar orçamentos
router.get('/', getOrcamentos);

// GET /api/v1/orcamentos/dashboard - Dashboard de orçamento
router.get('/dashboard', getDashboardOrcamento);

// GET /api/v1/orcamentos/resumo - Resumo geral
router.get('/resumo', getResumoGeral);

// GET /api/v1/orcamentos/alertas - Alertas de orçamento
router.get('/alertas', getAlertasOrcamento);

// GET /api/v1/orcamentos/centros-custo - Obter centros de custo
router.get('/centros-custo', getCentrosCusto);

// GET /api/v1/orcamentos/anos - Obter anos de orçamento
router.get('/anos', getAnosOrcamento);

// GET /api/v1/orcamentos/verificar-disponibilidade - Verificar disponibilidade
router.get('/verificar-disponibilidade', verificarDisponibilidade);

// GET /api/v1/orcamentos/:id - Obter orçamento específico
router.get('/:id', getOrcamento);

// ===== ROTAS RESTRITAS =====

// POST /api/v1/orcamentos - Criar orçamento (Supervisor+)
router.post('/', requireRole([3, 4, 5]), createOrcamento);

// PUT /api/v1/orcamentos/:id - Atualizar orçamento (Supervisor+)
router.put('/:id', requireRole([3, 4, 5]), updateOrcamento);

// DELETE /api/v1/orcamentos/:id - Deletar orçamento (Admin/Gerente)
router.delete('/:id', requireRole([4, 5]), deleteOrcamento);

export default router;