import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import 'module-alias/register';

// Importar rotas e middlewares
import authRoutes from './routes/authRoutes';
import dispositivoRoutes from './routes/dispositivoRoutes';
import chamadoRoutes from './routes/chamadoRoutes';
import manutencaoRoutes from './routes/manutencaoRoutes';
import insumoRoutes from './routes/insumoRoutes';
import compraRoutes from './routes/compraRoutes';
import orcamentoRoutes from './routes/orcamentoRoutes';

import { testConnection } from './config/database';
import { errorHandler } from './middlewares/errorHandler';
import { AtendimentoAtivoModel } from './models/AtendimentoAtivo';
import { ChamadoModel } from './models/Chamado';

// Configurar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// Criar servidor HTTP
const server = createServer(app);

// Configurar Socket.IO
const io = new SocketServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const temposPreservados = new Map<number, {
  tempoAcumulado: number;
  startTimeOriginal: string;
  ultimaAtualizacao: Date;
}>();

app.set('io', io);
app.set('temposPreservados', temposPreservados);

// Middleware de segurança
app.use(helmet());

// Configuração do CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// MODIFICADO: Store para usuários conectados com acesso global
const activeUsers = new Map();
app.set('activeUsers', activeUsers);

// Função para broadcast de atendimentos ativos
const broadcastActiveAttendances = async () => {
  try {
    const atendimentos = await AtendimentoAtivoModel.listarAtivos();
    io.emit('active_attendances_updated', atendimentos);
    console.log(`📡 Broadcast: ${atendimentos.length} atendimentos ativos`);
  } catch (error) {
    console.error('Erro ao fazer broadcast dos atendimentos:', error);
  }
};

// Timer para atualizar tempos automaticamente a cada 5 segundos
setInterval(async () => {
  try {
    const atendimentos = await AtendimentoAtivoModel.listarAtivos();
    
    // Broadcast apenas os timers atualizados
    const timersData = atendimentos.map(atendimento => ({
      chamadoId: atendimento.atc_chamado,
      seconds: atendimento.tempo_decorrido || 0,
      userId: atendimento.atc_colaborador,
      userName: atendimento.colaborador_nome,
      startedBy: atendimento.colaborador_nome,
      startTime: atendimento.atc_data_hora_inicio
    }));

    io.emit('timers_sync', timersData);
  } catch (error) {
    console.error('Erro na sincronização automática:', error);
  }
}, 5000); // A cada 5 segundos

// Limpar cache periodicamente
setInterval(() => {
  const agora = new Date();
  for (const [chamadoId, dados] of temposPreservados.entries()) {
    // Remover entradas antigas (mais de 1 hora)
    if (agora.getTime() - dados.ultimaAtualizacao.getTime() > 3600000) {
      temposPreservados.delete(chamadoId);
    }
  }
}, 300000); // A cada 5 minutos

// Limpeza automática a cada 2 minutos
setInterval(async () => {
  try {
    await AtendimentoAtivoModel.limparRegistrosOrfaos();
    await broadcastActiveAttendances();
  } catch (error) {
    console.error('Erro na limpeza automática:', error);
  }
}, 120000);

