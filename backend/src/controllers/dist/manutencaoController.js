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
exports.getMetricasManutencao = exports.atualizarFormulario = exports.criarFormulario = exports.getItensFormulario = exports.getFormulariosManutencao = exports.getDetalhesManutencao = exports.getHistoricoManutencoes = exports.cancelarManutencao = exports.getStatusDispositivos = exports.finalizarManutencao = exports.iniciarManutencao = exports.verificarManutencaoAndamento = exports.getDispositivoDetalhes = exports.getDispositivosManutencao = void 0;
var ManutencaoPreventiva_1 = require("../models/ManutencaoPreventiva");
var errorHandler_1 = require("../middlewares/errorHandler");
// Buscar dispositivos que precisam de manutenção
exports.getDispositivosManutencao = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var dispositivos;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, ManutencaoPreventiva_1.ManutencaoPreventivaModel.getDispositivosManutencao()];
            case 1:
                dispositivos = _a.sent();
                res.json({
                    success: true,
                    message: 'Dispositivos para manutenção obtidos com sucesso',
                    data: dispositivos,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Buscar detalhes do dispositivo
exports.getDispositivoDetalhes = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var dispositivoId, query, executeQuery, results, dispositivo, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                dispositivoId = parseInt(req.params.dispositivoId);
                if (isNaN(dispositivoId)) {
                    res.status(400).json({
                        success: false,
                        message: 'ID do dispositivo inválido',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                query = "\n      SELECT \n        d.dis_id,\n        d.dis_descricao,\n        d.dis_codigo_sap,\n        d.dis_com_manutencao,\n        d.dis_info_manutencao,\n        dim.dim_id,\n        dim.dim_tipo_intervalo,\n        dim.dim_intervalo_dias,\n        dim.dim_intervalo_placas,\n        dim.dim_placas_executadas,\n        dim.dim_formulario_manutencao,\n        dim.dim_data_ultima_manutencao,\n        c.cli_nome as cliente_nome,\n        fmp.fmp_descricao as formulario_descricao\n      FROM dispositivos d\n      LEFT JOIN dispositivo_info_manutencao dim ON d.dis_info_manutencao = dim.dim_id\n      LEFT JOIN clientes c ON d.dis_cliente = c.cli_id\n      LEFT JOIN formularios_manutencao_preventiva fmp ON dim.dim_formulario_manutencao = fmp.fmp_id\n      WHERE d.dis_id = ? AND d.dis_status = 1\n    ";
                executeQuery = require('../config/database').executeQuery;
                return [4 /*yield*/, executeQuery(query, [dispositivoId])];
            case 2:
                results = _a.sent();
                if (!Array.isArray(results) || results.length === 0) {
                    res.status(404).json({
                        success: false,
                        message: 'Dispositivo não encontrado ou inativo',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                dispositivo = results[0];
                // Validar se dispositivo tem manutenção ativa
                if (!dispositivo.dis_com_manutencao) {
                    res.status(400).json({
                        success: false,
                        message: 'Dispositivo não está configurado para manutenção preventiva',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Detalhes do dispositivo obtidos com sucesso',
                    data: {
                        dis_id: dispositivo.dis_id,
                        dis_descricao: dispositivo.dis_descricao,
                        dis_codigo_sap: dispositivo.dis_codigo_sap,
                        cliente_nome: dispositivo.cliente_nome,
                        dim_formulario_manutencao: dispositivo.dim_formulario_manutencao || 1,
                        formulario_descricao: dispositivo.formulario_descricao || 'Formulário Básico',
                        dim_tipo_intervalo: dispositivo.dim_tipo_intervalo,
                        dim_intervalo_dias: dispositivo.dim_intervalo_dias,
                        dim_intervalo_placas: dispositivo.dim_intervalo_placas,
                        dim_placas_executadas: dispositivo.dim_placas_executadas,
                        dim_data_ultima_manutencao: dispositivo.dim_data_ultima_manutencao
                    },
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.error('Erro ao buscar detalhes do dispositivo:', error_1);
                res.status(500).json({
                    success: false,
                    message: 'Erro interno do servidor ao buscar detalhes do dispositivo',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Verificar manutenção em andamento para usuário
exports.verificarManutencaoAndamento = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, manutencao;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Usuário não identificado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, ManutencaoPreventiva_1.ManutencaoPreventivaModel.verificarManutencaoAndamento(userId)];
            case 1:
                manutencao = _b.sent();
                res.json({
                    success: true,
                    message: manutencao ? 'Manutenção em andamento encontrada' : 'Nenhuma manutenção em andamento',
                    data: manutencao,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Iniciar manutenção
exports.iniciarManutencao = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, dispositivoId, executeQuery, dispositivoQuery, dispositivoResults, dispositivo, ciclosTotais, dadosManutencao, result, io, error_2;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Usuário não identificado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                dispositivoId = req.body.dispositivoId;
                // Validação básica
                if (!dispositivoId) {
                    res.status(400).json({
                        success: false,
                        message: 'Dispositivo é obrigatório',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
                console.log("\uD83D\uDD27 Iniciando manuten\u00E7\u00E3o automatizada - Dispositivo: " + dispositivoId + ", Usu\u00E1rio: " + userId);
                executeQuery = require('../config/database').executeQuery;
                dispositivoQuery = "\n      SELECT \n        d.dis_id,\n        d.dis_descricao,\n        d.dis_codigo_sap,\n        d.dis_com_manutencao,\n        d.dis_info_manutencao,\n        d.dis_ciclos_executados,\n        COALESCE(dim.dim_tipo_intervalo, 'DIA') as dim_tipo_intervalo,\n        COALESCE(dim.dim_intervalo_dias, 30) as dim_intervalo_dias,\n        COALESCE(dim.dim_intervalo_placas, 1000) as dim_intervalo_placas,\n        COALESCE(dim.dim_placas_executadas, 0) as dim_placas_executadas,\n        dim.dim_data_ultima_manutencao,\n        COALESCE(dim.dim_formulario_manutencao, 1) as dim_formulario_manutencao,\n        c.cli_nome as cliente_nome,\n        COALESCE(fmp.fmp_descricao, 'Formul\u00E1rio B\u00E1sico') as formulario_descricao\n      FROM dispositivos d\n      LEFT JOIN dispositivo_info_manutencao dim ON d.dis_info_manutencao = dim.dim_id\n      LEFT JOIN clientes c ON d.dis_cliente = c.cli_id\n      LEFT JOIN formularios_manutencao_preventiva fmp ON dim.dim_formulario_manutencao = fmp.fmp_id\n      WHERE d.dis_id = ? AND d.dis_status = 1\n    ";
                console.log("\uD83D\uDCCA Buscando dados do dispositivo " + dispositivoId + "...");
                return [4 /*yield*/, executeQuery(dispositivoQuery, [dispositivoId])];
            case 2:
                dispositivoResults = _c.sent();
                if (!Array.isArray(dispositivoResults) || dispositivoResults.length === 0) {
                    console.log("\u274C Dispositivo " + dispositivoId + " n\u00E3o encontrado");
                    res.status(404).json({
                        success: false,
                        message: 'Dispositivo não encontrado ou inativo',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                dispositivo = dispositivoResults[0];
                console.log("\u2705 Dispositivo encontrado:", {
                    id: dispositivo.dis_id,
                    descricao: dispositivo.dis_descricao,
                    comManutencao: dispositivo.dis_com_manutencao,
                    tipoIntervalo: dispositivo.dim_tipo_intervalo,
                    ciclosExecutados: dispositivo.dis_ciclos_executados
                });
                // 2. Validar se dispositivo tem manutenção ativa
                if (!dispositivo.dis_com_manutencao) {
                    console.log("\u274C Dispositivo " + dispositivoId + " n\u00E3o configurado para manuten\u00E7\u00E3o");
                    res.status(400).json({
                        success: false,
                        message: 'Dispositivo não está configurado para manutenção preventiva',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                ciclosTotais = dispositivo.dis_ciclos_executados || 0;
                console.log("\uD83D\uDCCA Ciclos totais do dispositivo (dis_ciclos_executados): " + ciclosTotais);
                dadosManutencao = {
                    dispositivoId: dispositivoId,
                    colaboradorId: userId,
                    ciclosTotais: ciclosTotais,
                    dataUltimaManutencao: dispositivo.dim_data_ultima_manutencao || null,
                    tipoIntervalo: dispositivo.dim_tipo_intervalo,
                    intervaloDias: dispositivo.dim_intervalo_dias,
                    intervaloPlacas: dispositivo.dim_intervalo_placas,
                    placasExecutadas: dispositivo.dim_placas_executadas
                };
                console.log("\uD83D\uDE80 Dados preparados para manuten\u00E7\u00E3o:", dadosManutencao);
                return [4 /*yield*/, ManutencaoPreventiva_1.ManutencaoPreventivaModel.iniciarManutencaoSegura(dadosManutencao)];
            case 3:
                result = _c.sent();
                if (!result.success) {
                    console.log("\u274C Falha ao iniciar manuten\u00E7\u00E3o: " + result.error);
                    res.status(409).json({
                        success: false,
                        message: result.error,
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                console.log("\u2705 Manuten\u00E7\u00E3o iniciada com sucesso - ID: " + result.manutencaoId);
                // 6. Emitir evento via WebSocket se disponível
                try {
                    io = req.app.get('io');
                    if (io) {
                        io.emit('manutencao_iniciada', {
                            dispositivoId: dispositivoId,
                            manutencaoId: result.manutencaoId,
                            colaboradorId: userId,
                            dispositivoDescricao: dispositivo.dis_descricao,
                            timestamp: new Date().toISOString()
                        });
                        console.log("\uD83D\uDCE1 Evento WebSocket enviado");
                    }
                }
                catch (ioError) {
                    console.log("\u26A0\uFE0F Erro ao enviar WebSocket (n\u00E3o cr\u00EDtico):", ioError);
                }
                // 7. Resposta de sucesso
                res.status(201).json({
                    success: true,
                    message: 'Manutenção iniciada com sucesso',
                    data: {
                        id: result.manutencaoId,
                        dispositivo: {
                            id: dispositivo.dis_id,
                            descricao: dispositivo.dis_descricao,
                            formulario: dispositivo.formulario_descricao,
                            ciclosTotais: ciclosTotais,
                            cliente: dispositivo.cliente_nome,
                            codigoSap: dispositivo.dis_codigo_sap
                        }
                    },
                    timestamp: new Date().toISOString()
                });
                console.log("\uD83C\uDF89 Manuten\u00E7\u00E3o automatizada iniciada com sucesso!", {
                    manutencaoId: result.manutencaoId,
                    dispositivo: dispositivo.dis_descricao,
                    colaborador: userId,
                    ciclosTotais: ciclosTotais,
                    formulario: dispositivo.formulario_descricao,
                    cliente: dispositivo.cliente_nome
                });
                return [3 /*break*/, 5];
            case 4:
                error_2 = _c.sent();
                console.error('❌ Erro crítico ao iniciar manutenção:', error_2);
                // Log detalhado para debug
                if (error_2 instanceof Error) {
                    console.error('Detalhes do erro:', {
                        name: error_2.name,
                        message: error_2.message,
                        stack: (_b = error_2.stack) === null || _b === void 0 ? void 0 : _b.split('\n').slice(0, 5).join('\n') // Limitar stack trace
                    });
                }
                res.status(500).json({
                    success: false,
                    message: 'Erro interno do servidor ao iniciar manutenção',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Finalizar manutenção
exports.finalizarManutencao = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var manutencaoId, _a, observacao, respostas, success;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                manutencaoId = parseInt(req.params.id);
                _a = req.body, observacao = _a.observacao, respostas = _a.respostas;
                if (isNaN(manutencaoId)) {
                    res.status(400).json({
                        success: false,
                        message: 'ID da manutenção inválido',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                if (!observacao || !observacao.trim()) {
                    res.status(400).json({
                        success: false,
                        message: 'Observação é obrigatória',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, ManutencaoPreventiva_1.ManutencaoPreventivaModel.finalizarManutencao(manutencaoId, observacao.trim(), respostas || [])];
            case 1:
                success = _b.sent();
                if (!success) {
                    res.status(500).json({
                        success: false,
                        message: 'Erro ao finalizar manutenção',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Manutenção finalizada com sucesso',
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Endpoint para verificar status de dispositivos
exports.getStatusDispositivos = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var estatisticas;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, ManutencaoPreventiva_1.ManutencaoPreventivaModel.getEstatisticasDispositivos()];
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
// Cancelar manutenção
exports.cancelarManutencao = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var manutencaoId, success;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                manutencaoId = parseInt(req.params.id);
                if (isNaN(manutencaoId)) {
                    res.status(400).json({
                        success: false,
                        message: 'ID da manutenção inválido',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, ManutencaoPreventiva_1.ManutencaoPreventivaModel.cancelarManutencao(manutencaoId)];
            case 1:
                success = _a.sent();
                if (!success) {
                    res.status(404).json({
                        success: false,
                        message: 'Manutenção não encontrada',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Manutenção cancelada com sucesso',
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Buscar histórico de manutenções
exports.getHistoricoManutencoes = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, dataInicio, dataFim, dispositivo, colaborador, status, filtros, manutencoes;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, dataInicio = _a.dataInicio, dataFim = _a.dataFim, dispositivo = _a.dispositivo, colaborador = _a.colaborador, status = _a.status;
                filtros = {
                    dataInicio: dataInicio,
                    dataFim: dataFim,
                    dispositivo: dispositivo ? parseInt(dispositivo) : undefined,
                    colaborador: colaborador ? parseInt(colaborador) : undefined,
                    status: status ? parseInt(status) : undefined
                };
                return [4 /*yield*/, ManutencaoPreventiva_1.ManutencaoPreventivaModel.getHistoricoManutencoes(filtros)];
            case 1:
                manutencoes = _b.sent();
                res.json({
                    success: true,
                    message: 'Histórico de manutenções obtido com sucesso',
                    data: manutencoes,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Buscar detalhes de uma manutenção
exports.getDetalhesManutencao = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var manutencaoId, detalhes;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                manutencaoId = parseInt(req.params.id);
                if (isNaN(manutencaoId)) {
                    res.status(400).json({
                        success: false,
                        message: 'ID da manutenção inválido',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, ManutencaoPreventiva_1.ManutencaoPreventivaModel.getDetalhesManutencao(manutencaoId)];
            case 1:
                detalhes = _a.sent();
                if (!detalhes) {
                    res.status(404).json({
                        success: false,
                        message: 'Manutenção não encontrada',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Detalhes da manutenção obtidos com sucesso',
                    data: detalhes,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Controllers para Formulários
exports.getFormulariosManutencao = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var formularios;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, ManutencaoPreventiva_1.FormularioManutencaoModel.getFormularios()];
            case 1:
                formularios = _a.sent();
                res.json({
                    success: true,
                    message: 'Formulários obtidos com sucesso',
                    data: formularios,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
exports.getItensFormulario = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var formularioId, itens;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                formularioId = parseInt(req.params.formularioId);
                if (isNaN(formularioId)) {
                    res.status(400).json({
                        success: false,
                        message: 'ID do formulário inválido',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, ManutencaoPreventiva_1.FormularioManutencaoModel.getItensFormulario(formularioId)];
            case 1:
                itens = _a.sent();
                res.json({
                    success: true,
                    message: 'Itens do formulário obtidos com sucesso',
                    data: itens,
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
exports.criarFormulario = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, _a, descricao, itens, formularioId;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Usuário não identificado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                _a = req.body, descricao = _a.descricao, itens = _a.itens;
                if (!descricao || !descricao.trim()) {
                    res.status(400).json({
                        success: false,
                        message: 'Descrição do formulário é obrigatória',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                if (!itens || !Array.isArray(itens) || itens.length === 0) {
                    res.status(400).json({
                        success: false,
                        message: 'Formulário deve ter pelo menos um item',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, ManutencaoPreventiva_1.FormularioManutencaoModel.criarFormulario(descricao.trim(), userId, itens)];
            case 1:
                formularioId = _c.sent();
                res.status(201).json({
                    success: true,
                    message: 'Formulário criado com sucesso',
                    data: { id: formularioId },
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
exports.atualizarFormulario = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, formularioId, _a, descricao, itensInserir, itensAtualizar, itensRemover, success;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
                formularioId = parseInt(req.params.id);
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Usuário não identificado',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                if (isNaN(formularioId)) {
                    res.status(400).json({
                        success: false,
                        message: 'ID do formulário inválido',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                _a = req.body, descricao = _a.descricao, itensInserir = _a.itensInserir, itensAtualizar = _a.itensAtualizar, itensRemover = _a.itensRemover;
                if (!descricao || !descricao.trim()) {
                    res.status(400).json({
                        success: false,
                        message: 'Descrição do formulário é obrigatória',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, ManutencaoPreventiva_1.FormularioManutencaoModel.atualizarFormulario(formularioId, descricao.trim(), userId, itensInserir || [], itensAtualizar || [], itensRemover || [])];
            case 1:
                success = _c.sent();
                if (!success) {
                    res.status(500).json({
                        success: false,
                        message: 'Erro ao atualizar formulário',
                        timestamp: new Date().toISOString()
                    });
                    return [2 /*return*/];
                }
                res.json({
                    success: true,
                    message: 'Formulário atualizado com sucesso',
                    timestamp: new Date().toISOString()
                });
                return [2 /*return*/];
        }
    });
}); });
// Relatórios e Métricas
exports.getMetricasManutencao = errorHandler_1.asyncHandler(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, dataInicio, dataFim, metricas, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, dataInicio = _a.dataInicio, dataFim = _a.dataFim;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                console.log('🎯 Iniciando busca de métricas...', { dataInicio: dataInicio, dataFim: dataFim });
                return [4 /*yield*/, ManutencaoPreventiva_1.ManutencaoPreventivaModel.getMetricas(dataInicio, dataFim)];
            case 2:
                metricas = _b.sent();
                console.log('✅ Métricas obtidas com sucesso:', {
                    totalManutencoes: metricas.totalManutencoes,
                    tempoMedio: metricas.tempoMedioMinutos,
                    pendentes: metricas.manutencoesPendentes,
                    dispositivos: metricas.totalDispositivos
                });
                res.json({
                    success: true,
                    message: 'Métricas obtidas com sucesso',
                    data: metricas,
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _b.sent();
                console.error('❌ Erro ao gerar métricas:', error_3);
                res.status(500).json({
                    success: false,
                    message: 'Erro interno do servidor ao gerar métricas',
                    timestamp: new Date().toISOString()
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Função auxiliar para evolução mensal
function getEvolucaoMensal(dataInicio, dataFim) {
    return __awaiter(this, void 0, void 0, function () {
        var query, params, executeQuery, results, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    query = "\n      SELECT \n        DATE_FORMAT(lmd_data_hora_inicio, '%Y-%m') as mes,\n        COUNT(*) as total,\n        AVG(TIMESTAMPDIFF(MINUTE, lmd_data_hora_inicio, lmd_data_hora_fim)) as tempo_medio\n      FROM log_manutencao_dispositivo\n      WHERE lmd_status = 2 \n      " + (dataInicio ? 'AND DATE(lmd_data_hora_inicio) >= ?' : '') + "\n      " + (dataFim ? 'AND DATE(lmd_data_hora_inicio) <= ?' : '') + "\n      GROUP BY DATE_FORMAT(lmd_data_hora_inicio, '%Y-%m')\n      ORDER BY mes ASC\n    ";
                    params = [];
                    if (dataInicio)
                        params.push(dataInicio);
                    if (dataFim)
                        params.push(dataFim);
                    executeQuery = require('../config/database').executeQuery;
                    return [4 /*yield*/, executeQuery(query, params)];
                case 1:
                    results = _a.sent();
                    return [2 /*return*/, Array.isArray(results) ? results : []];
                case 2:
                    error_4 = _a.sent();
                    console.error('Erro ao calcular evolução mensal:', error_4);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
