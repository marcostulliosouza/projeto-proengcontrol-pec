import { Router } from 'express';
import {
  getInsumos,
  getInsumo,
  createInsumo,
  updateInsumo,
  deleteInsumo,
  movimentarEstoque,
  getHistoricoMovimentacoes,
  getEstoqueBaixo,
  getCategorias,
  getEstatisticas,
  getInsumosAutocomplete
} from '../controllers/insumoController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// ===== ROTAS PÚBLICAS (todos os usuários autenticados) =====

// GET /api/v1/insumos - Listar insumos
router.get('/', getInsumos);

// GET /api/v1/insumos/categorias - Obter categorias
router.get('/categorias', getCategorias);

// GET /api/v1/insumos/autocomplete - Busca para autocomplete
router.get('/autocomplete', getInsumosAutocomplete);

// GET /api/v1/insumos/dashboard/estatisticas - Dashboard
router.get('/dashboard/estatisticas', getEstatisticas);

// GET /api/v1/insumos/relatorios/estoque-baixo - Relatório de estoque baixo
router.get('/relatorios/estoque-baixo', getEstoqueBaixo);

// GET /api/v1/insumos/movimentacoes - Histórico geral de movimentações
router.get('/movimentacoes', getHistoricoMovimentacoes);

// GET /api/v1/insumos/:id - Obter insumo específico
router.get('/:id', getInsumo);

// GET /api/v1/insumos/:id/movimentacoes - Histórico de movimentações do insumo
router.get('/:id/movimentacoes', getHistoricoMovimentacoes);

// ===== ROTAS RESTRITAS =====

// POST /api/v1/insumos - Criar insumo (Técnico+)
router.post('/', requireRole([1, 2, 3, 4, 5]), createInsumo);

// PUT /api/v1/insumos/:id - Atualizar insumo (Técnico+)
router.put('/:id', requireRole([1, 2, 3, 4, 5]), updateInsumo);

// POST /api/v1/insumos/:id/movimentar - Movimentar estoque (Técnico+)
router.post('/:id/movimentar', requireRole([1, 2, 3, 4, 5]), movimentarEstoque);

// DELETE /api/v1/insumos/:id - Deletar insumo (Supervisor+)
router.delete('/:id', requireRole([3, 4, 5]), deleteInsumo);

export default router;