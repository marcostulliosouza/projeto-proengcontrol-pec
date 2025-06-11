"use strict";
exports.__esModule = true;
var express_1 = require("express");
var orcamentoController_1 = require("../controllers/orcamentoController");
var auth_1 = require("../middlewares/auth");
var router = express_1.Router();
// Todas as rotas requerem autenticação
router.use(auth_1.authenticateToken);
// ===== ROTAS PÚBLICAS (todos os usuários autenticados) =====
// GET /api/v1/orcamentos - Listar orçamentos
router.get('/', orcamentoController_1.getOrcamentos);
// GET /api/v1/orcamentos/dashboard - Dashboard de orçamento
router.get('/dashboard', orcamentoController_1.getDashboardOrcamento);
// GET /api/v1/orcamentos/resumo - Resumo geral
router.get('/resumo', orcamentoController_1.getResumoGeral);
// GET /api/v1/orcamentos/alertas - Alertas de orçamento
router.get('/alertas', orcamentoController_1.getAlertasOrcamento);
// GET /api/v1/orcamentos/centros-custo - Obter centros de custo
router.get('/centros-custo', orcamentoController_1.getCentrosCusto);
// GET /api/v1/orcamentos/anos - Obter anos de orçamento
router.get('/anos', orcamentoController_1.getAnosOrcamento);
// GET /api/v1/orcamentos/verificar-disponibilidade - Verificar disponibilidade
router.get('/verificar-disponibilidade', orcamentoController_1.verificarDisponibilidade);
// GET /api/v1/orcamentos/:id - Obter orçamento específico
router.get('/:id', orcamentoController_1.getOrcamento);
// ===== ROTAS RESTRITAS =====
// POST /api/v1/orcamentos - Criar orçamento (Supervisor+)
router.post('/', auth_1.requireRole([3, 4, 5]), orcamentoController_1.createOrcamento);
// PUT /api/v1/orcamentos/:id - Atualizar orçamento (Supervisor+)
router.put('/:id', auth_1.requireRole([3, 4, 5]), orcamentoController_1.updateOrcamento);
// DELETE /api/v1/orcamentos/:id - Deletar orçamento (Admin/Gerente)
router["delete"]('/:id', auth_1.requireRole([4, 5]), orcamentoController_1.deleteOrcamento);
exports["default"] = router;
