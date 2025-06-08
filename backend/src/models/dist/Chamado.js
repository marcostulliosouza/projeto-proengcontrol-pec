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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.ChamadoModel = void 0;
var database_1 = require("../config/database");
var ChamadoModel = /** @class */ (function () {
    function ChamadoModel() {
    }
    // Função para enriquecer chamados com dados dos colaboradores
    ChamadoModel.enrichWithCollaborators = function (chamados) {
        return __awaiter(this, void 0, Promise, function () {
            var chamadoIds, placeholders, colaboradoresQuery, colaboradores, colaboradorMap_1, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!Array.isArray(chamados) || chamados.length === 0) {
                            return [2 /*return*/, chamados];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        chamadoIds = chamados.map(function (c) { return c.cha_id; });
                        placeholders = chamadoIds.map(function () { return '?'; }).join(',');
                        colaboradoresQuery = "\n        SELECT \n          atc.atc_chamado,\n          col.col_nome as colaborador_nome,\n          atc.atc_colaborador,\n          atc.atc_data_hora_inicio,\n          atc.atc_data_hora_termino\n        FROM atendimentos_chamados atc\n        LEFT JOIN colaboradores col ON atc.atc_colaborador = col.col_id\n        WHERE atc.atc_chamado IN (" + placeholders + ")\n        AND (\n          -- Pegar atendimentos ativos (sem data de t\u00E9rmino) OU\n          atc.atc_data_hora_termino IS NULL\n          OR \n          -- Se n\u00E3o houver ativo, pegar o mais recente finalizado\n          (atc.atc_data_hora_termino IS NOT NULL AND atc.atc_id = (\n            SELECT MAX(atc2.atc_id) \n            FROM atendimentos_chamados atc2 \n            WHERE atc2.atc_chamado = atc.atc_chamado\n          ))\n        )\n        ORDER BY \n          atc.atc_chamado,\n          CASE WHEN atc.atc_data_hora_termino IS NULL THEN 0 ELSE 1 END,\n          atc.atc_data_hora_inicio DESC\n      ";
                        return [4 /*yield*/, database_1.executeQuery(colaboradoresQuery, chamadoIds)];
                    case 2:
                        colaboradores = _a.sent();
                        colaboradorMap_1 = new Map();
                        if (Array.isArray(colaboradores)) {
                            colaboradores.forEach(function (col) {
                                var chamadoId = col.atc_chamado;
                                // Se já existe um registro para este chamado
                                if (colaboradorMap_1.has(chamadoId)) {
                                    var existing = colaboradorMap_1.get(chamadoId);
                                    // Priorizar: ativo (sem término) > mais recente finalizado
                                    if (!col.atc_data_hora_termino ||
                                        (existing.atc_data_hora_termino && !col.atc_data_hora_termino)) {
                                        colaboradorMap_1.set(chamadoId, {
                                            colaborador_nome: col.colaborador_nome,
                                            atc_colaborador: col.atc_colaborador,
                                            atc_data_hora_inicio: col.atc_data_hora_inicio
                                        });
                                    }
                                }
                                else {
                                    colaboradorMap_1.set(chamadoId, {
                                        colaborador_nome: col.colaborador_nome,
                                        atc_colaborador: col.atc_colaborador,
                                        atc_data_hora_inicio: col.atc_data_hora_inicio
                                    });
                                }
                            });
                        }
                        // Enriquecer chamados com dados dos colaboradores
                        return [2 /*return*/, chamados.map(function (chamado) { return (__assign(__assign({}, chamado), colaboradorMap_1.get(chamado.cha_id))); })];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Erro ao enriquecer com colaboradores:', error_1);
                        // Retornar chamados sem colaboradores em caso de erro
                        return [2 /*return*/, chamados];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // Listar chamados com filtros e paginação
    ChamadoModel.findAll = function (pagination, filters) {
        if (filters === void 0) { filters = {}; }
        return __awaiter(this, void 0, Promise, function () {
            var whereClause, params, searchTerm, countQuery, dataQuery, countResult, chamados, error_2, error_3, chamadosResult, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 10, , 11]);
                        whereClause = 'WHERE 1=1';
                        params = [];
                        // Aplicar filtros
                        if (filters.search && filters.search.trim()) {
                            whereClause += " AND (c.cha_descricao LIKE ? OR c.cha_DT LIKE ? OR c.cha_operador LIKE ?)";
                            searchTerm = "%" + filters.search.trim() + "%";
                            params.push(searchTerm, searchTerm, searchTerm);
                        }
                        if (filters.status) {
                            whereClause += " AND c.cha_status = ?";
                            params.push(filters.status);
                        }
                        else {
                            whereClause += " AND (c.cha_status = 1 OR c.cha_status = 2)";
                        }
                        if (filters.cliente) {
                            whereClause += " AND c.cha_cliente = ?";
                            params.push(filters.cliente);
                        }
                        if (filters.tipo) {
                            whereClause += " AND c.cha_tipo = ?";
                            params.push(filters.tipo);
                        }
                        if (filters.dataInicio && filters.dataInicio.trim()) {
                            whereClause += " AND DATE(c.cha_data_hora_abertura) >= ?";
                            params.push(filters.dataInicio.trim());
                        }
                        if (filters.dataFim && filters.dataFim.trim()) {
                            whereClause += " AND DATE(c.cha_data_hora_abertura) <= ?";
                            params.push(filters.dataFim.trim());
                        }
                        console.log('📋 Parâmetros da query:', {
                            whereClause: whereClause,
                            params: params,
                            paramsLength: params.length,
                            pagination: pagination
                        });
                        countQuery = "\n        SELECT COUNT(*) as total\n        FROM chamados c\n        " + whereClause + "\n      ";
                        dataQuery = "\n        SELECT \n          c.cha_id,\n          c.cha_operador,\n          c.cha_tipo,\n          c.cha_cliente,\n          c.cha_produto,\n          c.cha_DT,\n          c.cha_status,\n          c.cha_descricao,\n          c.cha_plano,\n          c.cha_data_hora_abertura,\n          c.cha_data_hora_atendimento,\n          c.cha_data_hora_termino,\n          c.cha_acao,\n          c.cha_visualizado,\n          c.cha_local,\n          \n          -- Campos relacionados b\u00E1sicos\n          tc.tch_descricao AS tipo_chamado,\n          sc.stc_descricao AS status_chamado,\n          cl.cli_nome AS cliente_nome,\n          p.pro_nome AS produto_nome,\n          loc.loc_nome AS local_chamado,\n          ac.ach_descricao AS acao_descricao,\n          \n          -- Campos calculados (mantendo negativos)\n          TIMESTAMPDIFF(MINUTE, c.cha_data_hora_abertura, NOW()) AS duracao_total,\n          IF(c.cha_status > 1, TIMESTAMPDIFF(MINUTE, c.cha_data_hora_atendimento, NOW()), 0) AS duracao_atendimento,\n          \n          -- Campos auxiliares para ordena\u00E7\u00E3o\n          CASE WHEN c.cha_status = 3 THEN 1 ELSE 0 END AS is_finalizado,\n          CASE WHEN c.cha_status > 1 THEN 0 ELSE 1 END AS is_em_atendimento,\n          CASE WHEN c.cha_status != 3 THEN \n              CASE WHEN c.cha_data_hora_abertura <= NOW() THEN 0 ELSE 1 END \n          ELSE 1 END AS ordenacao_prioritaria,\n          CASE WHEN c.cha_status != 3 THEN c.cha_data_hora_abertura ELSE c.cha_data_hora_termino END AS data_ordenacao\n\n        FROM chamados c\n        LEFT JOIN tipos_chamado tc ON c.cha_tipo = tc.tch_id\n        LEFT JOIN status_chamado sc ON c.cha_status = sc.stc_id\n        LEFT JOIN clientes cl ON c.cha_cliente = cl.cli_id\n        LEFT JOIN produtos p ON c.cha_produto = p.pro_id\n        LEFT JOIN local_chamado loc ON c.cha_local = loc.loc_id\n        LEFT JOIN acoes_chamados ac ON c.cha_acao = ac.ach_id\n        \n        " + whereClause + "\n        ORDER BY \n          is_finalizado,  -- Chamados n\u00E3o finalizados primeiro\n          is_em_atendimento,  -- Chamados em atendimento aparecem antes dos n\u00E3o atendidos\n          ordenacao_prioritaria,  -- Dentro dos n\u00E3o finalizados, ativos primeiro\n          data_ordenacao DESC,  -- Ordena por data (abertura ou t\u00E9rmino)\n          c.cha_status DESC,\n          duracao_total DESC,\n          duracao_atendimento DESC\n        LIMIT " + pagination.limit + " OFFSET " + pagination.offset + "\n      ";
                        console.log('🔍 Executando queries...');
                        countResult = void 0;
                        chamados = void 0;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, database_1.executeQuery(countQuery, __spreadArrays(params))];
                    case 2:
                        countResult = _a.sent(); // Spread para criar nova array
                        console.log('✅ Count query executada:', countResult);
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _a.sent();
                        console.error('❌ Erro na count query:', error_2);
                        throw new Error('Erro ao contar chamados');
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, database_1.executeQuery(dataQuery, __spreadArrays(params))];
                    case 5:
                        chamados = _a.sent(); // Spread para criar nova array
                        console.log('✅ Data query executada:', Array.isArray(chamados) ? chamados.length + " registros" : 'Resultado inválido');
                        return [3 /*break*/, 7];
                    case 6:
                        error_3 = _a.sent();
                        console.error('❌ Erro na data query:', error_3);
                        throw new Error('Erro ao buscar chamados');
                    case 7:
                        chamadosResult = Array.isArray(chamados) ? chamados : [];
                        if (!(chamadosResult.length > 0)) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.enrichWithCollaborators(chamadosResult)];
                    case 8:
                        chamadosResult = _a.sent();
                        _a.label = 9;
                    case 9: return [2 /*return*/, {
                            chamados: chamadosResult,
                            total: countResult && countResult[0] ? countResult[0].total : 0
                        }];
                    case 10:
                        error_4 = _a.sent();
                        console.error('❌ Erro completo ao buscar chamados:', error_4);
                        throw error_4;
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    // Buscar chamado por ID
    ChamadoModel.findById = function (id) {
        return __awaiter(this, void 0, Promise, function () {
            var query, results, chamado, enriched, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        query = "\n        SELECT \n          c.*,\n          tc.tch_descricao as tipo_chamado,\n          sc.stc_descricao as status_chamado,\n          cl.cli_nome as cliente_nome,\n          p.pro_nome as produto_nome,\n          ac.ach_descricao as acao_descricao,\n          loc.loc_nome as local_chamado\n        FROM chamados c\n        LEFT JOIN tipos_chamado tc ON c.cha_tipo = tc.tch_id\n        LEFT JOIN status_chamado sc ON c.cha_status = sc.stc_id\n        LEFT JOIN clientes cl ON c.cha_cliente = cl.cli_id\n        LEFT JOIN produtos p ON c.cha_produto = p.pro_id\n        LEFT JOIN acoes_chamados ac ON c.cha_acao = ac.ach_id\n        LEFT JOIN local_chamado loc ON c.cha_local = loc.loc_id\n        WHERE c.cha_id = ?\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [id])];
                    case 1:
                        results = _a.sent();
                        if (!(Array.isArray(results) && results.length > 0)) return [3 /*break*/, 3];
                        chamado = results[0];
                        return [4 /*yield*/, this.enrichWithCollaborators([chamado])];
                    case 2:
                        enriched = _a.sent();
                        chamado = enriched[0];
                        // Debug log
                        console.log("\uD83D\uDCCB Chamado " + id + " carregado:", {
                            id: chamado.cha_id,
                            status: chamado.cha_status,
                            colaborador_nome: chamado.colaborador_nome,
                            atc_colaborador: chamado.atc_colaborador,
                            acao_descricao: chamado.acao_descricao
                        });
                        return [2 /*return*/, chamado];
                    case 3: return [2 /*return*/, null];
                    case 4:
                        error_5 = _a.sent();
                        console.error('Erro ao buscar chamado por ID:', error_5);
                        throw error_5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // Criar novo chamado
    ChamadoModel.create = function (chamado, operador) {
        return __awaiter(this, void 0, Promise, function () {
            var query, params, result, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        INSERT INTO chamados (\n          cha_tipo, cha_cliente, cha_produto, cha_DT, cha_descricao, cha_local,\n          cha_status, cha_data_hora_abertura, cha_operador, cha_visualizado, cha_plano\n        ) VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), ?, 0, 0)\n      ";
                        params = [
                            chamado.cha_tipo,
                            chamado.cha_cliente,
                            chamado.cha_produto,
                            chamado.cha_DT || '',
                            chamado.cha_descricao,
                            chamado.local_chamado,
                            operador
                        ];
                        return [4 /*yield*/, database_1.executeQuery(query, params)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.insertId];
                    case 2:
                        error_6 = _a.sent();
                        console.error('Erro ao criar chamado:', error_6);
                        throw error_6;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Atualizar chamado
    ChamadoModel.update = function (id, chamado) {
        return __awaiter(this, void 0, Promise, function () {
            var query, params, result, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        UPDATE chamados SET\n          cha_tipo = ?,\n          cha_cliente = ?,\n          cha_produto = ?,\n          cha_DT = ?,\n          cha_descricao = ?,\n          cha_status = ?,\n          cha_acao = ?\n        WHERE cha_id = ?\n      ";
                        params = [
                            chamado.cha_tipo,
                            chamado.cha_cliente,
                            chamado.cha_produto,
                            chamado.cha_DT || '',
                            chamado.cha_descricao,
                            chamado.cha_status,
                            chamado.cha_acao || null,
                            id
                        ];
                        return [4 /*yield*/, database_1.executeQuery(query, params)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.affectedRows > 0];
                    case 2:
                        error_7 = _a.sent();
                        console.error('Erro ao atualizar chamado:', error_7);
                        throw error_7;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Buscar tipos de chamado
    ChamadoModel.getTipos = function () {
        return __awaiter(this, void 0, void 0, function () {
            var query, results, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT tch_id, tch_descricao \n        FROM tipos_chamado \n        ORDER BY tch_descricao\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [])];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results) ? results : []];
                    case 2:
                        error_8 = _a.sent();
                        console.error('Erro ao buscar tipos de chamado:', error_8);
                        throw error_8;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Buscar status de chamado
    ChamadoModel.getStatus = function () {
        return __awaiter(this, void 0, void 0, function () {
            var query, results, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT stc_id, stc_descricao \n        FROM status_chamado \n        ORDER BY stc_id\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [])];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results) ? results : []];
                    case 2:
                        error_9 = _a.sent();
                        console.error('Erro ao buscar status de chamado:', error_9);
                        throw error_9;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Buscar produtos por cliente
    ChamadoModel.getProdutosByCliente = function (clienteId) {
        return __awaiter(this, void 0, void 0, function () {
            var query, results, error_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT pro_id, pro_nome \n        FROM produtos \n        WHERE pro_cliente = ? AND pro_ativo = 1\n        ORDER BY pro_nome\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [clienteId])];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results) ? results : []];
                    case 2:
                        error_10 = _a.sent();
                        console.error('Erro ao buscar produtos por cliente:', error_10);
                        throw error_10;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Buscar ações disponíveis
    ChamadoModel.getAcoes = function () {
        return __awaiter(this, void 0, void 0, function () {
            var query, results, error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT ach_id, ach_descricao \n        FROM acoes_chamados \n        ORDER BY ach_descricao\n        LIMIT 50\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [])];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results) ? results : []];
                    case 2:
                        error_11 = _a.sent();
                        console.error('Erro ao buscar ações:', error_11);
                        throw error_11;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Buscar locais de chamado
    ChamadoModel.getLocais = function () {
        return __awaiter(this, void 0, void 0, function () {
            var query, result, error_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT loc_id, loc_nome\n        FROM local_chamado \n        ORDER BY loc_nome\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, Array.isArray(result) ? result : []];
                    case 2:
                        error_12 = _a.sent();
                        console.error('Erro ao buscar locais de chamado:', error_12);
                        throw error_12;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Dashboard - Chamados por status
    ChamadoModel.getChamadosPorStatus = function () {
        return __awaiter(this, void 0, void 0, function () {
            var query, results, error_13;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT \n          sc.stc_descricao as status,\n          COUNT(*) as total\n        FROM chamados c\n        LEFT JOIN status_chamado sc ON c.cha_status = sc.stc_id\n        GROUP BY c.cha_status, sc.stc_descricao\n        ORDER BY c.cha_status\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [])];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results) ? results : []];
                    case 2:
                        error_13 = _a.sent();
                        console.error('Erro ao buscar chamados por status:', error_13);
                        throw error_13;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Dashboard - Chamados recentes
    ChamadoModel.getChamadosRecentes = function (limit) {
        if (limit === void 0) { limit = 10; }
        return __awaiter(this, void 0, void 0, function () {
            var query, results, error_14;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT \n          c.cha_id,\n          c.cha_DT,\n          c.cha_descricao,\n          c.cha_data_hora_abertura,\n          c.cha_operador,\n          tc.tch_descricao as tipo_chamado,\n          sc.stc_descricao as status_chamado,\n          cl.cli_nome as cliente_nome\n        FROM chamados c\n        LEFT JOIN tipos_chamado tc ON c.cha_tipo = tc.tch_id\n        LEFT JOIN status_chamado sc ON c.cha_status = sc.stc_id\n        LEFT JOIN clientes cl ON c.cha_cliente = cl.cli_id\n        ORDER BY c.cha_data_hora_abertura DESC\n        LIMIT ?\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [limit])];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results) ? results : []];
                    case 2:
                        error_14 = _a.sent();
                        console.error('Erro ao buscar chamados recentes:', error_14);
                        throw error_14;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return ChamadoModel;
}());
exports.ChamadoModel = ChamadoModel;