// Configuração do WebSocket
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);
  
  // MODIFICADO: Usuário se autentica
  socket.on('authenticate', async (userData) => {
    console.log('🔐 Usuário autenticando:', userData);
    
    // Armazenar usuário ativo com informações completas
    activeUsers.set(socket.id, {
      ...userData,
      socketId: socket.id,
      connectedAt: new Date()
    });
    
    try {
      // Verificar se usuário já está em atendimento
      const atendimentoAtivo = await AtendimentoAtivoModel.buscarPorColaborador(userData.id);
      
      if (atendimentoAtivo) {
        console.log(`✅ Usuário ${userData.nome} tem atendimento ativo:`, atendimentoAtivo.atc_chamado);
        socket.emit('user_in_attendance', {
          chamadoId: atendimentoAtivo.atc_chamado,
          userId: atendimentoAtivo.atc_colaborador,
          userName: atendimentoAtivo.colaborador_nome,
          startTime: atendimentoAtivo.atc_data_hora_inicio,
          elapsedSeconds: atendimentoAtivo.tempo_decorrido || 0
        });
      } else {
        console.log(`ℹ️ Usuário ${userData.nome} não tem atendimento ativo`);
      }

      // Enviar todos os atendimentos ativos para sincronizar
      const atendimentos = await AtendimentoAtivoModel.listarAtivos();
      socket.emit('active_attendances', atendimentos);
      
      // Enviar timers atuais
      const timersData = atendimentos.map(atendimento => ({
        chamadoId: atendimento.atc_chamado,
        seconds: atendimento.tempo_decorrido || 0,
        userId: atendimento.atc_colaborador,
        userName: atendimento.colaborador_nome,
        startedBy: atendimento.colaborador_nome,
        startTime: atendimento.atc_data_hora_inicio
      }));
      
      socket.emit('timers_sync', timersData);
    } catch (error) {
      console.error('Erro ao verificar atendimento ativo:', error);
    }
    
    socket.broadcast.emit('user_connected', userData);
  });

  // Iniciar atendimento COM VERIFICAÇÃO RIGOROSA
  socket.on('start_attendance', async (data) => {
    const { chamadoId, userId, userName } = data;
    
    try {
      console.log(`🚀 Socket: Tentativa de iniciar atendimento - Chamado ${chamadoId}, Usuário ${userId} (${userName})`);
      
      // Usar a nova função que faz verificação rigorosa
      await AtendimentoAtivoModel.iniciar(chamadoId, userId);
      
      const attendanceData = {
        chamadoId,
        userId,
        userName,
        socketId: socket.id,
        startTime: new Date().toISOString()
      };
      
      // Emitir para o usuário que iniciou
      socket.emit('attendance_started', attendanceData);
      
      // Emitir para TODOS os outros usuários
      socket.broadcast.emit('user_started_attendance', attendanceData);
      
      console.log(`✅ Socket: Atendimento iniciado com sucesso - Chamado ${chamadoId} por ${userName}`);
      
      // Broadcast atualização geral
      await broadcastActiveAttendances();
      
    } catch (error) {
      console.error(`❌ Socket: Erro ao iniciar atendimento - ${error}`);
      socket.emit('attendance_blocked', { 
        reason: (error as Error)?.message || 'Não foi possível iniciar atendimento' 
      });
    }
  });

  // NOVO: Transferir atendimento
  socket.on('transfer_attendance', async (data) => {
    const { chamadoId, antigoColaboradorId, novoColaboradorId } = data;
    
    try {
      console.log(`🔄 Socket: Processando transferência - Chamado ${chamadoId}: ${antigoColaboradorId} → ${novoColaboradorId}`);
      
      const antigoUser = activeUsers.get(socket.id);
      const novoUserEntry = Array.from(activeUsers.values()).find(user => user.id === novoColaboradorId);
      
      console.log('👤 Antigo usuário:', antigoUser?.nome || 'Não encontrado');
      console.log('👤 Novo usuário:', novoUserEntry?.nome || 'Não encontrado');
      
      if (!novoUserEntry) {
        console.log(`❌ Usuário ${novoColaboradorId} não encontrado nos activeUsers`);
        console.log('👥 Usuários ativos:', Array.from(activeUsers.values()).map(u => ({id: u.id, nome: u.nome, socketId: u.socketId})));
        socket.emit('transfer_error', { message: 'Usuário destino não está online', chamadoId });
        return;
      }
      
      // Buscar dados do chamado e atendimento
      console.log('🔍 Buscando dados do chamado e atendimento...');
      const [atendimentoAtual, chamadoCompleto] = await Promise.all([
        AtendimentoAtivoModel.buscarPorChamado(chamadoId),
        ChamadoModel.findById(chamadoId)
      ]);
      
      console.log('📋 Atendimento encontrado:', !!atendimentoAtual);
      console.log('📋 Chamado encontrado:', !!chamadoCompleto, chamadoCompleto?.cliente_nome);
      
      if (!atendimentoAtual) {
        socket.emit('transfer_error', { message: 'Atendimento não encontrado', chamadoId });
        return;
      }
      
      if (!chamadoCompleto) {
        socket.emit('transfer_error', { message: 'Chamado não encontrado', chamadoId });
        return;
      }
      
      // Fazer transferência
      console.log('⚡ Executando transferência no banco...');
      const startTimeOriginal = atendimentoAtual.atc_data_hora_inicio;
      const result = await AtendimentoAtivoModel.transferir(chamadoId, antigoColaboradorId, novoColaboradorId);
      const timestamp = new Date().toISOString();
      
      console.log('✅ Transferência realizada no banco - enviando notificações...');
      
      // PREPARAR dados da notificação
      const notificationData = {
        chamadoId: chamadoId,
        clienteNome: chamadoCompleto.cliente_nome || 'Cliente não identificado',
        transferredBy: antigoUser?.nome || 'Usuário desconhecido',
        transferredById: antigoColaboradorId,
        timestamp: timestamp,
        type: 'transfer_received'
      };
      
      console.log('📢 Dados da notificação preparados:', notificationData);
      console.log('🎯 Socket de destino:', novoUserEntry.socketId);
      
      // ESTRATÉGIA 1: Emitir para socket específico
      console.log(`📡 ESTRATÉGIA 1: Emitindo transfer_notification para socket ${novoUserEntry.socketId}`);
      io.to(novoUserEntry.socketId).emit('transfer_notification', notificationData);
      
      // ESTRATÉGIA 2: Broadcast para todos com filtro
      console.log(`📡 ESTRATÉGIA 2: Broadcast transfer_notification_broadcast para todos`);
      io.emit('transfer_notification_broadcast', {
        targetUserId: novoColaboradorId,
        ...notificationData
      });
      
      // ESTRATÉGIA 3: Emitir para TODOS (para debug)
      console.log(`📡 ESTRATÉGIA 3: Emitindo transfer_notification_debug para TODOS`);
      io.emit('transfer_notification_debug', {
        forUserId: novoColaboradorId,
        forUserName: novoUserEntry.nome,
        ...notificationData
      });
  
      // ESTRATÉGIA 4: NOVA - Emitir transfer_received diretamente
      console.log(`📡 ESTRATÉGIA 4: Emitindo transfer_received para socket ${novoUserEntry.socketId}`);
      io.to(novoUserEntry.socketId).emit('transfer_received', {
        chamadoId,
        userId: novoColaboradorId,
        userName: novoUserEntry.nome,
        transferredBy: antigoUser?.nome || 'Usuário',
        timestamp,
        autoOpen: true
      });
  
      // ESTRATÉGIA 5: NOVA - Broadcast transfer_received para todos (com filtro no frontend)
      console.log(`📡 ESTRATÉGIA 5: Broadcast transfer_received para TODOS`);
      io.emit('transfer_received_broadcast', {
        targetUserId: novoColaboradorId,
        chamadoId,
        userId: novoColaboradorId,
        userName: novoUserEntry.nome,
        transferredBy: antigoUser?.nome || 'Usuário',
        timestamp,
        autoOpen: true
      });
  
      // 1. Notificar quem transferiu
      socket.emit('transfer_completed', {
        chamadoId,
        userId: antigoColaboradorId,
        message: `Chamado transferido para ${novoUserEntry.nome}`,
        timestamp
      });
  
      // 2. Eventos de atendimento (que já funcionam)
      console.log('📱 Enviando eventos de atendimento...');
      io.to(novoUserEntry.socketId).emit('transfer_received', {
        chamadoId,
        userId: novoColaboradorId,
        userName: novoUserEntry.nome,
        startTime: startTimeOriginal,
        tempoJaDecorrido: result.tempoPreservado,
        transferredBy: antigoUser?.nome || 'Usuário',
        timestamp,
        autoOpen: true
      });
  
      // 3. Broadcast geral
      socket.broadcast.emit('user_started_attendance', {
        chamadoId,
        userId: novoColaboradorId,
        userName: novoUserEntry.nome,
        startTime: startTimeOriginal,
        motivo: 'transferred_general'
      });
  
      console.log(`✅ TODAS as notificações enviadas para transferência ${chamadoId}`);
      console.log(`📊 Resumo: 5 estratégias de notificação + eventos de atendimento enviados`);
      
      // NOVO: Log detalhado de todos os eventos emitidos
      console.log(`📋 EVENTOS EMITIDOS:`);
      console.log(`   1. transfer_notification → socket ${novoUserEntry.socketId}`);
      console.log(`   2. transfer_notification_broadcast → todos`);
      console.log(`   3. transfer_notification_debug → todos`);
      console.log(`   4. transfer_received → socket ${novoUserEntry.socketId}`);
      console.log(`   5. transfer_received_broadcast → todos`);
      console.log(`   6. transfer_completed → quem transferiu`);
      console.log(`   7. user_started_attendance → broadcast geral`);
      
    } catch (error) {
      console.error('❌ Erro ao processar transferência via socket:', error);
      socket.emit('transfer_error', { message: 'Erro interno', chamadoId });
    }
  });

  // NOVO: Confirmar recebimento de transferência
  socket.on('confirm_transfer_received', (data) => {
    const { chamadoId, userId } = data;
    console.log(`✅ Confirmação de recebimento da transferência - Chamado ${chamadoId} por usuário ${userId}`);
    
    // Broadcast para confirmar que a transferência foi efetivada
    io.emit('transfer_confirmed', {
      chamadoId,
      newResponsibleId: userId,
      timestamp: new Date().toISOString()
    });
  });

  // Finalizar atendimento
  socket.on('finish_attendance', async (data) => {
    const { userId } = data;
    
    try {
      const atendimentoAtivo = await AtendimentoAtivoModel.buscarPorColaborador(userId);
      
      if (atendimentoAtivo) {
        console.log(`🏁 Socket: Finalizando atendimento do chamado ${atendimentoAtivo.atc_chamado}`);
        
        // Emitir ANTES de finalizar para todos os usuários
        io.emit('user_finished_attendance', {
          userId,
          chamadoId: atendimentoAtivo.atc_chamado
        });

        // Emitir ANTES de finalizar
        socket.emit('attendance_finished');
        
        await broadcastActiveAttendances();
      }
    } catch (error) {
      console.error('Erro ao finalizar atendimento via socket:', error);
    }
  });

  // Cancelar atendimento
  socket.on('cancel_attendance', async (data) => {
    const { chamadoId, userId } = data;
    
    try {
      console.log(`🚫 Socket: Cancelando atendimento chamado ${chamadoId} do usuário ${userId}`);
      
      await AtendimentoAtivoModel.cancelar(chamadoId);
      
      // Emitir eventos IMEDIATAMENTE e para todos
      socket.emit('attendance_cancelled');
      io.emit('user_cancelled_attendance', {
        userId,
        chamadoId
      });
      
      console.log(`✅ Socket: Atendimento ${chamadoId} cancelado e eventos emitidos`);
      
      // Broadcast atualização geral
      setTimeout(async () => {
        await broadcastActiveAttendances();
      }, 500);
      
    } catch (error) {
      console.error('Erro ao cancelar atendimento:', error);
      socket.emit('attendance_error', {
        message: 'Erro ao cancelar atendimento'
      });
    }
  });

  // Solicitar atendimentos ativos
  socket.on('get_active_attendances', async () => {
    try {
      const atendimentos = await AtendimentoAtivoModel.listarAtivos();
      socket.emit('active_attendances', atendimentos);
    } catch (error) {
      console.error('Erro ao buscar atendimentos ativos:', error);
    }
  });

  // MODIFICADO: Desconexão
  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
    
    const user = activeUsers.get(socket.id);
    if (user) {
      console.log(`👤 Usuário ${user.nome} desconectou`);
      activeUsers.delete(socket.id);
      socket.broadcast.emit('user_disconnected', user);
    }
    
    // Atendimentos permanecem no banco, não são removidos na desconexão
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
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
app.get(API_PREFIX, (req, res) => {
  res.json({
    success: true,
    message: 'Bem-vindo ao ProEngControl - PEC API',
    version: '1.0.0',
    endpoints: {
      auth: `${API_PREFIX}/auth`,
      dispositivos: `${API_PREFIX}/dispositivos`,
      chamados: `${API_PREFIX}/chamados`,
      manutencao: `${API_PREFIX}/manutencao`,
      insumos: `${API_PREFIX}/insumos`,
      compras: `${API_PREFIX}/compras`,
      orcamentos: `${API_PREFIX}/orcamentos`,
      dashboard: `${API_PREFIX}/dashboard`
    },
    timestamp: new Date().toISOString()
  });
});

