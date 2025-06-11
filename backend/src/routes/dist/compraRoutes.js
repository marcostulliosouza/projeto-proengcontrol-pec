"use strict";
exports.__esModule = true;
var express_1 = require("express");
var compraController_1 = require("../controllers/compraController");
var auth_1 = require("../middlewares/auth");
var router = express_1.Router();
// Todas as rotas requerem autenticação
router.use(auth_1.authenticateToken);
// ===== ROTAS DE COMPRAS =====
// GET /api/v1/compras - Listar compras
router.get('/', compraController_1.getCompras);
// GET /api/v1/compras/categorias-verba - Obter categorias de verba
router.get('/categorias-verba', compraController_1.getCategoriasVerba);
// GET /api/v1/compras/relatorio - Relatório de compras
router.get('/relatorio', compraController_1.getRelatorioCompras);
// GET /api/v1/compras/:id - Obter compra específica
router.get('/:id', compraController_1.getCompra);
// POST /api/v1/compras - Criar compra (Engenheiro+)
router.post('/', auth_1.requireRole([2, 3, 4, 5]), compraController_1.createCompra);
// PUT /api/v1/compras/:id - Atualizar compra (Engenheiro+)
router.put('/:id', auth_1.requireRole([2, 3, 4, 5]), compraController_1.updateCompra);
// PUT /api/v1/compras/:id/aprovar - Aprovar compra (Supervisor+)
router.put('/:id/aprovar', auth_1.requireRole([3, 4, 5]), compraController_1.aprovarCompra);
// PUT /api/v1/compras/:id/receber - Receber compra (Técnico+)
router.put('/:id/receber', auth_1.requireRole([1, 2, 3, 4, 5]), compraController_1.receberCompra);
// PUT /api/v1/compras/:id/cancelar - Cancelar compra (Supervisor+)
router.put('/:id/cancelar', auth_1.requireRole([3, 4, 5]), compraController_1.cancelarCompra);
// ===== ROTAS DE SOLICITAÇÕES =====
// GET /api/v1/compras/solicitacoes - Listar solicitações de compra
router.get('/solicitacoes', compraController_1.getSolicitacoes);
// POST /api/v1/compras/solicitacoes - Criar solicitação (Todos)
router.post('/solicitacoes', compraController_1.createSolicitacao);
// PUT /api/v1/compras/solicitacoes/:id/processar - Aprovar/Rejeitar solicitação (Supervisor+)
router.put('/solicitacoes/:id/processar', auth_1.requireRole([3, 4, 5]), compraController_1.processarSolicitacao);
// ===== ROTAS DE FORNECEDORES =====
// GET /api/v1/compras/fornecedores - Listar fornecedores
router.get('/fornecedores', compraController_1.getFornecedores);
// POST /api/v1/compras/fornecedores - Criar fornecedor (Engenheiro+)
router.post('/fornecedores', auth_1.requireRole([2, 3, 4, 5]), compraController_1.createFornecedor);
// PUT /api/v1/compras/fornecedores/:id - Atualizar fornecedor (Engenheiro+)
router.put('/fornecedores/:id', auth_1.requireRole([2, 3, 4, 5]), compraController_1.updateFornecedor);
// DELETE /api/v1/compras/fornecedores/:id - Desativar fornecedor (Supervisor+)
router["delete"]('/fornecedores/:id', auth_1.requireRole([3, 4, 5]), compraController_1.desativarFornecedor);
exports["default"] = router;
