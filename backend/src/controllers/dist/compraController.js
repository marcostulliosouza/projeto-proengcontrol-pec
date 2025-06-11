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
exports.desativarFornecedor = exports.updateFornecedor = exports.createFornecedor = exports.getFornecedores = exports.processarSolicitacao = exports.createSolicitacao = exports.getSolicitacoes = exports.getRelatorioCompras = exports.getCategoriasVerba = exports.cancelarCompra = exports.receberCompra = exports.aprovarCompra = exports.updateCompra = exports.createCompra = exports.getCompra = exports.getCompras = void 0;
var Compra_1 = require("../models/Compra");
var errorHandler_1 = require("../middlewares/errorHandler");
// ===== COMPRAS =====
// Listar compras
exports.getCompras = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var page, limit, filtros, _a, compras, total, totalPages;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                page = parseInt(req.query.page) || 1;
                limit = parseInt(req.query.limit) || 20;
                filtros = {
                    search: req.query.search,
                    status: req.query.status,
                    categoria: req.query.categoria ? parseInt(req.query.categoria) : undefined,
                    dataInicio: req.query.dataInicio,
                    dataFim: req.query.dataFim,
                    centroCusto: req.query.centroCusto,
                    page: page,
                    limit: limit
                };
                return [4 /*yield*/, Compra_1.CompraModel.findAll(filtros)];
            case 1:
                _a = _b.sent(), compras = _a.compras, total = _a.total;
                totalPages = Math.ceil(total / limit);
                res.json({
                    success: true,
                    message: 'Compras obtidas com sucesso',
                    data: {
                        compras: compras,
                        pagination: {
                            currentPage: page,
                            totalPages: totalPages,
                            totalItems: total,
                            itemsPerPage: limit,
                            hasNext: page < totalPages,
                            hasPrev: page > 1
                        }
                    },
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Buscar compra por ID
exports.getCompra = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, compra;
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
                return [4 /*yield*/, Compra_1.CompraModel.findById(id)];
            case 1:
                compra = _a.sent();
                if (!compra) {
                    res.status(404).json({
                        success: false,
                        message: 'Compra não encontrada',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Compra obtida com sucesso',
                    data: compra,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Criar nova compra
exports.createCompra = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, cav_id, com_rc, com_cod_sap, com_descricao, com_qtd, com_valor_unit, com_utilizacao, com_centro_custo, com_conta_razao, for_id, compraData, compraId;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.body, cav_id = _a.cav_id, com_rc = _a.com_rc, com_cod_sap = _a.com_cod_sap, com_descricao = _a.com_descricao, com_qtd = _a.com_qtd, com_valor_unit = _a.com_valor_unit, com_utilizacao = _a.com_utilizacao, com_centro_custo = _a.com_centro_custo, com_conta_razao = _a.com_conta_razao, for_id = _a.for_id;
                // Validações básicas
                if (!cav_id || !com_rc || !com_descricao || !com_centro_custo || !com_conta_razao) {
                    res.status(400).json({
                        success: false,
                        message: 'Categoria, RC, descrição, centro de custo e conta razão são obrigatórios',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                if (com_qtd <= 0 || com_valor_unit < 0) {
                    res.status(400).json({
                        success: false,
                        message: 'Quantidade deve ser maior que zero e valor não pode ser negativo',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                compraData = {
                    cav_id: cav_id,
                    com_rc: com_rc.trim(),
                    com_cod_sap: (com_cod_sap === null || com_cod_sap === void 0 ? void 0 : com_cod_sap.trim()) || null,
                    com_descricao: com_descricao.trim(),
                    com_qtd: parseInt(com_qtd),
                    com_valor_unit: parseFloat(com_valor_unit) || 0,
                    com_utilizacao: (com_utilizacao === null || com_utilizacao === void 0 ? void 0 : com_utilizacao.trim()) || null,
                    com_centro_custo: com_centro_custo.trim(),
                    com_conta_razao: com_conta_razao.trim(),
                    com_colaborador_abertura: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) || null,
                    for_id: for_id || null
                };
                return [4 /*yield*/, Compra_1.CompraModel.create(compraData)];
            case 1:
                compraId = _c.sent();
                res.status(201).json({
                    success: true,
                    message: 'Compra criada com sucesso',
                    data: { id: compraId },
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Atualizar compra
exports.updateCompra = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, cav_id, com_rc, com_cod_sap, com_descricao, com_qtd, com_valor_unit, com_utilizacao, com_centro_custo, com_conta_razao, for_id, com_obs, compraData, updated;
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
                _a = req.body, cav_id = _a.cav_id, com_rc = _a.com_rc, com_cod_sap = _a.com_cod_sap, com_descricao = _a.com_descricao, com_qtd = _a.com_qtd, com_valor_unit = _a.com_valor_unit, com_utilizacao = _a.com_utilizacao, com_centro_custo = _a.com_centro_custo, com_conta_razao = _a.com_conta_razao, for_id = _a.for_id, com_obs = _a.com_obs;
                if (!cav_id || !com_rc || !com_descricao || !com_centro_custo || !com_conta_razao) {
                    res.status(400).json({
                        success: false,
                        message: 'Campos obrigatórios não podem estar vazios',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                compraData = {
                    cav_id: cav_id,
                    com_rc: com_rc.trim(),
                    com_cod_sap: (com_cod_sap === null || com_cod_sap === void 0 ? void 0 : com_cod_sap.trim()) || null,
                    com_descricao: com_descricao.trim(),
                    com_qtd: parseInt(com_qtd),
                    com_valor_unit: parseFloat(com_valor_unit) || 0,
                    com_utilizacao: (com_utilizacao === null || com_utilizacao === void 0 ? void 0 : com_utilizacao.trim()) || null,
                    com_centro_custo: com_centro_custo.trim(),
                    com_conta_razao: com_conta_razao.trim(),
                    for_id: for_id || null,
                    com_obs: (com_obs === null || com_obs === void 0 ? void 0 : com_obs.trim()) || null
                };
                return [4 /*yield*/, Compra_1.CompraModel.update(id, compraData)];
            case 1:
                updated = _b.sent();
                if (!updated) {
                    res.status(404).json({
                        success: false,
                        message: 'Compra não encontrada',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Compra atualizada com sucesso',
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Aprovar compra
exports.aprovarCompra = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, fornecedorId, aprovadorId, aprovado;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = parseInt(req.params.id);
                fornecedorId = req.body.fornecedorId;
                aprovadorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (isNaN(id) || !aprovadorId) {
                    res.status(400).json({
                        success: false,
                        message: 'ID inválido ou usuário não identificado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, Compra_1.CompraModel.aprovar(id, aprovadorId, fornecedorId)];
            case 1:
                aprovado = _b.sent();
                if (!aprovado) {
                    res.status(404).json({
                        success: false,
                        message: 'Compra não encontrada ou já foi processada',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Compra aprovada com sucesso',
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Receber compra
exports.receberCompra = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, notaFiscal, dataRecebimento, observacoes, colaboradorId, recebido, error_1;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                id = parseInt(req.params.id);
                _a = req.body, notaFiscal = _a.notaFiscal, dataRecebimento = _a.dataRecebimento, observacoes = _a.observacoes;
                colaboradorId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                if (isNaN(id) || !colaboradorId) {
                    res.status(400).json({
                        success: false,
                        message: 'ID inválido ou usuário não identificado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                if (!notaFiscal) {
                    res.status(400).json({
                        success: false,
                        message: 'Nota fiscal é obrigatória',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                return [4 /*yield*/, Compra_1.CompraModel.receberCompra(id, {
                        notaFiscal: notaFiscal.trim(),
                        dataRecebimento: dataRecebimento || undefined,
                        observacoes: (observacoes === null || observacoes === void 0 ? void 0 : observacoes.trim()) || undefined,
                        colaboradorId: colaboradorId
                    })];
            case 2:
                recebido = _c.sent();
                if (!recebido) {
                    res.status(404).json({
                        success: false,
                        message: 'Compra não encontrada ou não está aprovada',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Compra recebida e estoque atualizado com sucesso',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 3:
                error_1 = _c.sent();
                res.status(400).json({
                    success: false,
                    message: error_1 instanceof Error ? error_1.message : 'Erro ao receber compra',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Cancelar compra
exports.cancelarCompra = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, cancelado;
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
                return [4 /*yield*/, Compra_1.CompraModel.cancelar(id)];
            case 1:
                cancelado = _a.sent();
                if (!cancelado) {
                    res.status(404).json({
                        success: false,
                        message: 'Compra não encontrada ou não pode ser cancelada',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Compra cancelada com sucesso',
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Buscar categorias de verba
exports.getCategoriasVerba = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var categorias;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Compra_1.CompraModel.getCategoriasVerba()];
            case 1:
                categorias = _a.sent();
                res.json({
                    success: true,
                    message: 'Categorias de verba obtidas com sucesso',
                    data: categorias,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Relatório de compras
exports.getRelatorioCompras = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, dataInicio, dataFim, categoria, status, centroCusto, filtros, relatorio;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, dataInicio = _a.dataInicio, dataFim = _a.dataFim, categoria = _a.categoria, status = _a.status, centroCusto = _a.centroCusto;
                if (!dataInicio || !dataFim) {
                    res.status(400).json({
                        success: false,
                        message: 'Data de início e fim são obrigatórias',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                filtros = {
                    dataInicio: dataInicio,
                    dataFim: dataFim,
                    categoria: categoria ? parseInt(categoria) : undefined,
                    status: status,
                    centroCusto: centroCusto
                };
                return [4 /*yield*/, Compra_1.CompraModel.getRelatorioCompras(filtros)];
            case 1:
                relatorio = _b.sent();
                res.json({
                    success: true,
                    message: 'Relatório de compras gerado com sucesso',
                    data: relatorio,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// ===== SOLICITAÇÕES DE COMPRA =====
// Listar solicitações
exports.getSolicitacoes = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var page, limit, filtros, _a, solicitacoes, total, totalPages;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                page = parseInt(req.query.page) || 1;
                limit = parseInt(req.query.limit) || 20;
                filtros = {
                    status: req.query.status,
                    urgencia: req.query.urgencia,
                    solicitante: req.query.solicitante ? parseInt(req.query.solicitante) : undefined,
                    dataInicio: req.query.dataInicio,
                    dataFim: req.query.dataFim,
                    page: page,
                    limit: limit
                };
                return [4 /*yield*/, Compra_1.SolicitacaoCompraModel.findAll(filtros)];
            case 1:
                _a = _b.sent(), solicitacoes = _a.solicitacoes, total = _a.total;
                totalPages = Math.ceil(total / limit);
                res.json({
                    success: true,
                    message: 'Solicitações obtidas com sucesso',
                    data: {
                        solicitacoes: solicitacoes,
                        pagination: {
                            currentPage: page,
                            totalPages: totalPages,
                            totalItems: total,
                            itemsPerPage: limit,
                            hasNext: page < totalPages,
                            hasPrev: page > 1
                        }
                    },
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Criar solicitação de compra
exports.createSolicitacao = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, ins_id, sol_quantidade, sol_justificativa, sol_urgencia, solicitanteId, solicitacaoData, solicitacaoId;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.body, ins_id = _a.ins_id, sol_quantidade = _a.sol_quantidade, sol_justificativa = _a.sol_justificativa, sol_urgencia = _a.sol_urgencia;
                solicitanteId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                if (!ins_id || !sol_quantidade || !solicitanteId) {
                    res.status(400).json({
                        success: false,
                        message: 'Insumo, quantidade e solicitante são obrigatórios',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                if (sol_quantidade <= 0) {
                    res.status(400).json({
                        success: false,
                        message: 'Quantidade deve ser maior que zero',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                solicitacaoData = {
                    ins_id: ins_id,
                    sol_quantidade: parseInt(sol_quantidade),
                    sol_justificativa: (sol_justificativa === null || sol_justificativa === void 0 ? void 0 : sol_justificativa.trim()) || null,
                    sol_urgencia: sol_urgencia || 'MEDIA',
                    sol_colaborador_solicitante: solicitanteId
                };
                return [4 /*yield*/, Compra_1.SolicitacaoCompraModel.create(solicitacaoData)];
            case 1:
                solicitacaoId = _c.sent();
                res.status(201).json({
                    success: true,
                    message: 'Solicitação criada com sucesso',
                    data: { id: solicitacaoId },
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Aprovar/Rejeitar solicitação
exports.processarSolicitacao = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, status, observacao, aprovadorId, processado;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                id = parseInt(req.params.id);
                _a = req.body, status = _a.status, observacao = _a.observacao;
                aprovadorId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                if (isNaN(id) || !aprovadorId) {
                    res.status(400).json({
                        success: false,
                        message: 'ID inválido ou usuário não identificado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                if (!status || !['APROVADA', 'REJEITADA'].includes(status)) {
                    res.status(400).json({
                        success: false,
                        message: 'Status deve ser APROVADA ou REJEITADA',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, Compra_1.SolicitacaoCompraModel.processarSolicitacao(id, aprovadorId, status, observacao === null || observacao === void 0 ? void 0 : observacao.trim())];
            case 1:
                processado = _c.sent();
                if (!processado) {
                    res.status(404).json({
                        success: false,
                        message: 'Solicitação não encontrada ou já foi processada',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: "Solicita\u00E7\u00E3o " + status.toLowerCase() + " com sucesso",
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// ===== FORNECEDORES =====
// Listar fornecedores
exports.getFornecedores = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var filtros, fornecedores;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                filtros = {
                    search: req.query.search,
                    ativo: req.query.ativo !== undefined ? req.query.ativo === 'true' : true
                };
                return [4 /*yield*/, Compra_1.FornecedorModel.findAll(filtros)];
            case 1:
                fornecedores = _a.sent();
                res.json({
                    success: true,
                    message: 'Fornecedores obtidos com sucesso',
                    data: fornecedores,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Criar fornecedor
exports.createFornecedor = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, for_nome, for_cnpj, for_contato, for_telefone, for_email, for_endereco, fornecedorData, fornecedorId;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, for_nome = _a.for_nome, for_cnpj = _a.for_cnpj, for_contato = _a.for_contato, for_telefone = _a.for_telefone, for_email = _a.for_email, for_endereco = _a.for_endereco;
                if (!for_nome || for_nome.trim() === '') {
                    res.status(400).json({
                        success: false,
                        message: 'Nome do fornecedor é obrigatório',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                fornecedorData = {
                    for_nome: for_nome.trim(),
                    for_cnpj: (for_cnpj === null || for_cnpj === void 0 ? void 0 : for_cnpj.trim()) || null,
                    for_contato: (for_contato === null || for_contato === void 0 ? void 0 : for_contato.trim()) || null,
                    for_telefone: (for_telefone === null || for_telefone === void 0 ? void 0 : for_telefone.trim()) || null,
                    for_email: (for_email === null || for_email === void 0 ? void 0 : for_email.trim()) || null,
                    for_endereco: (for_endereco === null || for_endereco === void 0 ? void 0 : for_endereco.trim()) || null
                };
                return [4 /*yield*/, Compra_1.FornecedorModel.create(fornecedorData)];
            case 1:
                fornecedorId = _b.sent();
                res.status(201).json({
                    success: true,
                    message: 'Fornecedor criado com sucesso',
                    data: { id: fornecedorId },
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Atualizar fornecedor
exports.updateFornecedor = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, for_nome, for_cnpj, for_contato, for_telefone, for_email, for_endereco, fornecedorData, updated;
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
                _a = req.body, for_nome = _a.for_nome, for_cnpj = _a.for_cnpj, for_contato = _a.for_contato, for_telefone = _a.for_telefone, for_email = _a.for_email, for_endereco = _a.for_endereco;
                if (!for_nome || for_nome.trim() === '') {
                    res.status(400).json({
                        success: false,
                        message: 'Nome do fornecedor é obrigatório',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                fornecedorData = {
                    for_nome: for_nome.trim(),
                    for_cnpj: (for_cnpj === null || for_cnpj === void 0 ? void 0 : for_cnpj.trim()) || null,
                    for_contato: (for_contato === null || for_contato === void 0 ? void 0 : for_contato.trim()) || null,
                    for_telefone: (for_telefone === null || for_telefone === void 0 ? void 0 : for_telefone.trim()) || null,
                    for_email: (for_email === null || for_email === void 0 ? void 0 : for_email.trim()) || null,
                    for_endereco: (for_endereco === null || for_endereco === void 0 ? void 0 : for_endereco.trim()) || null
                };
                return [4 /*yield*/, Compra_1.FornecedorModel.update(id, fornecedorData)];
            case 1:
                updated = _b.sent();
                if (!updated) {
                    res.status(404).json({
                        success: false,
                        message: 'Fornecedor não encontrado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Fornecedor atualizado com sucesso',
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Desativar fornecedor
exports.desativarFornecedor = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, desativado;
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
                return [4 /*yield*/, Compra_1.FornecedorModel.desativar(id)];
            case 1:
                desativado = _a.sent();
                if (!desativado) {
                    res.status(404).json({
                        success: false,
                        message: 'Fornecedor não encontrado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Fornecedor desativado com sucesso',
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
