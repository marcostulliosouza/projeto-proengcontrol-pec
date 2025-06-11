"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.getDashboardOrcamento = exports.getAnosOrcamento = exports.getCentrosCusto = exports.getAlertasOrcamento = exports.getResumoGeral = exports.verificarDisponibilidade = exports.deleteOrcamento = exports.updateOrcamento = exports.createOrcamento = exports.getOrcamento = exports.getOrcamentos = void 0;
var Orcamento_1 = require("../models/Orcamento");
var errorHandler_1 = require("../middlewares/errorHandler");
// Listar orçamentos
exports.getOrcamentos = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var filtros, orcamentos;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                filtros = {
                    ano: req.query.ano ? parseInt(req.query.ano) : undefined,
                    centroCusto: req.query.centroCusto,
                    categoria: req.query.categoria ? parseInt(req.query.categoria) : undefined
                };
                return [4 /*yield*/, Orcamento_1.OrcamentoModel.findAll(filtros)];
            case 1:
                orcamentos = _a.sent();
                res.json({
                    success: true,
                    message: 'Orçamentos obtidos com sucesso',
                    data: orcamentos,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Buscar orçamento por ID
exports.getOrcamento = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, orcamento;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = parseInt(req.params.id);
                if (isNaN(id)) {
                    res.status(400).json({
                        success: false,
                        message: 'ID inválido',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, Orcamento_1.OrcamentoModel.findById(id)];
            case 1:
                orcamento = _a.sent();
                if (!orcamento) {
                    res.status(404).json({
                        success: false,
                        message: 'Orçamento não encontrado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Orçamento obtido com sucesso',
                    data: orcamento,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Criar orçamento
exports.createOrcamento = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, cav_id, orc_centro_custo, orc_ano, orc_orcado, orcamentoData, orcamentoId, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, cav_id = _a.cav_id, orc_centro_custo = _a.orc_centro_custo, orc_ano = _a.orc_ano, orc_orcado = _a.orc_orcado;
                // Validações básicas
                if (!cav_id || !orc_centro_custo || !orc_ano || !orc_orcado) {
                    res.status(400).json({
                        success: false,
                        message: 'Categoria, centro de custo, ano e valor orçado são obrigatórios',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                if (orc_orcado <= 0) {
                    res.status(400).json({
                        success: false,
                        message: 'Valor orçado deve ser maior que zero',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                if (orc_ano < 2020 || orc_ano > 2050) {
                    res.status(400).json({
                        success: false,
                        message: 'Ano deve estar entre 2020 e 2050',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                orcamentoData = {
                    cav_id: cav_id,
                    orc_centro_custo: orc_centro_custo.trim().toUpperCase(),
                    orc_ano: parseInt(orc_ano),
                    orc_orcado: parseFloat(orc_orcado)
                };
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, Orcamento_1.OrcamentoModel.create(orcamentoData)];
            case 2:
                orcamentoId = _b.sent();
                res.status(201).json({
                    success: true,
                    message: 'Orçamento criado com sucesso',
                    data: { id: orcamentoId },
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 3:
                error_1 = _b.sent();
                res.status(400).json({
                    success: false,
                    message: error_1 instanceof Error ? error_1.message : 'Erro ao criar orçamento',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Atualizar orçamento
exports.updateOrcamento = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, cav_id, orc_centro_custo, orc_ano, orc_orcado, orcamentoData, updated;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = parseInt(req.params.id);
                if (isNaN(id)) {
                    res.status(400).json({
                        success: false,
                        message: 'ID inválido',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                _a = req.body, cav_id = _a.cav_id, orc_centro_custo = _a.orc_centro_custo, orc_ano = _a.orc_ano, orc_orcado = _a.orc_orcado;
                if (!cav_id || !orc_centro_custo || !orc_ano || !orc_orcado) {
                    res.status(400).json({
                        success: false,
                        message: 'Todos os campos são obrigatórios',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                if (orc_orcado <= 0) {
                    res.status(400).json({
                        success: false,
                        message: 'Valor orçado deve ser maior que zero',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                orcamentoData = {
                    cav_id: cav_id,
                    orc_centro_custo: orc_centro_custo.trim().toUpperCase(),
                    orc_ano: parseInt(orc_ano),
                    orc_orcado: parseFloat(orc_orcado)
                };
                return [4 /*yield*/, Orcamento_1.OrcamentoModel.update(id, orcamentoData)];
            case 1:
                updated = _b.sent();
                if (!updated) {
                    res.status(404).json({
                        success: false,
                        message: 'Orçamento não encontrado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Orçamento atualizado com sucesso',
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Deletar orçamento
exports.deleteOrcamento = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, deleted, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = parseInt(req.params.id);
                if (isNaN(id)) {
                    res.status(400).json({
                        success: false,
                        message: 'ID inválido',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, Orcamento_1.OrcamentoModel["delete"](id)];
            case 2:
                deleted = _a.sent();
                if (!deleted) {
                    res.status(404).json({
                        success: false,
                        message: 'Orçamento não encontrado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Orçamento removido com sucesso',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _a.sent();
                res.status(400).json({
                    success: false,
                    message: error_2 instanceof Error ? error_2.message : 'Erro ao deletar orçamento',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Verificar disponibilidade orçamentária
exports.verificarDisponibilidade = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, categoriaId, centroCusto, ano, valor, disponibilidade;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, categoriaId = _a.categoriaId, centroCusto = _a.centroCusto, ano = _a.ano, valor = _a.valor;
                if (!categoriaId || !centroCusto || !ano || !valor) {
                    res.status(400).json({
                        success: false,
                        message: 'Categoria, centro de custo, ano e valor são obrigatórios',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, Orcamento_1.OrcamentoModel.verificarDisponibilidade(parseInt(categoriaId), centroCusto, parseInt(ano), parseFloat(valor))];
            case 1:
                disponibilidade = _b.sent();
                res.json({
                    success: true,
                    message: 'Disponibilidade verificada com sucesso',
                    data: disponibilidade,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Resumo geral do orçamento
exports.getResumoGeral = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var ano, resumo;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                ano = req.query.ano ? parseInt(req.query.ano) : undefined;
                return [4 /*yield*/, Orcamento_1.OrcamentoModel.getResumoGeral(ano)];
            case 1:
                resumo = _a.sent();
                res.json({
                    success: true,
                    message: 'Resumo geral obtido com sucesso',
                    data: resumo,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Alertas de orçamento
exports.getAlertasOrcamento = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var limite, alertas;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                limite = req.query.limite ? parseInt(req.query.limite) : 80;
                return [4 /*yield*/, Orcamento_1.OrcamentoModel.getAlertasOrcamento(limite)];
            case 1:
                alertas = _a.sent();
                res.json({
                    success: true,
                    message: 'Alertas de orçamento obtidos com sucesso',
                    data: alertas,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Obter centros de custo
exports.getCentrosCusto = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var centros;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Orcamento_1.OrcamentoModel.getCentrosCusto()];
            case 1:
                centros = _a.sent();
                res.json({
                    success: true,
                    message: 'Centros de custo obtidos com sucesso',
                    data: centros,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Obter anos de orçamento
exports.getAnosOrcamento = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var anos;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Orcamento_1.OrcamentoModel.getAnosOrcamento()];
            case 1:
                anos = _a.sent();
                res.json({
                    success: true,
                    message: 'Anos de orçamento obtidos com sucesso',
                    data: anos,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Dashboard de orçamento
exports.getDashboardOrcamento = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var anoAtual, _a, resumoGeral, alertas, dashboard, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                anoAtual = new Date().getFullYear();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, Promise.all([
                        Orcamento_1.OrcamentoModel.getResumoGeral(anoAtual),
                        Orcamento_1.OrcamentoModel.getAlertasOrcamento(80)
                    ])];
            case 2:
                _a = _b.sent(), resumoGeral = _a[0], alertas = _a[1];
                dashboard = {
                    ano: anoAtual,
                    totais: resumoGeral.totais,
                    resumoPorCategoria: resumoGeral.resumoPorCategoria.slice(0, 5),
                    resumoPorCentro: resumoGeral.resumoPorCentro.slice(0, 5),
                    alertas: alertas.length,
                    alertasDetalhes: alertas.slice(0, 3) // Primeiros 3 alertas
                };
                res.json({
                    success: true,
                    message: 'Dashboard de orçamento obtido com sucesso',
                    data: dashboard,
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _b.sent();
                console.error('Erro ao gerar dashboard:', error_3);
                res.status(500).json({
                    success: false,
                    message: 'Erro interno ao gerar dashboard',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
