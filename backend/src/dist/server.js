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
var express_1 = require("express");
var cors_1 = require("cors");
var helmet_1 = require("helmet");
var morgan_1 = require("morgan");
var dotenv_1 = require("dotenv");
var http_1 = require("http");
var socket_io_1 = require("socket.io");
require("module-alias/register");
// Importar rotas e middlewares
var authRoutes_1 = require("./routes/authRoutes");
var dispositivoRoutes_1 = require("./routes/dispositivoRoutes");
var chamadoRoutes_1 = require("./routes/chamadoRoutes");
var manutencaoRoutes_1 = require("./routes/manutencaoRoutes");
var insumoRoutes_1 = require("./routes/insumoRoutes");
var compraRoutes_1 = require("./routes/compraRoutes");
var orcamentoRoutes_1 = require("./routes/orcamentoRoutes");
var database_1 = require("./config/database");
var errorHandler_1 = require("./middlewares/errorHandler");
var AtendimentoAtivo_1 = require("./models/AtendimentoAtivo");
var Chamado_1 = require("./models/Chamado");
// Configurar variáveis de ambiente
dotenv_1["default"].config();
var app = express_1["default"]();
var PORT = process.env.PORT || 3001;
var API_PREFIX = process.env.API_PREFIX || '/api/v1';
// Criar servidor HTTP
var server = http_1.createServer(app);
// Configurar Socket.IO
var io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    }
});
var temposPreservados = new Map();
app.set('io', io);
app.set('temposPreservados', temposPreservados);
// Middleware de segurança
app.use(helmet_1["default"]());
// Configuração do CORS
app.use(cors_1["default"]({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
// Middleware para parsing JSON
app.use(express_1["default"].json({ limit: '10mb' }));
app.use(express_1["default"].urlencoded({ extended: true, limit: '10mb' }));
// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan_1["default"]('dev'));
}
else {
    app.use(morgan_1["default"]('combined'));
}
// MODIFICADO: Store para usuários conectados com acesso global
var activeUsers = new Map();
app.set('activeUsers', activeUsers);
// Função para broadcast de atendimentos ativos
var broadcastActiveAttendances = function () { return __awaiter(void 0, void 0, void 0, function () {
    var atendimentos, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, AtendimentoAtivo_1.AtendimentoAtivoModel.listarAtivos()];
            case 1:
                atendimentos = _a.sent();
                io.emit('active_attendances_updated', atendimentos);
                console.log("\uD83D\uDCE1 Broadcast: " + atendimentos.length + " atendimentos ativos");
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('Erro ao fazer broadcast dos atendimentos:', error_1);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
// Timer para atualizar tempos automaticamente a cada 5 segundos
setInterval(function () { return __awaiter(void 0, void 0, void 0, function () {
    var atendimentos, timersData, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, AtendimentoAtivo_1.AtendimentoAtivoModel.listarAtivos()];
            case 1:
                atendimentos = _a.sent();
                timersData = atendimentos.map(function (atendimento) { return ({
                    chamadoId: atendimento.atc_chamado,
                    seconds: atendimento.tempo_decorrido || 0,
                    userId: atendimento.atc_colaborador,
                    userName: atendimento.colaborador_nome,
                    startedBy: atendimento.colaborador_nome,
                    startTime: atendimento.atc_data_hora_inicio
                }); });
                io.emit('timers_sync', timersData);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('Erro na sincronização automática:', error_2);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); }, 5000); // A cada 5 segundos
// Limpar cache periodicamente
setInterval(function () {
    var agora = new Date();
    for (var _i = 0, _a = temposPreservados.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], chamadoId = _b[0], dados = _b[1];
        // Remover entradas antigas (mais de 1 hora)
        if (agora.getTime() - dados.ultimaAtualizacao.getTime() > 3600000) {
            temposPreservados["delete"](chamadoId);
        }
    }
}, 300000); // A cada 5 minutos
// Limpeza automática a cada 2 minutos
setInterval(function () { return __awaiter(void 0, void 0, void 0, function () {
    var error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, AtendimentoAtivo_1.AtendimentoAtivoModel.limparRegistrosOrfaos()];
            case 1:
                _a.sent();
                return [4 /*yield*/, broadcastActiveAttendances()];
            case 2:
                _a.sent();
                return [3 /*break*/, 4];
            case 3:
                error_3 = _a.sent();
                console.error('Erro na limpeza automática:', error_3);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); }, 120000);
// Configuração do WebSocket
io.on('connection', function (socket) {
    console.log('🔌 Cliente conectado:', socket.id);
    // MODIFICADO: Usuário se autentica
    socket.on('authenticate', function (userData) { return __awaiter(void 0, void 0, void 0, function () {
        var atendimentoAtivo, atendimentos, timersData, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🔐 Usuário autenticando:', userData);
                    // Armazenar usuário ativo com informações completas
                    activeUsers.set(socket.id, __assign(__assign({}, userData), { socketId: socket.id, connectedAt: new Date() }));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, AtendimentoAtivo_1.AtendimentoAtivoModel.buscarPorColaborador(userData.id)];
                case 2:
                    atendimentoAtivo = _a.sent();
                    if (atendimentoAtivo) {
                        console.log("\u2705 Usu\u00E1rio " + userData.nome + " tem atendimento ativo:", atendimentoAtivo.atc_chamado);
                        socket.emit('user_in_attendance', {
                            chamadoId: atendimentoAtivo.atc_chamado,
                            userId: atendimentoAtivo.atc_colaborador,
                            userName: atendimentoAtivo.colaborador_nome,
                            startTime: atendimentoAtivo.atc_data_hora_inicio,
                            elapsedSeconds: atendimentoAtivo.tempo_decorrido || 0
                        });
                    }
                    else {
                        console.log("\u2139\uFE0F Usu\u00E1rio " + userData.nome + " n\u00E3o tem atendimento ativo");
                    }
                    return [4 /*yield*/, AtendimentoAtivo_1.AtendimentoAtivoModel.listarAtivos()];
                case 3:
                    atendimentos = _a.sent();
                    socket.emit('active_attendances', atendimentos);
                    timersData = atendimentos.map(function (atendimento) { return ({
                        chamadoId: atendimento.atc_chamado,
                        seconds: atendimento.tempo_decorrido || 0,
                        userId: atendimento.atc_colaborador,
                        userName: atendimento.colaborador_nome,
                        startedBy: atendimento.colaborador_nome,
                        startTime: atendimento.atc_data_hora_inicio
                    }); });
                    socket.emit('timers_sync', timersData);
                    return [3 /*break*/, 5];
                case 4:
                    error_4 = _a.sent();
                    console.error('Erro ao verificar atendimento ativo:', error_4);
                    return [3 /*break*/, 5];
                case 5:
                    socket.broadcast.emit('user_connected', userData);
                    return [2 /*return*/];
            }
        });
    }); });
    // Iniciar atendimento COM VERIFICAÇÃO RIGOROSA
    socket.on('start_attendance', function (data) { return __awaiter(void 0, void 0, void 0, function () {
        var chamadoId, userId, userName, attendanceData, error_5;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    chamadoId = data.chamadoId, userId = data.userId, userName = data.userName;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    console.log("\uD83D\uDE80 Socket: Tentativa de iniciar atendimento - Chamado " + chamadoId + ", Usu\u00E1rio " + userId + " (" + userName + ")");
                    // Usar a nova função que faz verificação rigorosa
                    return [4 /*yield*/, AtendimentoAtivo_1.AtendimentoAtivoModel.iniciar(chamadoId, userId)];
                case 2:
                    // Usar a nova função que faz verificação rigorosa
                    _b.sent();
                    attendanceData = {
                        chamadoId: chamadoId,
                        userId: userId,
                        userName: userName,
                        socketId: socket.id,
                        startTime: new Date().toISOString()
                    };
                    // Emitir para o usuário que iniciou
                    socket.emit('attendance_started', attendanceData);
                    // Emitir para TODOS os outros usuários
                    socket.broadcast.emit('user_started_attendance', attendanceData);
                    console.log("\u2705 Socket: Atendimento iniciado com sucesso - Chamado " + chamadoId + " por " + userName);
                    // Broadcast atualização geral
                    return [4 /*yield*/, broadcastActiveAttendances()];
                case 3:
                    // Broadcast atualização geral
                    _b.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_5 = _b.sent();
                    console.error("\u274C Socket: Erro ao iniciar atendimento - " + error_5);
                    socket.emit('attendance_blocked', {
                        reason: ((_a = error_5) === null || _a === void 0 ? void 0 : _a.message) || 'Não foi possível iniciar atendimento'
                    });
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); });
    // NOVO: Transferir atendimento
    socket.on('transfer_attendance', function (data) { return __awaiter(void 0, void 0, void 0, function () {
        var chamadoId, antigoColaboradorId, novoColaboradorId, antigoUser, novoUserEntry, _a, atendimentoAtual, chamadoCompleto, startTimeOriginal, result, timestamp, notificationData, error_6;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    chamadoId = data.chamadoId, antigoColaboradorId = data.antigoColaboradorId, novoColaboradorId = data.novoColaboradorId;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    console.log("\uD83D\uDD04 Socket: Processando transfer\u00EAncia - Chamado " + chamadoId + ": " + antigoColaboradorId + " \u2192 " + novoColaboradorId);
                    antigoUser = activeUsers.get(socket.id);
                    novoUserEntry = Array.from(activeUsers.values()).find(function (user) { return user.id === novoColaboradorId; });
                    console.log('👤 Antigo usuário:', (antigoUser === null || antigoUser === void 0 ? void 0 : antigoUser.nome) || 'Não encontrado');
                    console.log('👤 Novo usuário:', (novoUserEntry === null || novoUserEntry === void 0 ? void 0 : novoUserEntry.nome) || 'Não encontrado');
                    if (!novoUserEntry) {
                        console.log("\u274C Usu\u00E1rio " + novoColaboradorId + " n\u00E3o encontrado nos activeUsers");
                        console.log('👥 Usuários ativos:', Array.from(activeUsers.values()).map(function (u) { return ({ id: u.id, nome: u.nome, socketId: u.socketId }); }));
                        socket.emit('transfer_error', { message: 'Usuário destino não está online', chamadoId: chamadoId });
                        return [2 /*return*/];
                    }
                    // Buscar dados do chamado e atendimento
                    console.log('🔍 Buscando dados do chamado e atendimento...');
                    return [4 /*yield*/, Promise.all([
                            AtendimentoAtivo_1.AtendimentoAtivoModel.buscarPorChamado(chamadoId),
                            Chamado_1.ChamadoModel.findById(chamadoId)
                        ])];
                case 2:
                    _a = _b.sent(), atendimentoAtual = _a[0], chamadoCompleto = _a[1];
                    console.log('📋 Atendimento encontrado:', !!atendimentoAtual);
                    console.log('📋 Chamado encontrado:', !!chamadoCompleto, chamadoCompleto === null || chamadoCompleto === void 0 ? void 0 : chamadoCompleto.cliente_nome);
                    if (!atendimentoAtual) {
                        socket.emit('transfer_error', { message: 'Atendimento não encontrado', chamadoId: chamadoId });
                        return [2 /*return*/];
                    }
                    if (!chamadoCompleto) {
                        socket.emit('transfer_error', { message: 'Chamado não encontrado', chamadoId: chamadoId });
                        return [2 /*return*/];
                    }
                    // Fazer transferência
                    console.log('⚡ Executando transferência no banco...');
                    startTimeOriginal = atendimentoAtual.atc_data_hora_inicio;
                    return [4 /*yield*/, AtendimentoAtivo_1.AtendimentoAtivoModel.transferir(chamadoId, antigoColaboradorId, novoColaboradorId)];
                case 3:
                    result = _b.sent();
                    timestamp = new Date().toISOString();
                    console.log('✅ Transferência realizada no banco - enviando notificações...');
                    notificationData = {
                        chamadoId: chamadoId,
                        clienteNome: chamadoCompleto.cliente_nome || 'Cliente não identificado',
                        transferredBy: (antigoUser === null || antigoUser === void 0 ? void 0 : antigoUser.nome) || 'Usuário desconhecido',
                        transferredById: antigoColaboradorId,
                        timestamp: timestamp,
                        type: 'transfer_received'
                    };
                    console.log('📢 Dados da notificação preparados:', notificationData);
                    console.log('🎯 Socket de destino:', novoUserEntry.socketId);
                    // ESTRATÉGIA 1: Emitir para socket específico
                    console.log("\uD83D\uDCE1 ESTRAT\u00C9GIA 1: Emitindo transfer_notification para socket " + novoUserEntry.socketId);
                    io.to(novoUserEntry.socketId).emit('transfer_notification', notificationData);
                    // ESTRATÉGIA 2: Broadcast para todos com filtro
                    console.log("\uD83D\uDCE1 ESTRAT\u00C9GIA 2: Broadcast transfer_notification_broadcast para todos");
                    io.emit('transfer_notification_broadcast', __assign({ targetUserId: novoColaboradorId }, notificationData));
                    // ESTRATÉGIA 3: Emitir para TODOS (para debug)
                    console.log("\uD83D\uDCE1 ESTRAT\u00C9GIA 3: Emitindo transfer_notification_debug para TODOS");
                    io.emit('transfer_notification_debug', __assign({ forUserId: novoColaboradorId, forUserName: novoUserEntry.nome }, notificationData));
                    // ESTRATÉGIA 4: NOVA - Emitir transfer_received diretamente
                    console.log("\uD83D\uDCE1 ESTRAT\u00C9GIA 4: Emitindo transfer_received para socket " + novoUserEntry.socketId);
                    io.to(novoUserEntry.socketId).emit('transfer_received', {
                        chamadoId: chamadoId,
                        userId: novoColaboradorId,
                        userName: novoUserEntry.nome,
                        transferredBy: (antigoUser === null || antigoUser === void 0 ? void 0 : antigoUser.nome) || 'Usuário',
                        timestamp: timestamp,
                        autoOpen: true
                    });
                    // ESTRATÉGIA 5: NOVA - Broadcast transfer_received para todos (com filtro no frontend)
                    console.log("\uD83D\uDCE1 ESTRAT\u00C9GIA 5: Broadcast transfer_received para TODOS");
                    io.emit('transfer_received_broadcast', {
                        targetUserId: novoColaboradorId,
                        chamadoId: chamadoId,
                        userId: novoColaboradorId,
                        userName: novoUserEntry.nome,
                        transferredBy: (antigoUser === null || antigoUser === void 0 ? void 0 : antigoUser.nome) || 'Usuário',
                        timestamp: timestamp,
                        autoOpen: true
                    });
                    // 1. Notificar quem transferiu
                    socket.emit('transfer_completed', {
                        chamadoId: chamadoId,
                        userId: antigoColaboradorId,
                        message: "Chamado transferido para " + novoUserEntry.nome,
                        timestamp: timestamp
                    });
                    // 2. Eventos de atendimento (que já funcionam)
                    console.log('📱 Enviando eventos de atendimento...');
                    io.to(novoUserEntry.socketId).emit('transfer_received', {
                        chamadoId: chamadoId,
                        userId: novoColaboradorId,
                        userName: novoUserEntry.nome,
                        startTime: startTimeOriginal,
                        tempoJaDecorrido: result.tempoPreservado,
                        transferredBy: (antigoUser === null || antigoUser === void 0 ? void 0 : antigoUser.nome) || 'Usuário',
                        timestamp: timestamp,
                        autoOpen: true
                    });
                    // 3. Broadcast geral
                    socket.broadcast.emit('user_started_attendance', {
                        chamadoId: chamadoId,
                        userId: novoColaboradorId,
                        userName: novoUserEntry.nome,
                        startTime: startTimeOriginal,
                        motivo: 'transferred_general'
                    });
                    console.log("\u2705 TODAS as notifica\u00E7\u00F5es enviadas para transfer\u00EAncia " + chamadoId);
                    console.log("\uD83D\uDCCA Resumo: 5 estrat\u00E9gias de notifica\u00E7\u00E3o + eventos de atendimento enviados");
                    // NOVO: Log detalhado de todos os eventos emitidos
                    console.log("\uD83D\uDCCB EVENTOS EMITIDOS:");
                    console.log("   1. transfer_notification \u2192 socket " + novoUserEntry.socketId);
                    console.log("   2. transfer_notification_broadcast \u2192 todos");
                    console.log("   3. transfer_notification_debug \u2192 todos");
                    console.log("   4. transfer_received \u2192 socket " + novoUserEntry.socketId);
                    console.log("   5. transfer_received_broadcast \u2192 todos");
                    console.log("   6. transfer_completed \u2192 quem transferiu");
                    console.log("   7. user_started_attendance \u2192 broadcast geral");
                    return [3 /*break*/, 5];
                case 4:
                    error_6 = _b.sent();
                    console.error('❌ Erro ao processar transferência via socket:', error_6);
                    socket.emit('transfer_error', { message: 'Erro interno', chamadoId: chamadoId });
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); });
    // NOVO: Confirmar recebimento de transferência
    socket.on('confirm_transfer_received', function (data) {
        var chamadoId = data.chamadoId, userId = data.userId;
        console.log("\u2705 Confirma\u00E7\u00E3o de recebimento da transfer\u00EAncia - Chamado " + chamadoId + " por usu\u00E1rio " + userId);
        // Broadcast para confirmar que a transferência foi efetivada
        io.emit('transfer_confirmed', {
            chamadoId: chamadoId,
            newResponsibleId: userId,
            timestamp: new Date().toISOString()
        });
    });
    // Finalizar atendimento
    socket.on('finish_attendance', function (data) { return __awaiter(void 0, void 0, void 0, function () {
        var userId, atendimentoAtivo, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userId = data.userId;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, AtendimentoAtivo_1.AtendimentoAtivoModel.buscarPorColaborador(userId)];
                case 2:
                    atendimentoAtivo = _a.sent();
                    if (!atendimentoAtivo) return [3 /*break*/, 4];
                    console.log("\uD83C\uDFC1 Socket: Finalizando atendimento do chamado " + atendimentoAtivo.atc_chamado);
                    // Emitir ANTES de finalizar para todos os usuários
                    io.emit('user_finished_attendance', {
                        userId: userId,
                        chamadoId: atendimentoAtivo.atc_chamado
                    });
                    // Emitir ANTES de finalizar
                    socket.emit('attendance_finished');
                    return [4 /*yield*/, broadcastActiveAttendances()];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [3 /*break*/, 6];
                case 5:
                    error_7 = _a.sent();
                    console.error('Erro ao finalizar atendimento via socket:', error_7);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    }); });
    // Cancelar atendimento
    socket.on('cancel_attendance', function (data) { return __awaiter(void 0, void 0, void 0, function () {
        var chamadoId, userId, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    chamadoId = data.chamadoId, userId = data.userId;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    console.log("\uD83D\uDEAB Socket: Cancelando atendimento chamado " + chamadoId + " do usu\u00E1rio " + userId);
                    return [4 /*yield*/, AtendimentoAtivo_1.AtendimentoAtivoModel.cancelar(chamadoId)];
                case 2:
                    _a.sent();
                    // Emitir eventos IMEDIATAMENTE e para todos
                    socket.emit('attendance_cancelled');
                    io.emit('user_cancelled_attendance', {
                        userId: userId,
                        chamadoId: chamadoId
                    });
                    console.log("\u2705 Socket: Atendimento " + chamadoId + " cancelado e eventos emitidos");
                    // Broadcast atualização geral
                    setTimeout(function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, broadcastActiveAttendances()];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); }, 500);
                    return [3 /*break*/, 4];
                case 3:
                    error_8 = _a.sent();
                    console.error('Erro ao cancelar atendimento:', error_8);
                    socket.emit('attendance_error', {
                        message: 'Erro ao cancelar atendimento'
                    });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    // Solicitar atendimentos ativos
    socket.on('get_active_attendances', function () { return __awaiter(void 0, void 0, void 0, function () {
        var atendimentos, error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, AtendimentoAtivo_1.AtendimentoAtivoModel.listarAtivos()];
                case 1:
                    atendimentos = _a.sent();
                    socket.emit('active_attendances', atendimentos);
                    return [3 /*break*/, 3];
                case 2:
                    error_9 = _a.sent();
                    console.error('Erro ao buscar atendimentos ativos:', error_9);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // MODIFICADO: Desconexão
    socket.on('disconnect', function () {
        console.log('🔌 Cliente desconectado:', socket.id);
        var user = activeUsers.get(socket.id);
        if (user) {
            console.log("\uD83D\uDC64 Usu\u00E1rio " + user.nome + " desconectou");
            activeUsers["delete"](socket.id);
            socket.broadcast.emit('user_disconnected', user);
        }
        // Atendimentos permanecem no banco, não são removidos na desconexão
    });
});
// Health check endpoint
app.get('/health', function (req, res) {
    res.json({
        success: true,
        message: 'ProEngControl API está funcionando!',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV,
        activeConnections: activeUsers.size
    });
});
// Rota principal da API
app.get(API_PREFIX, function (req, res) {
    res.json({
        success: true,
        message: 'Bem-vindo ao ProEngControl - PEC API',
        version: '1.0.0',
        endpoints: {
            auth: API_PREFIX + "/auth",
            dispositivos: API_PREFIX + "/dispositivos",
            chamados: API_PREFIX + "/chamados",
            manutencao: API_PREFIX + "/manutencao",
            insumos: API_PREFIX + "/insumos",
            compras: API_PREFIX + "/compras",
            orcamentos: API_PREFIX + "/orcamentos",
            dashboard: API_PREFIX + "/dashboard"
        },
        timestamp: new Date().toISOString()
    });
});
// Rotas da API
app.use(API_PREFIX + "/auth", authRoutes_1["default"]);
app.use(API_PREFIX + "/dispositivos", dispositivoRoutes_1["default"]);
app.use(API_PREFIX + "/chamados", chamadoRoutes_1["default"]);
app.use(API_PREFIX + "/manutencao", manutencaoRoutes_1["default"]);
app.use(API_PREFIX + "/insumos", insumoRoutes_1["default"]);
app.use(API_PREFIX + "/compras", compraRoutes_1["default"]);
app.use(API_PREFIX + "/orcamentos", orcamentoRoutes_1["default"]);
// Middleware de tratamento de erros (deve ser o último)
app.use(errorHandler_1.errorHandler);
// 404 handler
app.use('*', function (req, res) {
    res.status(404).json({
        success: false,
        message: "Rota " + req.originalUrl + " n\u00E3o encontrada",
        timestamp: new Date().toISOString()
    });
});
// Inicializar servidor
var startServer = function () { return __awaiter(void 0, void 0, void 0, function () {
    var dbConnected, error_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, database_1.testConnection()];
            case 1:
                dbConnected = _a.sent();
                if (!dbConnected) {
                    console.error('❌ Falha na conexão com o banco de dados');
                    process.exit(1);
                }
                // Limpeza inicial de registros órfãos
                return [4 /*yield*/, AtendimentoAtivo_1.AtendimentoAtivoModel.limparRegistrosOrfaos()];
            case 2:
                // Limpeza inicial de registros órfãos
                _a.sent();
                console.log('🧹 Limpeza inicial de registros órfãos concluída');
                // Iniciar servidor
                server.listen(PORT, function () {
                    console.log('🚀 ProEngControl - PEC API');
                    console.log("\uD83D\uDCE1 Servidor rodando na porta " + PORT);
                    console.log("\uD83D\uDD0C WebSocket ativo");
                    console.log("\uD83C\uDF0D Environment: " + process.env.NODE_ENV);
                    console.log("\uD83D\uDCCB API Base: http://localhost:" + PORT + API_PREFIX);
                    console.log("\uD83D\uDD0D Health Check: http://localhost:" + PORT + "/health");
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                });
                return [3 /*break*/, 4];
            case 3:
                error_10 = _a.sent();
                console.error('❌ Erro ao iniciar servidor:', error_10);
                process.exit(1);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
// Tratamento de erros não capturados
process.on('uncaughtException', function (error) {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', function (reason, promise) {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
// Iniciar aplicação
startServer();
exports["default"] = app;
