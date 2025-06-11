import { Router } from 'express';
import {
  // Compras
  getCompras,
  getCompra,
  createCompra,
  updateCompra,
  aprovarCompra,
  receberCompra,
  cancelarCompra,
  getCategoriasVerba,
  getRelatorioCompras,
  // Solicitações
  getSolicitacoes,
  createSolicitacao,
  processarSolicitacao,
  // Fornecedores
  getFornecedores,
  createFornecedor,
  updateFornecedor,
  desativarFornecedor
} from '../controllers/compraController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// ===== ROTAS DE COMPRAS =====

// GET /api/v1/compras - Listar compras
router.get('/', getCompras);

// GET /api/v1/compras/categorias-verba - Obter categorias de verba
router.get('/categorias-verba', getCategoriasVerba);

// GET /api/v1/compras/relatorio - Relatório de compras
router.get('/relatorio', getRelatorioCompras);

// GET /api/v1/compras/:id - Obter compra específica
router.get('/:id', getCompra);

// POST /api/v1/compras - Criar compra (Engenheiro+)
router.post('/', requireRole([2, 3, 4, 5]), createCompra);

// PUT /api/v1/compras/:id - Atualizar compra (Engenheiro+)
router.put('/:id', requireRole([2, 3, 4, 5]), updateCompra);

// PUT /api/v1/compras/:id/aprovar - Aprovar compra (Supervisor+)
router.put('/:id/aprovar', requireRole([3, 4, 5]), aprovarCompra);

// PUT /api/v1/compras/:id/receber - Receber compra (Técnico+)
router.put('/:id/receber', requireRole([1, 2, 3, 4, 5]), receberCompra);

// PUT /api/v1/compras/:id/cancelar - Cancelar compra (Supervisor+)
router.put('/:id/cancelar', requireRole([3, 4, 5]), cancelarCompra);

// ===== ROTAS DE SOLICITAÇÕES =====

// GET /api/v1/compras/solicitacoes - Listar solicitações de compra
router.get('/solicitacoes', getSolicitacoes);

// POST /api/v1/compras/solicitacoes - Criar solicitação (Todos)
router.post('/solicitacoes', createSolicitacao);

// PUT /api/v1/compras/solicitacoes/:id/processar - Aprovar/Rejeitar solicitação (Supervisor+)
router.put('/solicitacoes/:id/processar', requireRole([3, 4, 5]), processarSolicitacao);

// ===== ROTAS DE FORNECEDORES =====

// GET /api/v1/compras/fornecedores - Listar fornecedores
router.get('/fornecedores', getFornecedores);

// POST /api/v1/compras/fornecedores - Criar fornecedor (Engenheiro+)
router.post('/fornecedores', requireRole([2, 3, 4, 5]), createFornecedor);

// PUT /api/v1/compras/fornecedores/:id - Atualizar fornecedor (Engenheiro+)
router.put('/fornecedores/:id', requireRole([2, 3, 4, 5]), updateFornecedor);

// DELETE /api/v1/compras/fornecedores/:id - Desativar fornecedor (Supervisor+)
router.delete('/fornecedores/:id', requireRole([3, 4, 5]), desativarFornecedor);

export default router;