"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.DebugManutencaoModel = exports.FormularioManutencaoModel = exports.ManutencaoPreventivaModel = void 0;
var database_1 = require("../config/database");
var ManutencaoPreventivaModel = /** @class */ (function () {
    function ManutencaoPreventivaModel() {
    }
    // Buscar dispositivos que precisam de manutenção
    ManutencaoPreventivaModel.getDispositivosManutencao = function () {
        return __awaiter(this, void 0, Promise, function () {
            var query, results, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT \n          d.dis_id,\n          d.dis_descricao,\n          d.dis_com_manutencao,\n          d.dis_info_manutencao,\n          COALESCE(dim.dim_tipo_intervalo, 'DIA') as dim_tipo_intervalo,\n          COALESCE(dim.dim_intervalo_dias, 30) as dim_intervalo_dias,\n          COALESCE(dim.dim_intervalo_placas, 1000) as dim_intervalo_placas,\n          COALESCE(dim.dim_placas_executadas, 0) as dim_placas_executadas,\n          dim.dim_data_ultima_manutencao,\n          CASE \n            WHEN COALESCE(dim.dim_tipo_intervalo, 'DIA') = 'DIA' THEN \n              COALESCE(DATEDIFF(NOW(), dim.dim_data_ultima_manutencao), 9999)\n            ELSE \n              COALESCE(dim.dim_placas_executadas, 0)\n          END as dias_desde_ultima,\n          CASE \n            WHEN COALESCE(dim.dim_tipo_intervalo, 'DIA') = 'DIA' THEN \n              COALESCE(DATEDIFF(NOW(), dim.dim_data_ultima_manutencao), 9999) >= COALESCE(dim.dim_intervalo_dias, 30)\n            ELSE \n              COALESCE(dim.dim_placas_executadas, 0) >= COALESCE(dim.dim_intervalo_placas, 1000)\n          END as necessita_manutencao,\n          -- C\u00E1lculo da porcentagem de uso/manuten\u00E7\u00E3o\n          CASE \n            WHEN COALESCE(dim.dim_tipo_intervalo, 'DIA') = 'DIA' THEN \n              ROUND((COALESCE(DATEDIFF(NOW(), dim.dim_data_ultima_manutencao), 0) / COALESCE(dim.dim_intervalo_dias, 30)) * 100, 2)\n            ELSE \n              ROUND((COALESCE(dim.dim_placas_executadas, 0) / COALESCE(dim.dim_intervalo_placas, 1000)) * 100, 2)\n          END as percentual_manutencao\n        FROM dispositivos d\n        LEFT JOIN dispositivo_info_manutencao dim ON d.dis_info_manutencao = dim.dim_id\n        WHERE d.dis_com_manutencao = 1 \n        AND d.dis_status = 1\n        ORDER BY necessita_manutencao DESC, percentual_manutencao DESC\n    ";
                        return [4 /*yield*/, database_1.executeQuery(query)];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results) ? results : []];
                    case 2:
                        error_1 = _a.sent();
                        console.error('Erro ao buscar dispositivos para manutenção:', error_1);
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Verificar se há manutenção em andamento para um usuário
    ManutencaoPreventivaModel.verificarManutencaoAndamento = function (userId) {
        return __awaiter(this, void 0, Promise, function () {
            var query, results, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT \n          lmd.*,\n          d.dis_descricao as dispositivo_descricao,\n          c.col_nome as colaborador_nome,\n          TIMESTAMPDIFF(MINUTE, lmd_data_hora_inicio, NOW()) as duracao_total\n        FROM log_manutencao_dispositivo lmd\n        LEFT JOIN dispositivos d ON lmd.lmd_dispositivo = d.dis_id\n        LEFT JOIN colaboradores c ON lmd.lmd_colaborador = c.col_id\n        WHERE lmd.lmd_colaborador = ? AND lmd.lmd_status = 1\n        ORDER BY lmd.lmd_data_hora_inicio DESC\n        LIMIT 1\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [userId])];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results) && results.length > 0 ? results[0] : null];
                    case 2:
                        error_2 = _a.sent();
                        console.error('Erro ao verificar manutenção em andamento:', error_2);
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Iniciar manutenção
    ManutencaoPreventivaModel.iniciarManutencao = function (data) {
        return __awaiter(this, void 0, Promise, function () {
            var connection, insertQuery, result, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, database_1.pool.getConnection()];
                    case 1:
                        connection = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 6, 8, 9]);
                        return [4 /*yield*/, connection.beginTransaction()];
                    case 3:
                        _a.sent();
                        insertQuery = "\n        INSERT INTO log_manutencao_dispositivo (\n          lmd_dispositivo,\n          lmd_data_hora_inicio,\n          lmd_tipo_manutencao,\n          lmd_ciclos_totais_executados,\n          lmd_data_hora_ultima_manutencao,\n          lmd_tipo_intervalo_manutencao,\n          lmd_intervalo_dias,\n          lmd_intervalo_placas,\n          lmd_placas_executadas,\n          lmd_colaborador,\n          lmd_status\n        ) VALUES (?, NOW(), 'PREVENTIVA', ?, ?, ?, ?, ?, ?, ?, 1)\n      ";
                        return [4 /*yield*/, connection.execute(insertQuery, [
                                data.dispositivoId,
                                data.ciclosTotais,
                                data.dataUltimaManutencao,
                                data.tipoIntervalo,
                                data.intervaloDias,
                                data.intervaloPlacas,
                                data.placasExecutadas,
                                data.colaboradorId
                            ])];
                    case 4:
                        result = _a.sent();
                        return [4 /*yield*/, connection.commit()];
                    case 5:
                        _a.sent();
                        return [2 /*return*/, result[0].insertId];
                    case 6:
                        error_3 = _a.sent();
                        return [4 /*yield*/, connection.rollback()];
                    case 7:
                        _a.sent();
                        throw error_3;
                    case 8:
                        connection.release();
                        return [7 /*endfinally*/];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    // Finalizar manutenção
    ManutencaoPreventivaModel.finalizarManutencao = function (manutencaoId, observacao, respostas) {
        return __awaiter(this, void 0, Promise, function () {
            var connection, insertRespostasQuery, values, updateLogQuery, updateDispositivoQuery, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, database_1.pool.getConnection()];
                    case 1:
                        connection = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 9, 11, 12]);
                        return [4 /*yield*/, connection.beginTransaction()];
                    case 3:
                        _a.sent();
                        if (!(respostas.length > 0)) return [3 /*break*/, 5];
                        insertRespostasQuery = "\n          INSERT INTO resposta_item_formulario (rif_item, rif_log_manutencao, rif_ok, rif_observacao)\n          VALUES ?\n        ";
                        values = respostas.map(function (r) { return [
                            r.rif_item,
                            r.rif_log_manutencao,
                            r.rif_ok === 1 ? Buffer.from([1]) : Buffer.from([0]),
                            r.rif_observacao.toUpperCase()
                        ]; });
                        return [4 /*yield*/, connection.query(insertRespostasQuery, [values])];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        updateLogQuery = "\n        UPDATE log_manutencao_dispositivo \n        SET lmd_data_hora_fim = NOW(),\n            lmd_observacao = UPPER(?),\n            lmd_status = 2\n        WHERE lmd_id = ?\n      ";
                        return [4 /*yield*/, connection.execute(updateLogQuery, [observacao, manutencaoId])];
                    case 6:
                        _a.sent();
                        updateDispositivoQuery = "\n        UPDATE dispositivo_info_manutencao dim\n        INNER JOIN log_manutencao_dispositivo lmd ON lmd.lmd_dispositivo = (\n          SELECT dis_id FROM dispositivos WHERE dis_info_manutencao = dim.dim_id\n        )\n        SET dim.dim_placas_executadas = 0,\n            dim.dim_data_ultima_manutencao = NOW()\n        WHERE lmd.lmd_id = ?\n      ";
                        return [4 /*yield*/, connection.execute(updateDispositivoQuery, [manutencaoId])];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, connection.commit()];
                    case 8:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 9:
                        error_4 = _a.sent();
                        return [4 /*yield*/, connection.rollback()];
                    case 10:
                        _a.sent();
                        throw error_4;
                    case 11:
                        connection.release();
                        return [7 /*endfinally*/];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    // Cancelar manutenção
    ManutencaoPreventivaModel.cancelarManutencao = function (manutencaoId) {
        return __awaiter(this, void 0, Promise, function () {
            var deleteQuery, result, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        deleteQuery = "DELETE FROM log_manutencao_dispositivo WHERE lmd_id = ?";
                        return [4 /*yield*/, database_1.executeQuery(deleteQuery, [manutencaoId])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.affectedRows > 0];
                    case 2:
                        error_5 = _a.sent();
                        console.error('Erro ao cancelar manutenção:', error_5);
                        throw error_5;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Buscar histórico de manutenções
    ManutencaoPreventivaModel.getHistoricoManutencoes = function (filtros) {
        if (filtros === void 0) { filtros = {}; }
        return __awaiter(this, void 0, Promise, function () {
            var whereClause, params, query, results, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        whereClause = 'WHERE 1=1';
                        params = [];
                        if (filtros.dataInicio) {
                            whereClause += ' AND DATE(lmd_data_hora_inicio) >= ?';
                            params.push(filtros.dataInicio);
                        }
                        if (filtros.dataFim) {
                            whereClause += ' AND DATE(lmd_data_hora_inicio) <= ?';
                            params.push(filtros.dataFim);
                        }
                        if (filtros.dispositivo) {
                            whereClause += ' AND lmd_dispositivo = ?';
                            params.push(filtros.dispositivo);
                        }
                        if (filtros.colaborador) {
                            whereClause += ' AND lmd_colaborador = ?';
                            params.push(filtros.colaborador);
                        }
                        if (filtros.status) {
                            whereClause += ' AND lmd_status = ?';
                            params.push(filtros.status);
                        }
                        else {
                            whereClause += ' AND lmd_status IN (2, 3)'; // Apenas finalizadas e canceladas por padrão
                        }
                        query = "\n        SELECT \n          lmd.*,\n          d.dis_descricao as dispositivo_descricao,\n          c.col_nome as colaborador_nome,\n          TIMESTAMPDIFF(MINUTE, lmd_data_hora_inicio, COALESCE(lmd_data_hora_fim, NOW())) as duracao_total\n        FROM log_manutencao_dispositivo lmd\n        LEFT JOIN dispositivos d ON lmd.lmd_dispositivo = d.dis_id\n        LEFT JOIN colaboradores c ON lmd.lmd_colaborador = c.col_id\n        " + whereClause + "\n        ORDER BY lmd_data_hora_inicio DESC\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, params)];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results) ? results : []];
                    case 2:
                        error_6 = _a.sent();
                        console.error('Erro ao buscar histórico de manutenções:', error_6);
                        throw error_6;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Buscar detalhes de uma manutenção específica
    ManutencaoPreventivaModel.getDetalhesManutencao = function (manutencaoId) {
        return __awaiter(this, void 0, Promise, function () {
            var manutencaoQuery, manutencaoResult, respostasQuery, respostasResult, respostasConvertidas, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        manutencaoQuery = "\n        SELECT \n          lmd.*,\n          d.dis_descricao as dispositivo_descricao,\n          c.col_nome as colaborador_nome,\n          TIMESTAMPDIFF(MINUTE, lmd_data_hora_inicio, COALESCE(lmd_data_hora_fim, NOW())) as duracao_total\n        FROM log_manutencao_dispositivo lmd\n        LEFT JOIN dispositivos d ON lmd.lmd_dispositivo = d.dis_id\n        LEFT JOIN colaboradores c ON lmd.lmd_colaborador = c.col_id\n        WHERE lmd.lmd_id = ?\n      ";
                        return [4 /*yield*/, database_1.executeQuery(manutencaoQuery, [manutencaoId])];
                    case 1:
                        manutencaoResult = _a.sent();
                        if (!Array.isArray(manutencaoResult) || manutencaoResult.length === 0) {
                            return [2 /*return*/, null];
                        }
                        respostasQuery = "\n        SELECT \n          rif.*,\n          ifm.ifm_descricao as item_descricao\n        FROM resposta_item_formulario rif\n        LEFT JOIN itens_formulario_manutencao ifm ON rif.rif_item = ifm.ifm_id\n        WHERE rif.rif_log_manutencao = ?\n        ORDER BY ifm.ifm_posicao\n      ";
                        return [4 /*yield*/, database_1.executeQuery(respostasQuery, [manutencaoId])];
                    case 2:
                        respostasResult = _a.sent();
                        console.log('🔍 Respostas brutas do banco:', respostasResult);
                        respostasConvertidas = Array.isArray(respostasResult)
                            ? respostasResult.map(function (r) {
                                var rif_ok_final = r.rif_ok;
                                // Converter diferentes formatos possíveis
                                if (Buffer.isBuffer(r.rif_ok)) {
                                    // Para Buffer, verifique o valor convertido para número
                                    rif_ok_final = Number(r.rif_ok) ? 1 : 0;
                                }
                                else if (typeof r.rif_ok === 'string') {
                                    rif_ok_final = r.rif_ok === '1' ? 1 : 0;
                                }
                                else if (typeof r.rif_ok === 'boolean') {
                                    rif_ok_final = r.rif_ok ? 1 : 0;
                                }
                                else if (typeof r.rif_ok === 'number') {
                                    rif_ok_final = r.rif_ok ? 1 : 0;
                                }
                                console.log("\uD83D\uDCDD Item " + r.rif_item + ": original=" + r.rif_ok + ", convertido=" + rif_ok_final);
                                return __assign(__assign({}, r), { rif_ok: rif_ok_final });
                            })
                            : [];
                        console.log('✅ Respostas convertidas finais:', respostasConvertidas);
                        return [2 /*return*/, {
                                manutencao: manutencaoResult[0],
                                respostas: respostasConvertidas
                            }];
                    case 3:
                        error_7 = _a.sent();
                        console.error('Erro ao buscar detalhes da manutenção:', error_7);
                        throw error_7;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // Verificar se dispositivo já está em manutenção
    ManutencaoPreventivaModel.verificarDispositivoEmManutencao = function (dispositivoId) {
        return __awaiter(this, void 0, Promise, function () {
            var query, results, count, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT COUNT(*) as count\n        FROM log_manutencao_dispositivo \n        WHERE lmd_dispositivo = ? AND lmd_status = 1\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [dispositivoId])];
                    case 1:
                        results = _a.sent();
                        count = Array.isArray(results) && results.length > 0 ? results[0].count : 0;
                        return [2 /*return*/, count > 0];
                    case 2:
                        error_8 = _a.sent();
                        console.error('Erro ao verificar dispositivo em manutenção:', error_8);
                        throw error_8;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Verificar se usuário já está em atendimento
    ManutencaoPreventivaModel.verificarUsuarioEmAtendimento = function (userId) {
        return __awaiter(this, void 0, Promise, function () {
            var query, results, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT \n          lmd.*,\n          d.dis_descricao as dispositivo_descricao,\n          c.col_nome as colaborador_nome,\n          TIMESTAMPDIFF(MINUTE, lmd_data_hora_inicio, NOW()) as duracao_total\n        FROM log_manutencao_dispositivo lmd\n        LEFT JOIN dispositivos d ON lmd.lmd_dispositivo = d.dis_id\n        LEFT JOIN colaboradores c ON lmd.lmd_colaborador = c.col_id\n        WHERE lmd.lmd_colaborador = ? AND lmd.lmd_status  = 1\n        LIMIT 1\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [userId])];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results) && results.length > 0 ? results[0] : null];
                    case 2:
                        error_9 = _a.sent();
                        console.error('Erro ao verificar usuário em atendimento:', error_9);
                        throw error_9;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Iniciar manutenção com verificações de concorrência
    ManutencaoPreventivaModel.iniciarManutencaoSegura = function (data) {
        return __awaiter(this, void 0, Promise, function () {
            var connection, dispositivoEmManutencao, usuarioEmAtendimento, insertQuery, result, error_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, database_1.pool.getConnection()];
                    case 1:
                        connection = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 12, 14, 15]);
                        return [4 /*yield*/, connection.beginTransaction()];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.verificarDispositivoEmManutencao(data.dispositivoId)];
                    case 4:
                        dispositivoEmManutencao = _a.sent();
                        if (!dispositivoEmManutencao) return [3 /*break*/, 6];
                        return [4 /*yield*/, connection.rollback()];
                    case 5:
                        _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: 'Este dispositivo já está em manutenção por outro usuário.'
                            }];
                    case 6: return [4 /*yield*/, this.verificarUsuarioEmAtendimento(data.colaboradorId)];
                    case 7:
                        usuarioEmAtendimento = _a.sent();
                        if (!usuarioEmAtendimento) return [3 /*break*/, 9];
                        return [4 /*yield*/, connection.rollback()];
                    case 8:
                        _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: "Voc\u00EA j\u00E1 est\u00E1 atendendo o dispositivo: " + usuarioEmAtendimento.dispositivo_descricao
                            }];
                    case 9:
                        insertQuery = "\n        INSERT INTO log_manutencao_dispositivo (\n          lmd_dispositivo,\n          lmd_data_hora_inicio,\n          lmd_tipo_manutencao,\n          lmd_ciclos_totais_executados,\n          lmd_data_hora_ultima_manutencao,\n          lmd_tipo_intervalo_manutencao,\n          lmd_intervalo_dias,\n          lmd_intervalo_placas,\n          lmd_placas_executadas,\n          lmd_colaborador,\n          lmd_status\n        ) VALUES (?, NOW(), 'PREVENTIVA', ?, ?, ?, ?, ?, ?, ?, 1)\n      ";
                        return [4 /*yield*/, connection.execute(insertQuery, [
                                data.dispositivoId,
                                data.ciclosTotais,
                                data.dataUltimaManutencao,
                                data.tipoIntervalo,
                                data.intervaloDias,
                                data.intervaloPlacas,
                                data.placasExecutadas,
                                data.colaboradorId
                            ])];
                    case 10:
                        result = _a.sent();
                        return [4 /*yield*/, connection.commit()];
                    case 11:
                        _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                manutencaoId: result[0].insertId
                            }];
                    case 12:
                        error_10 = _a.sent();
                        return [4 /*yield*/, connection.rollback()];
                    case 13:
                        _a.sent();
                        console.error('Erro ao iniciar manutenção segura:', error_10);
                        // Verificar se é erro de duplicação/concorrência
                        if (error_10 instanceof Error && error_10.message.includes('Duplicate')) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Este dispositivo já foi selecionado por outro usuário. Tente novamente.'
                                }];
                        }
                        throw error_10;
                    case 14:
                        connection.release();
                        return [7 /*endfinally*/];
                    case 15: return [2 /*return*/];
                }
            });
        });
    };
    // Obter estatísticas de dispositivos
    ManutencaoPreventivaModel.getEstatisticasDispositivos = function () {
        return __awaiter(this, void 0, Promise, function () {
            var query, results, error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT \n          COUNT(*) as total,\n          SUM(CASE WHEN em_manutencao.lmd_id IS NOT NULL THEN 1 ELSE 0 END) as em_manutencao,\n          SUM(CASE WHEN necessita_manutencao THEN 1 ELSE 0 END) as necessitam_manutencao,\n          SUM(CASE WHEN NOT necessita_manutencao AND em_manutencao.lmd_id IS NULL THEN 1 ELSE 0 END) as em_dia\n        FROM (\n          SELECT \n            d.dis_id,\n            CASE \n              WHEN COALESCE(dim.dim_tipo_intervalo, 'DIA') = 'DIA' THEN \n                COALESCE(DATEDIFF(NOW(), dim.dim_data_ultima_manutencao), 9999) >= COALESCE(dim.dim_intervalo_dias, 30)\n              ELSE \n                COALESCE(dim.dim_placas_executadas, 0) >= COALESCE(dim.dim_intervalo_placas, 1000)\n            END as necessita_manutencao\n          FROM dispositivos d\n          LEFT JOIN dispositivo_info_manutencao dim ON d.dis_info_manutencao = dim.dim_id\n          WHERE d.dis_com_manutencao = 1 AND d.dis_status = 1\n        ) dispositivos_info\n        LEFT JOIN log_manutencao_dispositivo em_manutencao ON dispositivos_info.dis_id = em_manutencao.lmd_dispositivo \n          AND em_manutencao.lmd_status = 1\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query)];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results) && results.length > 0 ? results[0] : {
                                total: 0,
                                emManutencao: 0,
                                necessitamManutencao: 0,
                                emDia: 0
                            }];
                    case 2:
                        error_11 = _a.sent();
                        console.error('Erro ao obter estatísticas:', error_11);
                        throw error_11;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Buscar métricas completas de manutenção
    ManutencaoPreventivaModel.getMetricas = function (dataInicio, dataFim) {
        return __awaiter(this, void 0, Promise, function () {
            var inicio, fim, metricasQuery, metricasResult, metricas, dispositivosQuery, dispositivosResult, totalDispositivos, porDispositivoQuery, porDispositivoResult, porDispositivo, porColaboradorQuery, porColaboradorResult, porColaborador, evolucaoQuery, evolucaoResult, evolucaoMensal, resultado, error_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        inicio = dataInicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
                        fim = dataFim || new Date().toISOString().split('T')[0];
                        console.log("\uD83D\uDD0D Buscando m\u00E9tricas para per\u00EDodo: " + inicio + " at\u00E9 " + fim);
                        metricasQuery = "\n          SELECT \n            COUNT(CASE WHEN lmd_status IN (2, 3) THEN 1 END) as total_manutencoes,\n            ROUND(AVG(CASE \n              WHEN lmd_status IN (2, 3) AND lmd_data_hora_fim IS NOT NULL THEN \n                TIMESTAMPDIFF(MINUTE, lmd_data_hora_inicio, lmd_data_hora_fim)\n              END)) as tempo_medio_minutos,\n            COUNT(CASE WHEN lmd_status = 1 THEN 1 END) as manutencoes_pendentes\n          FROM log_manutencao_dispositivo lmd\n          WHERE DATE(lmd_data_hora_inicio) BETWEEN ? AND ?\n        ";
                        return [4 /*yield*/, database_1.executeQuery(metricasQuery, [inicio, fim])];
                    case 1:
                        metricasResult = _a.sent();
                        metricas = Array.isArray(metricasResult) && metricasResult.length > 0 ? metricasResult[0] : {
                            total_manutencoes: 0,
                            tempo_medio_minutos: 0,
                            manutencoes_pendentes: 0
                        };
                        console.log('📊 Métricas principais:', metricas);
                        dispositivosQuery = "\n          SELECT COUNT(DISTINCT dis_id) as total_dispositivos\n          FROM dispositivos d\n          WHERE d.dis_com_manutencao = 1 AND d.dis_status = 1\n        ";
                        return [4 /*yield*/, database_1.executeQuery(dispositivosQuery)];
                    case 2:
                        dispositivosResult = _a.sent();
                        totalDispositivos = Array.isArray(dispositivosResult) && dispositivosResult.length > 0
                            ? dispositivosResult[0].total_dispositivos
                            : 0;
                        console.log('📱 Total dispositivos:', totalDispositivos);
                        porDispositivoQuery = "\n          SELECT \n            d.dis_descricao as nome,\n            COUNT(lmd.lmd_id) as total\n          FROM log_manutencao_dispositivo lmd\n          INNER JOIN dispositivos d ON lmd.lmd_dispositivo = d.dis_id\n          WHERE DATE(lmd.lmd_data_hora_inicio) BETWEEN ? AND ?\n            AND lmd.lmd_status IN (2, 3)\n          GROUP BY d.dis_id, d.dis_descricao\n          HAVING COUNT(lmd.lmd_id) > 0\n          ORDER BY total DESC\n          LIMIT 20\n        ";
                        return [4 /*yield*/, database_1.executeQuery(porDispositivoQuery, [inicio, fim])];
                    case 3:
                        porDispositivoResult = _a.sent();
                        porDispositivo = Array.isArray(porDispositivoResult) ? porDispositivoResult : [];
                        console.log('🔧 Manutenções por dispositivo:', porDispositivo.length, 'dispositivos');
                        porColaboradorQuery = "\n          SELECT \n            c.col_nome as nome,\n            COUNT(lmd.lmd_id) as total\n          FROM log_manutencao_dispositivo lmd\n          INNER JOIN colaboradores c ON lmd.lmd_colaborador = c.col_id\n          WHERE DATE(lmd.lmd_data_hora_inicio) BETWEEN ? AND ?\n            AND lmd.lmd_status IN (2, 3)\n          GROUP BY c.col_id, c.col_nome\n          HAVING COUNT(lmd.lmd_id) > 0\n          ORDER BY total DESC\n          LIMIT 20\n        ";
                        return [4 /*yield*/, database_1.executeQuery(porColaboradorQuery, [inicio, fim])];
                    case 4:
                        porColaboradorResult = _a.sent();
                        porColaborador = Array.isArray(porColaboradorResult) ? porColaboradorResult : [];
                        console.log('👥 Manutenções por colaborador:', porColaborador.length, 'colaboradores');
                        evolucaoQuery = "\n          SELECT \n            DATE_FORMAT(lmd_data_hora_inicio, '%Y-%m') as mes,\n            COUNT(lmd.lmd_id) as total,\n            ROUND(AVG(CASE \n              WHEN lmd_data_hora_fim IS NOT NULL THEN\n                TIMESTAMPDIFF(MINUTE, lmd_data_hora_inicio, lmd_data_hora_fim)\n              END)) as tempo_medio\n          FROM log_manutencao_dispositivo lmd\n          WHERE DATE(lmd_data_hora_inicio) BETWEEN ? AND ?\n            AND lmd.lmd_status IN (2, 3)\n          GROUP BY DATE_FORMAT(lmd_data_hora_inicio, '%Y-%m')\n          ORDER BY mes ASC\n        ";
                        return [4 /*yield*/, database_1.executeQuery(evolucaoQuery, [inicio, fim])];
                    case 5:
                        evolucaoResult = _a.sent();
                        evolucaoMensal = Array.isArray(evolucaoResult)
                            ? evolucaoResult.map(function (item) { return ({
                                mes: item.mes,
                                total: item.total,
                                tempo_medio: item.tempo_medio || 0
                            }); })
                            : [];
                        console.log('📈 Evolução mensal:', evolucaoMensal.length, 'meses');
                        resultado = {
                            totalManutencoes: Number(metricas.total_manutencoes) || 0,
                            tempoMedioMinutos: Number(metricas.tempo_medio_minutos) || 0,
                            manutencoesPendentes: Number(metricas.manutencoes_pendentes) || 0,
                            totalDispositivos: Number(totalDispositivos) || 0,
                            porDispositivo: porDispositivo,
                            porColaborador: porColaborador,
                            evolucaoMensal: evolucaoMensal
                        };
                        console.log('✅ Métricas finais calculadas:', {
                            totalManutencoes: resultado.totalManutencoes,
                            tempoMedio: resultado.tempoMedioMinutos,
                            pendentes: resultado.manutencoesPendentes,
                            dispositivos: resultado.totalDispositivos,
                            topDispositivos: resultado.porDispositivo.length,
                            topColaboradores: resultado.porColaborador.length,
                            mesesEvolucao: resultado.evolucaoMensal.length
                        });
                        return [2 /*return*/, resultado];
                    case 6:
                        error_12 = _a.sent();
                        console.error('❌ Erro ao buscar métricas de manutenção:', error_12);
                        throw error_12;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    return ManutencaoPreventivaModel;
}());
exports.ManutencaoPreventivaModel = ManutencaoPreventivaModel;
// models/FormularioManutencao.ts
var FormularioManutencaoModel = /** @class */ (function () {
    function FormularioManutencaoModel() {
    }
    // Buscar todos os formulários
    FormularioManutencaoModel.getFormularios = function () {
        return __awaiter(this, void 0, Promise, function () {
            var query, results, error_13;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT \n          fmp.*,\n          c.col_nome as modificador_nome\n        FROM formularios_manutencao_preventiva fmp\n        LEFT JOIN colaboradores c ON fmp.fmp_modificador = c.col_id\n        ORDER BY fmp.fmp_descricao ASC\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query)];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results) ? results : []];
                    case 2:
                        error_13 = _a.sent();
                        console.error('Erro ao buscar formulários:', error_13);
                        throw error_13;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Buscar itens de um formulário
    FormularioManutencaoModel.getItensFormulario = function (formularioId) {
        return __awaiter(this, void 0, Promise, function () {
            var query, results, error_14;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT * FROM itens_formulario_manutencao \n        WHERE ifm_formulario = ?\n        ORDER BY ifm_posicao ASC\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [formularioId])];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results) ? results : []];
                    case 2:
                        error_14 = _a.sent();
                        console.error('Erro ao buscar itens do formulário:', error_14);
                        throw error_14;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Criar novo formulário
    FormularioManutencaoModel.criarFormulario = function (descricao, modificadorId, itens) {
        return __awaiter(this, void 0, Promise, function () {
            var connection, insertFormQuery, formResult, formularioId_1, insertItensQuery, values, error_15;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, database_1.pool.getConnection()];
                    case 1:
                        connection = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 8, 10, 11]);
                        return [4 /*yield*/, connection.beginTransaction()];
                    case 3:
                        _a.sent();
                        insertFormQuery = "\n        INSERT INTO formularios_manutencao_preventiva (fmp_descricao, fmp_data_ultima_modificacao, fmp_modificador)\n        VALUES (UPPER(?), NOW(), ?)\n      ";
                        return [4 /*yield*/, connection.execute(insertFormQuery, [descricao, modificadorId])];
                    case 4:
                        formResult = _a.sent();
                        formularioId_1 = formResult[0].insertId;
                        if (!(itens.length > 0)) return [3 /*break*/, 6];
                        insertItensQuery = "\n          INSERT INTO itens_formulario_manutencao (ifm_formulario, ifm_descricao, ifm_posicao)\n          VALUES ?\n        ";
                        values = itens.map(function (item) { return [
                            formularioId_1,
                            item.descricao.toUpperCase(),
                            item.posicao
                        ]; });
                        return [4 /*yield*/, connection.query(insertItensQuery, [values])];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [4 /*yield*/, connection.commit()];
                    case 7:
                        _a.sent();
                        return [2 /*return*/, formularioId_1];
                    case 8:
                        error_15 = _a.sent();
                        return [4 /*yield*/, connection.rollback()];
                    case 9:
                        _a.sent();
                        throw error_15;
                    case 10:
                        connection.release();
                        return [7 /*endfinally*/];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    // Atualizar formulário
    FormularioManutencaoModel.atualizarFormulario = function (formularioId, descricao, modificadorId, itensInserir, itensAtualizar, itensRemover) {
        return __awaiter(this, void 0, Promise, function () {
            var connection, updateFormQuery, insertQuery, values, _i, itensAtualizar_1, item, updateQuery, deleteQuery, error_16;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, database_1.pool.getConnection()];
                    case 1:
                        connection = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 14, 16, 17]);
                        return [4 /*yield*/, connection.beginTransaction()];
                    case 3:
                        _a.sent();
                        updateFormQuery = "\n        UPDATE formularios_manutencao_preventiva \n        SET fmp_descricao = UPPER(?), fmp_data_ultima_modificacao = NOW(), fmp_modificador = ?\n        WHERE fmp_id = ?\n      ";
                        return [4 /*yield*/, connection.execute(updateFormQuery, [descricao, modificadorId, formularioId])];
                    case 4:
                        _a.sent();
                        if (!(itensInserir.length > 0)) return [3 /*break*/, 6];
                        insertQuery = "\n          INSERT INTO itens_formulario_manutencao (ifm_formulario, ifm_descricao, ifm_posicao)\n          VALUES ?\n        ";
                        values = itensInserir.map(function (item) { return [
                            formularioId,
                            item.descricao.toUpperCase(),
                            item.posicao
                        ]; });
                        return [4 /*yield*/, connection.query(insertQuery, [values])];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        _i = 0, itensAtualizar_1 = itensAtualizar;
                        _a.label = 7;
                    case 7:
                        if (!(_i < itensAtualizar_1.length)) return [3 /*break*/, 10];
                        item = itensAtualizar_1[_i];
                        updateQuery = "\n          UPDATE itens_formulario_manutencao \n          SET ifm_descricao = UPPER(?), ifm_posicao = ?\n          WHERE ifm_id = ?\n        ";
                        return [4 /*yield*/, connection.execute(updateQuery, [item.descricao, item.posicao, item.id])];
                    case 8:
                        _a.sent();
                        _a.label = 9;
                    case 9:
                        _i++;
                        return [3 /*break*/, 7];
                    case 10:
                        if (!(itensRemover.length > 0)) return [3 /*break*/, 12];
                        deleteQuery = "DELETE FROM itens_formulario_manutencao WHERE ifm_id IN (" + itensRemover.map(function () { return '?'; }).join(',') + ")";
                        return [4 /*yield*/, connection.execute(deleteQuery, itensRemover)];
                    case 11:
                        _a.sent();
                        _a.label = 12;
                    case 12: return [4 /*yield*/, connection.commit()];
                    case 13:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 14:
                        error_16 = _a.sent();
                        return [4 /*yield*/, connection.rollback()];
                    case 15:
                        _a.sent();
                        throw error_16;
                    case 16:
                        connection.release();
                        return [7 /*endfinally*/];
                    case 17: return [2 /*return*/];
                }
            });
        });
    };
    return FormularioManutencaoModel;
}());
exports.FormularioManutencaoModel = FormularioManutencaoModel;
var DebugManutencaoModel = /** @class */ (function () {
    function DebugManutencaoModel() {
    }
    DebugManutencaoModel.verificarRespostasSalvas = function (manutencaoId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, results, error_17;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT \n          rif_id,\n          rif_item,\n          rif_log_manutencao,\n          rif_ok,\n          HEX(rif_ok) as rif_ok_hex,\n          CAST(rif_ok AS UNSIGNED) as rif_ok_unsigned,\n          CASE \n            WHEN rif_ok = 0x01 THEN 'OK (1)'\n            WHEN rif_ok = 0x00 THEN 'NOK (0)'\n            ELSE 'UNKNOWN'\n          END as rif_ok_interpretado,\n          rif_observacao,\n          ifm.ifm_descricao\n        FROM resposta_item_formulario rif\n        LEFT JOIN itens_formulario_manutencao ifm ON rif.rif_item = ifm.ifm_id\n        WHERE rif.rif_log_manutencao = ?\n        ORDER BY ifm.ifm_posicao\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [manutencaoId])];
                    case 1:
                        results = _a.sent();
                        console.log('🔍 DEBUG - Respostas salvas no banco:');
                        console.table(results);
                        return [2 /*return*/, results];
                    case 2:
                        error_17 = _a.sent();
                        console.error('Erro ao verificar respostas salvas:', error_17);
                        throw error_17;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return DebugManutencaoModel;
}());
exports.DebugManutencaoModel = DebugManutencaoModel;
