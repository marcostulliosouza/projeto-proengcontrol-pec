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
exports.OrcamentoModel = void 0;
var database_1 = require("../config/database");
var OrcamentoModel = /** @class */ (function () {
    function OrcamentoModel() {
    }
    // Listar orçamentos
    OrcamentoModel.findAll = function (filtros) {
        if (filtros === void 0) { filtros = {}; }
        return __awaiter(this, void 0, Promise, function () {
            var whereClause, params, query, results, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        whereClause = 'WHERE 1=1';
                        params = [];
                        if (filtros.ano) {
                            whereClause += ' AND o.orc_ano = ?';
                            params.push(filtros.ano);
                        }
                        if (filtros.centroCusto) {
                            whereClause += ' AND o.orc_centro_custo = ?';
                            params.push(filtros.centroCusto);
                        }
                        if (filtros.categoria) {
                            whereClause += ' AND o.cav_id = ?';
                            params.push(filtros.categoria);
                        }
                        query = "\n        SELECT \n          o.*,\n          cv.cav_nome as categoria_verba,\n          (o.orc_orcado - o.orc_gasto) as orc_disponivel,\n          ROUND((o.orc_gasto / o.orc_orcado) * 100, 2) as orc_percentual_usado,\n          CASE \n            WHEN (o.orc_gasto / o.orc_orcado) >= 1.0 THEN 'LIMITE_EXCEDIDO'\n            WHEN (o.orc_gasto / o.orc_orcado) >= 0.8 THEN 'PROXIMO_LIMITE' \n            ELSE 'NO_LIMITE'\n          END as orc_status\n        FROM orcamento o\n        LEFT JOIN categorias_verbas cv ON o.cav_id = cv.cav_id\n        " + whereClause + "\n        ORDER BY o.orc_ano DESC, o.orc_centro_custo, cv.cav_nome\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, params)];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results) ? results : []];
                    case 2:
                        error_1 = _a.sent();
                        console.error('Erro ao buscar orçamentos:', error_1);
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Buscar orçamento por ID
    OrcamentoModel.findById = function (id) {
        return __awaiter(this, void 0, Promise, function () {
            var query, results, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT \n          o.*,\n          cv.cav_nome as categoria_verba,\n          (o.orc_orcado - o.orc_gasto) as orc_disponivel,\n          ROUND((o.orc_gasto / o.orc_orcado) * 100, 2) as orc_percentual_usado,\n          CASE \n            WHEN (o.orc_gasto / o.orc_orcado) >= 1.0 THEN 'LIMITE_EXCEDIDO'\n            WHEN (o.orc_gasto / o.orc_orcado) >= 0.8 THEN 'PROXIMO_LIMITE' \n            ELSE 'NO_LIMITE'\n          END as orc_status\n        FROM orcamento o\n        LEFT JOIN categorias_verbas cv ON o.cav_id = cv.cav_id\n        WHERE o.orc_id = ?\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [id])];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results) && results.length > 0 ? results[0] : null];
                    case 2:
                        error_2 = _a.sent();
                        console.error('Erro ao buscar orçamento:', error_2);
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Criar orçamento
    OrcamentoModel.create = function (orcamento) {
        return __awaiter(this, void 0, Promise, function () {
            var existeQuery, existe, query, result, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        existeQuery = "\n        SELECT COUNT(*) as count \n        FROM orcamento \n        WHERE orc_ano = ? AND orc_centro_custo = ? AND cav_id = ?\n      ";
                        return [4 /*yield*/, database_1.executeQuery(existeQuery, [
                                orcamento.orc_ano,
                                orcamento.orc_centro_custo,
                                orcamento.cav_id
                            ])];
                    case 1:
                        existe = _a.sent();
                        if (Array.isArray(existe) && existe[0] && existe[0].count > 0) {
                            throw new Error('Já existe orçamento para esta combinação de ano, centro de custo e categoria');
                        }
                        query = "\n        INSERT INTO orcamento (\n          cav_id, orc_centro_custo, orc_ano, orc_orcado, orc_gasto\n        ) VALUES (?, ?, ?, ?, ?)\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [
                                orcamento.cav_id,
                                orcamento.orc_centro_custo,
                                orcamento.orc_ano,
                                orcamento.orc_orcado || 0,
                                0 // Gasto sempre inicia em 0
                            ])];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result.insertId];
                    case 3:
                        error_3 = _a.sent();
                        console.error('Erro ao criar orçamento:', error_3);
                        throw error_3;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // Atualizar orçamento
    OrcamentoModel.update = function (id, orcamento) {
        return __awaiter(this, void 0, Promise, function () {
            var query, result, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        UPDATE orcamento SET\n          cav_id = ?,\n          orc_centro_custo = ?,\n          orc_ano = ?,\n          orc_orcado = ?\n        WHERE orc_id = ?\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [
                                orcamento.cav_id,
                                orcamento.orc_centro_custo,
                                orcamento.orc_ano,
                                orcamento.orc_orcado || 0,
                                id
                            ])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.affectedRows > 0];
                    case 2:
                        error_4 = _a.sent();
                        console.error('Erro ao atualizar orçamento:', error_4);
                        throw error_4;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Deletar orçamento
    OrcamentoModel["delete"] = function (id) {
        return __awaiter(this, void 0, Promise, function () {
            var gastosQuery, gastos, query, result, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        gastosQuery = 'SELECT orc_gasto FROM orcamento WHERE orc_id = ?';
                        return [4 /*yield*/, database_1.executeQuery(gastosQuery, [id])];
                    case 1:
                        gastos = _a.sent();
                        if (Array.isArray(gastos) && gastos[0] && gastos[0].orc_gasto > 0) {
                            throw new Error('Não é possível excluir orçamento que já possui gastos registrados');
                        }
                        query = 'DELETE FROM orcamento WHERE orc_id = ?';
                        return [4 /*yield*/, database_1.executeQuery(query, [id])];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result.affectedRows > 0];
                    case 3:
                        error_5 = _a.sent();
                        console.error('Erro ao deletar orçamento:', error_5);
                        throw error_5;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // Verificar disponibilidade orçamentária para uma compra
    OrcamentoModel.verificarDisponibilidade = function (categoriaId, centroCusto, ano, valor) {
        return __awaiter(this, void 0, Promise, function () {
            var query, results, orcamento, disponivel, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT \n          orc_orcado,\n          orc_gasto,\n          (orc_orcado - orc_gasto) as disponivel_valor,\n          ROUND((orc_gasto / orc_orcado) * 100, 2) as percentual_usado\n        FROM orcamento\n        WHERE cav_id = ? AND orc_centro_custo = ? AND orc_ano = ?\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [categoriaId, centroCusto, ano])];
                    case 1:
                        results = _a.sent();
                        if (!Array.isArray(results) || results.length === 0) {
                            return [2 /*return*/, {
                                    disponivel: false,
                                    orcado: 0,
                                    gasto: 0,
                                    disponivel_valor: 0,
                                    percentual_usado: 0
                                }];
                        }
                        orcamento = results[0];
                        disponivel = orcamento.disponivel_valor >= valor;
                        return [2 /*return*/, {
                                disponivel: disponivel,
                                orcado: orcamento.orc_orcado,
                                gasto: orcamento.orc_gasto,
                                disponivel_valor: orcamento.disponivel_valor,
                                percentual_usado: orcamento.percentual_usado
                            }];
                    case 2:
                        error_6 = _a.sent();
                        console.error('Erro ao verificar disponibilidade:', error_6);
                        throw error_6;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Registrar gasto (quando uma compra é aprovada)
    OrcamentoModel.registrarGasto = function (categoriaId, centroCusto, ano, valor) {
        return __awaiter(this, void 0, Promise, function () {
            var disponibilidade, query, result, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.verificarDisponibilidade(categoriaId, centroCusto, ano, valor)];
                    case 1:
                        disponibilidade = _a.sent();
                        if (!disponibilidade.disponivel) {
                            throw new Error('Orçamento insuficiente para esta operação');
                        }
                        query = "\n        UPDATE orcamento \n        SET orc_gasto = orc_gasto + ?\n        WHERE cav_id = ? AND orc_centro_custo = ? AND orc_ano = ?\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [valor, categoriaId, centroCusto, ano])];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result.affectedRows > 0];
                    case 3:
                        error_7 = _a.sent();
                        console.error('Erro ao registrar gasto:', error_7);
                        throw error_7;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // Estornar gasto (quando uma compra é cancelada)
    OrcamentoModel.estornarGasto = function (categoriaId, centroCusto, ano, valor) {
        return __awaiter(this, void 0, Promise, function () {
            var query, result, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        UPDATE orcamento \n        SET orc_gasto = GREATEST(0, orc_gasto - ?)\n        WHERE cav_id = ? AND orc_centro_custo = ? AND orc_ano = ?\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [valor, categoriaId, centroCusto, ano])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.affectedRows > 0];
                    case 2:
                        error_8 = _a.sent();
                        console.error('Erro ao estornar gasto:', error_8);
                        throw error_8;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Resumo geral do orçamento
    OrcamentoModel.getResumoGeral = function (ano) {
        return __awaiter(this, void 0, Promise, function () {
            var anoAtual, resumoCategoriaQuery, resumoCentroQuery, totaisQuery, _a, resumoCategoria, resumoCentro, totaisResult, totais, error_9;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        anoAtual = ano || new Date().getFullYear();
                        resumoCategoriaQuery = "\n        SELECT \n          cv.cav_nome as categoria,\n          SUM(o.orc_orcado) as orcado_total,\n          SUM(o.orc_gasto) as gasto_total,\n          SUM(o.orc_orcado - o.orc_gasto) as disponivel_total,\n          ROUND(AVG((o.orc_gasto / o.orc_orcado) * 100), 2) as percentual_medio\n        FROM orcamento o\n        LEFT JOIN categorias_verbas cv ON o.cav_id = cv.cav_id\n        WHERE o.orc_ano = ?\n        GROUP BY o.cav_id, cv.cav_nome\n        ORDER BY gasto_total DESC\n      ";
                        resumoCentroQuery = "\n        SELECT \n          o.orc_centro_custo as centro_custo,\n          SUM(o.orc_orcado) as orcado_total,\n          SUM(o.orc_gasto) as gasto_total,\n          SUM(o.orc_orcado - o.orc_gasto) as disponivel_total,\n          ROUND(AVG((o.orc_gasto / o.orc_orcado) * 100), 2) as percentual_medio\n        FROM orcamento o\n        WHERE o.orc_ano = ?\n        GROUP BY o.orc_centro_custo\n        ORDER BY gasto_total DESC\n      ";
                        totaisQuery = "\n        SELECT \n          SUM(orc_orcado) as orcado_total,\n          SUM(orc_gasto) as gasto_total,\n          SUM(orc_orcado - orc_gasto) as disponivel_total,\n          ROUND((SUM(orc_gasto) / SUM(orc_orcado)) * 100, 2) as percentual_usado_geral\n        FROM orcamento\n        WHERE orc_ano = ?\n      ";
                        return [4 /*yield*/, Promise.all([
                                database_1.executeQuery(resumoCategoriaQuery, [anoAtual]),
                                database_1.executeQuery(resumoCentroQuery, [anoAtual]),
                                database_1.executeQuery(totaisQuery, [anoAtual])
                            ])];
                    case 1:
                        _a = _b.sent(), resumoCategoria = _a[0], resumoCentro = _a[1], totaisResult = _a[2];
                        totais = Array.isArray(totaisResult) && totaisResult[0] ? totaisResult[0] : {
                            orcado_total: 0,
                            gasto_total: 0,
                            disponivel_total: 0,
                            percentual_usado_geral: 0
                        };
                        return [2 /*return*/, {
                                resumoPorCategoria: Array.isArray(resumoCategoria) ? resumoCategoria : [],
                                resumoPorCentro: Array.isArray(resumoCentro) ? resumoCentro : [],
                                totais: {
                                    orcadoTotal: parseFloat(totais.orcado_total) || 0,
                                    gastoTotal: parseFloat(totais.gasto_total) || 0,
                                    disponivelTotal: parseFloat(totais.disponivel_total) || 0,
                                    percentualUsadoGeral: parseFloat(totais.percentual_usado_geral) || 0
                                }
                            }];
                    case 2:
                        error_9 = _b.sent();
                        console.error('Erro ao gerar resumo geral:', error_9);
                        throw error_9;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Alerta de orçamentos próximos ao limite
    OrcamentoModel.getAlertasOrcamento = function (limite) {
        if (limite === void 0) { limite = 80; }
        return __awaiter(this, void 0, Promise, function () {
            var query, results, error_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT \n          o.*,\n          cv.cav_nome as categoria_verba,\n          (o.orc_orcado - o.orc_gasto) as orc_disponivel,\n          ROUND((o.orc_gasto / o.orc_orcado) * 100, 2) as orc_percentual_usado,\n          CASE \n            WHEN (o.orc_gasto / o.orc_orcado) >= 1.0 THEN 'LIMITE_EXCEDIDO'\n            WHEN (o.orc_gasto / o.orc_orcado) >= 0.8 THEN 'PROXIMO_LIMITE' \n            ELSE 'NO_LIMITE'\n          END as orc_status\n        FROM orcamento o\n        LEFT JOIN categorias_verbas cv ON o.cav_id = cv.cav_id\n        WHERE o.orc_ano = YEAR(NOW())\n        AND (o.orc_gasto / o.orc_orcado) * 100 >= ?\n        ORDER BY orc_percentual_usado DESC\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query, [limite])];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results) ? results : []];
                    case 2:
                        error_10 = _a.sent();
                        console.error('Erro ao buscar alertas de orçamento:', error_10);
                        throw error_10;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Obter centros de custo únicos
    OrcamentoModel.getCentrosCusto = function () {
        return __awaiter(this, void 0, Promise, function () {
            var query, results, error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT DISTINCT orc_centro_custo \n        FROM orcamento \n        ORDER BY orc_centro_custo\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query)];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results) ? results.map(function (r) { return r.orc_centro_custo; }) : []];
                    case 2:
                        error_11 = _a.sent();
                        console.error('Erro ao buscar centros de custo:', error_11);
                        throw error_11;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Obter anos com orçamento
    OrcamentoModel.getAnosOrcamento = function () {
        return __awaiter(this, void 0, Promise, function () {
            var query, results, error_12;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        query = "\n        SELECT DISTINCT orc_ano \n        FROM orcamento \n        ORDER BY orc_ano DESC\n      ";
                        return [4 /*yield*/, database_1.executeQuery(query)];
                    case 1:
                        results = _a.sent();
                        return [2 /*return*/, Array.isArray(results) ? results.map(function (r) { return r.orc_ano; }) : []];
                    case 2:
                        error_12 = _a.sent();
                        console.error('Erro ao buscar anos de orçamento:', error_12);
                        throw error_12;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return OrcamentoModel;
}());
exports.OrcamentoModel = OrcamentoModel;
