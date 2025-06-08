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
exports.getRelatorioDetratores = exports.finalizarChamado = exports.transferirChamado = exports.getUsuariosOnline = exports.getAcoesByDetrator = exports.getDetratoresByTipo = exports.getLocais = exports.getAcoes = exports.getProdutosByCliente = exports.getStatusChamado = exports.getTipos = exports.cancelarAtendimento = exports.iniciarAtendimento = exports.updateChamado = exports.createChamado = exports.getChamado = exports.getChamados = void 0;
var Chamado_1 = require("../models/Chamado");
var AtendimentoAtivo_1 = require("../models/AtendimentoAtivo");
var errorHandler_1 = require("../middlewares/errorHandler");
var database_1 = require("../config/database");
exports.getChamados = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var page, limit, offset, pagination, filters, _a, chamados, total, totalPages;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                page = parseInt(req.query.page) || 1;
                limit = parseInt(req.query.limit) || 10;
                offset = (page - 1) * limit;
                pagination = { page: page, limit: limit, offset: offset };
                filters = {
                    search: req.query.search,
                    status: req.query.status ? parseInt(req.query.status) : undefined,
                    cliente: req.query.cliente ? parseInt(req.query.cliente) : undefined,
                    tipo: req.query.tipo ? parseInt(req.query.tipo) : undefined,
                    dataInicio: req.query.dataInicio,
                    dataFim: req.query.dataFim
                };
                return [4 /*yield*/, Chamado_1.ChamadoModel.findAll(pagination, filters)];
            case 1:
                _a = _b.sent(), chamados = _a.chamados, total = _a.total;
                totalPages = Math.ceil(total / limit);
                res.json({
                    success: true,
                    message: 'Chamados obtidos com sucesso',
                    data: {
                        chamados: chamados,
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
exports.getChamado = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, chamado;
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
                return [4 /*yield*/, Chamado_1.ChamadoModel.findById(id)];
            case 1:
                chamado = _a.sent();
                if (!chamado) {
                    res.status(404).json({
                        success: false,
                        message: 'Chamado não encontrado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Chamado obtido com sucesso',
                    data: chamado,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
exports.createChamado = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, cha_tipo, cha_cliente, cha_produto, cha_DT, cha_descricao, local_chamado, operador, chamadoData, chamadoId, novoChamado, io, error_1;
    var _b, _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                _a = req.body, cha_tipo = _a.cha_tipo, cha_cliente = _a.cha_cliente, cha_produto = _a.cha_produto, cha_DT = _a.cha_DT, cha_descricao = _a.cha_descricao, local_chamado = _a.local_chamado;
                operador = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.nome) || 'Sistema';
                // Validações básicas
                if (!cha_tipo || !cha_cliente || !cha_descricao || !cha_DT || !local_chamado) {
                    res.status(400).json({
                        success: false,
                        message: 'Tipo, cliente, DT, local e descrição são obrigatórios',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                chamadoData = {
                    cha_tipo: cha_tipo,
                    cha_cliente: cha_cliente,
                    cha_produto: cha_produto || null,
                    cha_DT: cha_DT || '',
                    cha_descricao: cha_descricao.trim(),
                    local_chamado: local_chamado
                };
                _g.label = 1;
            case 1:
                _g.trys.push([1, 4, , 5]);
                return [4 /*yield*/, Chamado_1.ChamadoModel.create(chamadoData, operador)];
            case 2:
                chamadoId = _g.sent();
                return [4 /*yield*/, Chamado_1.ChamadoModel.findById(chamadoId)];
            case 3:
                novoChamado = _g.sent();
                io = req.app.get('io');
                if (io && novoChamado) {
                    console.log("\uD83D\uDCE2 Broadcasting novo chamado " + chamadoId + " para todos usu\u00E1rios");
                    // Evento para atualizar listas
                    io.emit('new_chamado_created', {
                        chamado: novoChamado,
                        createdBy: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.nome) || operador,
                        timestamp: new Date().toISOString()
                    });
                    // NOVO: Evento de notificação (exceto para quem criou)
                    io.emit('new_chamado_notification', {
                        chamadoId: novoChamado.cha_id,
                        clienteNome: novoChamado.cliente_nome,
                        descricao: ((_d = novoChamado.cha_descricao) === null || _d === void 0 ? void 0 : _d.substring(0, 100)) + '...',
                        createdBy: ((_e = req.user) === null || _e === void 0 ? void 0 : _e.nome) || operador,
                        createdById: (_f = req.user) === null || _f === void 0 ? void 0 : _f.id,
                        timestamp: new Date().toISOString(),
                        type: 'new_chamado'
                    });
                }
                res.status(201).json({
                    success: true,
                    message: 'Chamado criado com sucesso',
                    data: { id: chamadoId },
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 5];
            case 4:
                error_1 = _g.sent();
                res.status(400).json({
                    success: false,
                    message: (error_1 instanceof Error ? error_1.message : 'Erro ao criar chamado'),
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
exports.updateChamado = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, cha_tipo, cha_cliente, cha_produto, cha_DT, cha_descricao, cha_status, cha_acao, chamadoData, updated;
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
                _a = req.body, cha_tipo = _a.cha_tipo, cha_cliente = _a.cha_cliente, cha_produto = _a.cha_produto, cha_DT = _a.cha_DT, cha_descricao = _a.cha_descricao, cha_status = _a.cha_status, cha_acao = _a.cha_acao;
                if (!cha_tipo || !cha_cliente || !cha_descricao) {
                    res.status(400).json({
                        success: false,
                        message: 'Tipo, cliente e descrição são obrigatórios',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                chamadoData = {
                    cha_tipo: cha_tipo,
                    cha_cliente: cha_cliente,
                    cha_produto: cha_produto || null,
                    cha_DT: cha_DT || '',
                    cha_descricao: cha_descricao.trim(),
                    cha_status: cha_status || 1,
                    cha_acao: cha_acao || null
                };
                return [4 /*yield*/, Chamado_1.ChamadoModel.update(id, chamadoData)];
            case 1:
                updated = _b.sent();
                if (!updated) {
                    res.status(404).json({
                        success: false,
                        message: 'Chamado não encontrado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Chamado atualizado com sucesso',
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
exports.iniciarAtendimento = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, colaboradorId, error_2;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = parseInt(req.params.id);
                colaboradorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (isNaN(id) || !colaboradorId) {
                    res.status(400).json({
                        success: false,
                        message: 'ID inválido ou usuário não identificado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                // USAR NOVO MODELO
                return [4 /*yield*/, AtendimentoAtivo_1.AtendimentoAtivoModel.iniciar(id, colaboradorId)];
            case 2:
                // USAR NOVO MODELO
                _b.sent();
                res.json({
                    success: true,
                    message: 'Atendimento iniciado com sucesso',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _b.sent();
                res.status(400).json({
                    success: false,
                    message: (error_2 instanceof Error ? error_2.message : 'Erro ao iniciar atendimento'),
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.cancelarAtendimento = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, error_3;
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
                return [4 /*yield*/, AtendimentoAtivo_1.AtendimentoAtivoModel.cancelar(id)];
            case 2:
                _a.sent();
                res.json({
                    success: true,
                    message: 'Atendimento cancelado com sucesso',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _a.sent();
                res.status(400).json({
                    success: false,
                    message: 'Erro ao cancelar atendimento',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Endpoints auxiliares
exports.getTipos = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var tipos;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Chamado_1.ChamadoModel.getTipos()];
            case 1:
                tipos = _a.sent();
                res.json({
                    success: true,
                    message: 'Tipos obtidos com sucesso',
                    data: tipos,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
exports.getStatusChamado = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var status;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Chamado_1.ChamadoModel.getStatus()];
            case 1:
                status = _a.sent();
                res.json({
                    success: true,
                    message: 'Status obtidos com sucesso',
                    data: status,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
exports.getProdutosByCliente = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var clienteId, produtos;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                clienteId = parseInt(req.params.clienteId);
                if (isNaN(clienteId)) {
                    res.status(400).json({
                        success: false,
                        message: 'ID do cliente inválido',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, Chamado_1.ChamadoModel.getProdutosByCliente(clienteId)];
            case 1:
                produtos = _a.sent();
                res.json({
                    success: true,
                    message: 'Produtos obtidos com sucesso',
                    data: produtos,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
exports.getAcoes = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var acoes;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Chamado_1.ChamadoModel.getAcoes()];
            case 1:
                acoes = _a.sent();
                res.json({
                    success: true,
                    message: 'Ações obtidas com sucesso',
                    data: acoes,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
exports.getLocais = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var locais;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Chamado_1.ChamadoModel.getLocais()];
            case 1:
                locais = _a.sent();
                res.json({
                    success: true,
                    message: 'Locais obtidas com sucesso',
                    data: locais,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Buscar detratores por tipo de chamado (seguindo a lógica do Python)
exports.getDetratoresByTipo = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var tipoId, query, detratores, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                tipoId = parseInt(req.params.tipoId);
                if (isNaN(tipoId)) {
                    res.status(400).json({
                        success: false,
                        message: 'ID do tipo inválido',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                console.log("\uD83D\uDD0D Buscando detratores para tipo " + tipoId + "...");
                query = "\n      SELECT \n        d.dtr_id,\n        d.dtr_descricao,\n        d.dtr_tipo,\n        tc.tch_descricao,\n        d.dtr_indicador,\n        d.dtr_ativo\n      FROM detratores d\n      LEFT JOIN tipos_chamado tc ON d.dtr_tipo = tc.tch_id\n      WHERE d.dtr_ativo = 1 \n      AND (d.dtr_tipo IS NULL OR d.dtr_tipo = ?)\n      ORDER BY \n        d.dtr_indicador DESC,  -- Cr\u00EDticos (1) primeiro\n        d.dtr_descricao ASC\n    ";
                return [4 /*yield*/, database_1.executeQuery(query, [tipoId])];
            case 2:
                detratores = _a.sent();
                console.log("\u2705 Encontrados " + detratores.length + " detratores:", detratores.map(function (d) { return ({
                    id: d.dtr_id,
                    descricao: d.dtr_descricao,
                    indicador: d.dtr_indicador,
                    tipo: d.dtr_tipo
                }); }));
                res.json({
                    success: true,
                    message: 'Detratores obtidos com sucesso',
                    data: detratores,
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 3:
                error_4 = _a.sent();
                console.error('Erro ao buscar detratores:', error_4);
                res.status(500).json({
                    success: false,
                    message: 'Erro ao buscar detratores',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Buscar ações por detrator (baseado na estrutura do banco)
exports.getAcoesByDetrator = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var detratorId, query, acoes, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                detratorId = parseInt(req.params.detratorId);
                if (isNaN(detratorId)) {
                    res.status(400).json({
                        success: false,
                        message: 'ID do detrator inválido',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                query = "\n    SELECT ach_id, ach_descricao, ach_detrator\n    FROM acoes_chamados \n    WHERE ach_detrator = ?\n    ORDER BY ach_descricao ASC\n  ";
                return [4 /*yield*/, database_1.executeQuery(query, [detratorId])];
            case 2:
                acoes = _a.sent();
                res.json({
                    success: true,
                    message: 'Ações obtidas com sucesso',
                    data: acoes,
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 3:
                error_5 = _a.sent();
                console.error('Erro ao buscar ações:', error_5);
                res.status(500).json({
                    success: false,
                    message: 'Erro ao buscar ações',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Buscar usuários online
exports.getUsuariosOnline = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var io, activeUsers, usuariosOnline;
    return __generator(this, function (_a) {
        try {
            io = req.app.get('io');
            activeUsers = req.app.get('activeUsers') || new Map();
            usuariosOnline = Array.from(activeUsers.values())
                .filter(function (user) { return user.socketId && user.connectedAt; })
                .map(function (user) { return ({
                id: user.id,
                nome: user.nome,
                categoria: user.categoria,
                connectedAt: user.connectedAt
            }); });
            res.json({
                success: true,
                data: usuariosOnline,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Erro ao buscar usuários online:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar usuários online',
                timestamp: new Date().toISOString()
            });
        }
        return [2 /*return*/];
    });
}); });
// Transferir chamado
exports.transferirChamado = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var chamadoId, novoColaboradorId, antigoColaboradorId, atendimentoAtual, result, io, activeUsers, antigoUser, novoUser, timestamp, error_6;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                chamadoId = parseInt(req.params.id);
                novoColaboradorId = req.body.novoColaboradorId;
                antigoColaboradorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (isNaN(chamadoId) || !antigoColaboradorId || !novoColaboradorId) {
                    res.status(400).json({
                        success: false,
                        message: 'Dados inválidos para transferência',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                console.log("\uD83D\uDD04 API: Transferindo chamado " + chamadoId + ": " + antigoColaboradorId + " \u2192 " + novoColaboradorId);
                return [4 /*yield*/, AtendimentoAtivo_1.AtendimentoAtivoModel.buscarPorChamado(chamadoId)];
            case 2:
                atendimentoAtual = _b.sent();
                if (!atendimentoAtual) {
                    res.status(400).json({
                        success: false,
                        message: 'Atendimento ativo não encontrado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, AtendimentoAtivo_1.AtendimentoAtivoModel.transferir(chamadoId, antigoColaboradorId, novoColaboradorId)];
            case 3:
                result = _b.sent();
                io = req.app.get('io');
                activeUsers = req.app.get('activeUsers');
                if (io && activeUsers) {
                    antigoUser = Array.from(activeUsers.values()).find(function (user) { return user.id === antigoColaboradorId; });
                    novoUser = Array.from(activeUsers.values()).find(function (user) { return user.id === novoColaboradorId; });
                    if (antigoUser && novoUser) {
                        timestamp = new Date().toISOString();
                        // 1. Notificar quem transferiu
                        io.to(antigoUser.socketId).emit('transfer_completed', {
                            chamadoId: chamadoId,
                            userId: antigoColaboradorId,
                            message: "Chamado transferido para " + novoUser.nome,
                            timestamp: timestamp
                        });
                        // 2. Notificar quem recebeu COM TEMPO PRESERVADO
                        io.to(novoUser.socketId).emit('transfer_received', {
                            chamadoId: chamadoId,
                            userId: novoColaboradorId,
                            userName: novoUser.nome,
                            startTime: result.startTimeOriginal,
                            tempoJaDecorrido: result.tempoPreservado,
                            transferredBy: antigoUser.nome,
                            timestamp: timestamp,
                            autoOpen: true
                        });
                        // 3. Broadcast geral
                        io.emit('user_started_attendance', {
                            chamadoId: chamadoId,
                            userId: novoColaboradorId,
                            userName: novoUser.nome,
                            startTime: result.startTimeOriginal,
                            motivo: 'transferred_general'
                        });
                        console.log("\uD83D\uDCE1 Eventos emitidos - tempo preservado: " + result.tempoPreservado + "s");
                    }
                }
                res.json({
                    success: true,
                    message: 'Chamado transferido com sucesso',
                    data: {
                        tempoPreservado: result.tempoPreservado,
                        startTimeOriginal: result.startTimeOriginal
                    },
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 5];
            case 4:
                error_6 = _b.sent();
                console.error('Erro ao transferir chamado:', error_6);
                res.status(400).json({
                    success: false,
                    message: error_6 instanceof Error ? error_6.message : 'Erro ao transferir chamado',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Finalizar chamado COM detrator e descrição (seguindo lógica do closeCall)
exports.finalizarChamado = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, detrator_id, descricao_atendimento, descricao, io, error_7;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                id = parseInt(req.params.id);
                _a = req.body, detrator_id = _a.detrator_id, descricao_atendimento = _a.descricao_atendimento;
                console.log('🔍 Backend - finalizarChamado chamado com:');
                console.log('- ID:', id, typeof id);
                console.log('- Detrator ID:', detrator_id, typeof detrator_id);
                console.log('- Descrição:', descricao_atendimento, typeof descricao_atendimento);
                if (isNaN(id)) {
                    res.status(400).json({
                        success: false,
                        message: 'ID do chamado é inválido',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                if (!detrator_id) {
                    res.status(400).json({
                        success: false,
                        message: 'Detrator é obrigatório',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                // Validar descrição do atendimento
                if (!descricao_atendimento || typeof descricao_atendimento !== 'string') {
                    res.status(400).json({
                        success: false,
                        message: 'Descrição do atendimento é obrigatória',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                descricao = descricao_atendimento.trim();
                if (descricao.length === 0) {
                    res.status(400).json({
                        success: false,
                        message: 'Descrição do atendimento não pode estar vazia',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                if (descricao.length > 250) {
                    res.status(400).json({
                        success: false,
                        message: 'Descrição do atendimento deve ter no máximo 250 caracteres',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                console.log('✅ Validações passaram, finalizando chamado...');
                // Usar a nova função que segue a lógica exata do Python
                return [4 /*yield*/, AtendimentoAtivo_1.AtendimentoAtivoModel.finalizarComDetrator(id, detrator_id, descricao)];
            case 2:
                // Usar a nova função que segue a lógica exata do Python
                _c.sent();
                console.log('✅ Chamado finalizado com sucesso');
                io = req.app.get('io');
                if (io) {
                    console.log("\uD83D\uDCE1 Emitindo evento de finaliza\u00E7\u00E3o para chamado " + id);
                    io.emit('user_finished_attendance', {
                        chamadoId: id,
                        userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id
                    });
                }
                res.json({
                    success: true,
                    message: 'Chamado finalizado com sucesso',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 3:
                error_7 = _c.sent();
                console.error('❌ Erro ao finalizar chamado:', error_7);
                res.status(400).json({
                    success: false,
                    message: error_7 instanceof Error ? error_7.message : 'Erro ao finalizar chamado',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Relatório de detratores
exports.getRelatorioDetratores = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, dataInicio, dataFim, query, relatorio, error_8;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, dataInicio = _a.dataInicio, dataFim = _a.dataFim;
                if (!dataInicio || !dataFim) {
                    res.status(400).json({
                        success: false,
                        message: 'Data de início e fim são obrigatórias',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                query = "\n      SELECT \n        d.dtr_id,\n        d.dtr_descricao as detrator_descricao,\n        d.dtr_indicador,\n        tc.tch_descricao as tipo_chamado,\n        COUNT(DISTINCT c.cha_id) as total_ocorrencias,\n        COUNT(DISTINCT ac.ach_id) as total_acoes_distintas,\n        AVG(TIMESTAMPDIFF(MINUTE, c.cha_data_hora_abertura, c.cha_data_hora_termino)) as tempo_medio_resolucao,\n        GROUP_CONCAT(DISTINCT ac.ach_descricao SEPARATOR '; ') as acoes_utilizadas\n      FROM chamados c\n      INNER JOIN acoes_chamados ac ON c.cha_acao = ac.ach_id\n      INNER JOIN detratores d ON ac.ach_detrator = d.dtr_id\n      LEFT JOIN tipos_chamado tc ON d.dtr_tipo = tc.tch_id\n      WHERE c.cha_status = 3 \n      AND DATE(c.cha_data_hora_termino) BETWEEN ? AND ?\n      GROUP BY d.dtr_id, d.dtr_descricao, d.dtr_indicador, tc.tch_descricao\n      ORDER BY total_ocorrencias DESC, d.dtr_indicador DESC\n    ";
                return [4 /*yield*/, database_1.executeQuery(query, [dataInicio, dataFim])];
            case 2:
                relatorio = _b.sent();
                res.json({
                    success: true,
                    message: 'Relatório de detratores obtido com sucesso',
                    data: relatorio,
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 3:
                error_8 = _b.sent();
                console.error('Erro ao gerar relatório de detratores:', error_8);
                res.status(500).json({
                    success: false,
                    message: 'Erro ao gerar relatório',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