// Rotas da API
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/dispositivos`, dispositivoRoutes);
app.use(`${API_PREFIX}/chamados`, chamadoRoutes);
app.use(`${API_PREFIX}/manutencao`, manutencaoRoutes);
app.use(`${API_PREFIX}/insumos`, insumoRoutes);
app.use(`${API_PREFIX}/compras`, compraRoutes);
app.use(`${API_PREFIX}/orcamentos`, orcamentoRoutes);

// Middleware de tratamento de erros (deve ser o último)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota ${req.originalUrl} não encontrada`,
    timestamp: new Date().toISOString()
  });
});

// Inicializar servidor
const startServer = async () => {
  try {
    // Testar conexão com banco de dados
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Falha na conexão com o banco de dados');
      process.exit(1);
    }

    // Limpeza inicial de registros órfãos
    await AtendimentoAtivoModel.limparRegistrosOrfaos();
    console.log('🧹 Limpeza inicial de registros órfãos concluída');

    // Iniciar servidor
    server.listen(PORT, () => {
      console.log('🚀 ProEngControl - PEC API');
      console.log(`📡 Servidor rodando na porta ${PORT}`);
      console.log(`🔌 WebSocket ativo`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`📋 API Base: http://localhost:${PORT}${API_PREFIX}`);
      console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Iniciar aplicação
startServer();

export default app;