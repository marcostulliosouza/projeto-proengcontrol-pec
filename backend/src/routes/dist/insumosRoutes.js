"use strict";
exports.__esModule = true;
var express_1 = require("express");
var insumoController_1 = require("../controllers/insumoController");
var auth_1 = require("../middlewares/auth");
var router = express_1.Router();
// Todas as rotas requerem autenticação
router.use(auth_1.authenticateToken);
// ===== ROTAS PÚBLICAS (todos os usuários autenticados) =====
// GET /api/v1/insumos - Listar insumos
router.get('/', insumoController_1.getInsumos);
// GET /api/v1/insumos/categorias - Obter categorias
router.get('/categorias', insumoController_1.getCategorias);
// GET /api/v1/insumos/autocomplete - Busca para autocomplete
router.get('/autocomplete', insumoController_1.getInsumosAutocomplete);
// GET /api/v1/insumos/dashboard/estatisticas - Dashboard
router.get('/dashboard/estatisticas', insumoController_1.getEstatisticas);
// GET /api/v1/insumos/relatorios/estoque-baixo - Relatório de estoque baixo
router.get('/relatorios/estoque-baixo', insumoController_1.getEstoqueBaixo);
// GET /api/v1/insumos/movimentacoes - Histórico geral de movimentações
router.get('/movimentacoes', insumoController_1.getHistoricoMovimentacoes);
// GET /api/v1/insumos/:id - Obter insumo específico
router.get('/:id', insumoController_1.getInsumo);
// GET /api/v1/insumos/:id/movimentacoes - Histórico de movimentações do insumo
router.get('/:id/movimentacoes', insumoController_1.getHistoricoMovimentacoes);
// ===== ROTAS RESTRITAS =====
// POST /api/v1/insumos - Criar insumo (Técnico+)
router.post('/', auth_1.requireRole([1, 2, 3, 4, 5]), insumoController_1.createInsumo);
// PUT /api/v1/insumos/:id - Atualizar insumo (Técnico+)
router.put('/:id', auth_1.requireRole([1, 2, 3, 4, 5]), insumoController_1.updateInsumo);
// POST /api/v1/insumos/:id/movimentar - Movimentar estoque (Técnico+)
router.post('/:id/movimentar', auth_1.requireRole([1, 2, 3, 4, 5]), insumoController_1.movimentarEstoque);
// DELETE /api/v1/insumos/:id - Deletar insumo (Supervisor+)
router["delete"]('/:id', auth_1.requireRole([3, 4, 5]), insumoController_1.deleteInsumo);
exports["default"] = router;
