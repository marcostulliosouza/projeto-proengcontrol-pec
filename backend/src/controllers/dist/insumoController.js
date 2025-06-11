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
exports.getInsumosAutocomplete = exports.getEstatisticas = exports.getCategorias = exports.getEstoqueBaixo = exports.getHistoricoMovimentacoes = exports.movimentarEstoque = exports.deleteInsumo = exports.updateInsumo = exports.createInsumo = exports.getInsumo = exports.getInsumos = void 0;
var Insumo_1 = require("../models/Insumo");
var errorHandler_1 = require("../middlewares/errorHandler");
// Listar insumos
exports.getInsumos = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var page, limit, filtros, _a, insumos, total, totalPages;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                page = parseInt(req.query.page) || 1;
                limit = parseInt(req.query.limit) || 20;
                filtros = {
                    search: req.query.search,
                    categoria: req.query.categoria ? parseInt(req.query.categoria) : undefined,
                    status: req.query.status,
                    estoqueBaixo: req.query.estoqueBaixo === 'true',
                    page: page,
                    limit: limit
                };
                return [4 /*yield*/, Insumo_1.InsumoModel.findAll(filtros)];
            case 1:
                _a = _b.sent(), insumos = _a.insumos, total = _a.total;
                totalPages = Math.ceil(total / limit);
                res.json({
                    success: true,
                    message: 'Insumos obtidos com sucesso',
                    data: {
                        insumos: insumos,
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
// Buscar insumo por ID
exports.getInsumo = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, insumo;
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
                return [4 /*yield*/, Insumo_1.InsumoModel.findById(id)];
            case 1:
                insumo = _a.sent();
                if (!insumo) {
                    res.status(404).json({
                        success: false,
                        message: 'Insumo não encontrado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Insumo obtido com sucesso',
                    data: insumo,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Criar novo insumo
exports.createInsumo = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, cai_id, ins_cod_sap, ins_nome, ins_descricao, ins_qtd, ins_valor_unit, ins_estoque_minimo, ins_localizacao, ins_observacoes, insumoData, insumoId, error_1;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.body, cai_id = _a.cai_id, ins_cod_sap = _a.ins_cod_sap, ins_nome = _a.ins_nome, ins_descricao = _a.ins_descricao, ins_qtd = _a.ins_qtd, ins_valor_unit = _a.ins_valor_unit, ins_estoque_minimo = _a.ins_estoque_minimo, ins_localizacao = _a.ins_localizacao, ins_observacoes = _a.ins_observacoes;
                // Validações básicas
                if (!cai_id || !ins_nome) {
                    res.status(400).json({
                        success: false,
                        message: 'Categoria e nome são obrigatórios',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                if (ins_valor_unit < 0 || ins_estoque_minimo < 0 || ins_qtd < 0) {
                    res.status(400).json({
                        success: false,
                        message: 'Valores não podem ser negativos',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                insumoData = {
                    cai_id: cai_id,
                    ins_cod_sap: (ins_cod_sap === null || ins_cod_sap === void 0 ? void 0 : ins_cod_sap.trim()) || null,
                    ins_nome: ins_nome.trim(),
                    ins_descricao: (ins_descricao === null || ins_descricao === void 0 ? void 0 : ins_descricao.trim()) || null,
                    ins_qtd: parseInt(ins_qtd) || 0,
                    ins_valor_unit: parseFloat(ins_valor_unit) || 0,
                    ins_estoque_minimo: parseInt(ins_estoque_minimo) || 0,
                    ins_localizacao: (ins_localizacao === null || ins_localizacao === void 0 ? void 0 : ins_localizacao.trim()) || null,
                    ins_observacoes: (ins_observacoes === null || ins_observacoes === void 0 ? void 0 : ins_observacoes.trim()) || null
                };
                _c.label = 1;
            case 1:
                _c.trys.push([1, 5, , 6]);
                return [4 /*yield*/, Insumo_1.InsumoModel.create(insumoData)];
            case 2:
                insumoId = _c.sent();
                if (!(insumoData.ins_qtd > 0)) return [3 /*break*/, 4];
                return [4 /*yield*/, Insumo_1.InsumoModel.movimentarEstoque({
                        ins_id: insumoId,
                        mov_tipo: 'ENTRADA',
                        mov_quantidade: insumoData.ins_qtd,
                        mov_motivo: 'ESTOQUE INICIAL',
                        mov_observacao: 'Cadastro inicial do insumo',
                        mov_colaborador: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) || 1,
                        mov_documento: 'CADASTRO'
                    })];
            case 3:
                _c.sent();
                _c.label = 4;
            case 4:
                res.status(201).json({
                    success: true,
                    message: 'Insumo criado com sucesso',
                    data: { id: insumoId },
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 6];
            case 5:
                error_1 = _c.sent();
                res.status(400).json({
                    success: false,
                    message: error_1 instanceof Error ? error_1.message : 'Erro ao criar insumo',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// Atualizar insumo
exports.updateInsumo = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, cai_id, ins_cod_sap, ins_nome, ins_descricao, ins_valor_unit, ins_estoque_minimo, ins_localizacao, ins_observacoes, insumoData, updated;
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
                _a = req.body, cai_id = _a.cai_id, ins_cod_sap = _a.ins_cod_sap, ins_nome = _a.ins_nome, ins_descricao = _a.ins_descricao, ins_valor_unit = _a.ins_valor_unit, ins_estoque_minimo = _a.ins_estoque_minimo, ins_localizacao = _a.ins_localizacao, ins_observacoes = _a.ins_observacoes;
                if (!cai_id || !ins_nome) {
                    res.status(400).json({
                        success: false,
                        message: 'Categoria e nome são obrigatórios',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                if (ins_valor_unit < 0 || ins_estoque_minimo < 0) {
                    res.status(400).json({
                        success: false,
                        message: 'Valores não podem ser negativos',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                insumoData = {
                    cai_id: cai_id,
                    ins_cod_sap: (ins_cod_sap === null || ins_cod_sap === void 0 ? void 0 : ins_cod_sap.trim()) || null,
                    ins_nome: ins_nome.trim(),
                    ins_descricao: (ins_descricao === null || ins_descricao === void 0 ? void 0 : ins_descricao.trim()) || null,
                    ins_valor_unit: parseFloat(ins_valor_unit) || 0,
                    ins_estoque_minimo: parseInt(ins_estoque_minimo) || 0,
                    ins_localizacao: (ins_localizacao === null || ins_localizacao === void 0 ? void 0 : ins_localizacao.trim()) || null,
                    ins_observacoes: (ins_observacoes === null || ins_observacoes === void 0 ? void 0 : ins_observacoes.trim()) || null
                };
                return [4 /*yield*/, Insumo_1.InsumoModel.update(id, insumoData)];
            case 1:
                updated = _b.sent();
                if (!updated) {
                    res.status(404).json({
                        success: false,
                        message: 'Insumo não encontrado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Insumo atualizado com sucesso',
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Deletar insumo
exports.deleteInsumo = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, deleted;
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
                return [4 /*yield*/, Insumo_1.InsumoModel["delete"](id)];
            case 1:
                deleted = _a.sent();
                if (!deleted) {
                    res.status(404).json({
                        success: false,
                        message: 'Insumo não encontrado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Insumo removido com sucesso',
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Movimentar estoque
exports.movimentarEstoque = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, mov_tipo, mov_quantidade, mov_motivo, mov_observacao, mov_documento, mov_centro_custo, userId, error_2;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                id = parseInt(req.params.id);
                _a = req.body, mov_tipo = _a.mov_tipo, mov_quantidade = _a.mov_quantidade, mov_motivo = _a.mov_motivo, mov_observacao = _a.mov_observacao, mov_documento = _a.mov_documento, mov_centro_custo = _a.mov_centro_custo;
                userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                if (isNaN(id) || !userId) {
                    res.status(400).json({
                        success: false,
                        message: 'ID inválido ou usuário não identificado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                if (!mov_tipo || !mov_quantidade || mov_quantidade <= 0) {
                    res.status(400).json({
                        success: false,
                        message: 'Tipo de movimentação e quantidade são obrigatórios',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                if (!['ENTRADA', 'SAIDA', 'AJUSTE', 'TRANSFERENCIA'].includes(mov_tipo)) {
                    res.status(400).json({
                        success: false,
                        message: 'Tipo de movimentação inválido',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                return [4 /*yield*/, Insumo_1.InsumoModel.movimentarEstoque({
                        ins_id: id,
                        mov_tipo: mov_tipo,
                        mov_quantidade: parseInt(mov_quantidade),
                        mov_motivo: (mov_motivo === null || mov_motivo === void 0 ? void 0 : mov_motivo.trim()) || null,
                        mov_observacao: (mov_observacao === null || mov_observacao === void 0 ? void 0 : mov_observacao.trim()) || null,
                        mov_colaborador: userId,
                        mov_documento: (mov_documento === null || mov_documento === void 0 ? void 0 : mov_documento.trim()) || null,
                        mov_centro_custo: (mov_centro_custo === null || mov_centro_custo === void 0 ? void 0 : mov_centro_custo.trim()) || null
                    })];
            case 2:
                _c.sent();
                res.json({
                    success: true,
                    message: 'Movimentação realizada com sucesso',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _c.sent();
                res.status(400).json({
                    success: false,
                    message: error_2 instanceof Error ? error_2.message : 'Erro ao movimentar estoque',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Histórico de movimentações
exports.getHistoricoMovimentacoes = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, page, limit, filtros, _a, movimentacoes, total, totalPages;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = parseInt(req.params.id);
                page = parseInt(req.query.page) || 1;
                limit = parseInt(req.query.limit) || 20;
                filtros = {
                    dataInicio: req.query.dataInicio,
                    dataFim: req.query.dataFim,
                    tipo: req.query.tipo,
                    colaborador: req.query.colaborador ? parseInt(req.query.colaborador) : undefined,
                    page: page,
                    limit: limit
                };
                return [4 /*yield*/, Insumo_1.InsumoModel.getHistoricoMovimentacoes(isNaN(id) ? undefined : id, filtros)];
            case 1:
                _a = _b.sent(), movimentacoes = _a.movimentacoes, total = _a.total;
                totalPages = Math.ceil(total / limit);
                res.json({
                    success: true,
                    message: 'Histórico obtido com sucesso',
                    data: {
                        movimentacoes: movimentacoes,
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
// Relatório de estoque baixo
exports.getEstoqueBaixo = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var insumos;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Insumo_1.InsumoModel.getEstoqueBaixo()];
            case 1:
                insumos = _a.sent();
                res.json({
                    success: true,
                    message: 'Relatório de estoque baixo obtido com sucesso',
                    data: insumos,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Buscar categorias
exports.getCategorias = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var categorias;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Insumo_1.InsumoModel.getCategorias()];
            case 1:
                categorias = _a.sent();
                res.json({
                    success: true,
                    message: 'Categorias obtidas com sucesso',
                    data: categorias,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Dashboard - estatísticas
exports.getEstatisticas = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var estatisticas;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Insumo_1.InsumoModel.getEstatisticas()];
            case 1:
                estatisticas = _a.sent();
                res.json({
                    success: true,
                    message: 'Estatísticas obtidas com sucesso',
                    data: estatisticas,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Buscar insumos para autocomplete
exports.getInsumosAutocomplete = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var search, insumos, simplified;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                search = req.query.search;
                if (!search || search.length < 2) {
                    res.json({
                        success: true,
                        data: [],
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, Insumo_1.InsumoModel.findAll({
                        search: search,
                        limit: 10
                    })];
            case 1:
                insumos = (_a.sent()).insumos;
                simplified = insumos.map(function (insumo) { return ({
                    ins_id: insumo.ins_id,
                    ins_nome: insumo.ins_nome,
                    ins_cod_sap: insumo.ins_cod_sap,
                    ins_qtd: insumo.ins_qtd,
                    ins_estoque_minimo: insumo.ins_estoque_minimo,
                    categoria_nome: insumo.categoria_nome
                }); });
                res.json({
                    success: true,
                    message: 'Insumos para autocomplete obtidos com sucesso',
                    data: simplified,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
