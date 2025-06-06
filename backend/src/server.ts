// server.ts - OTIMIZADO
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import 'module-alias/register';

import authRoutes from './routes/authRoutes';
import dispositivoRoutes from './routes/dispositivoRoutes';
import chamadoRoutes from './routes/chamadoRoutes';

import { executeQuery, testConnection } from './config/database';
import { errorHandler } from './middlewares/errorHandler';
import { AtendimentoAtivoModel } from './models/AtendimentoAtivo';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

const server = createServer(app);

// SOCKET.IO MELHORADO
const io = new SocketServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  // NOVAS CONFIGURAÇÕES DE PERFORMANCE
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6,
  transports: ['websocket', 'polling']
});

app.set('io', io);

// Middleware de segurança
app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// STORE OTIMIZADO para usuários conectados
const activeUsers = new Map<string, {
  userId: number;
  userName: string;
  socketId: string;
  connectedAt: Date;
  lastSeen: Date;
  userLogin: string;
  userCategory: number;
}>();

// HEARTBEAT para detectar conexões mortas
const heartbeatInterval = setInterval(() => {
  const now = new Date();
  const staleConnections = [];
  
  for (const [socketId, user] of activeUsers) {
    if (now.getTime() - user.lastSeen.getTime() > 90000) { // 90 segundos
      staleConnections.push(socketId);
    }
  }
  
  staleConnections.forEach(socketId => {
    console.log(`🧹 Removendo conexão inativa: ${socketId}`);
    activeUsers.delete(socketId);
  });
}, 30000); // A cada 30 segundos

// Função otimizada para broadcast
const broadcastActiveAttendances = async () => {
  try {
    const atendimentos = await AtendimentoAtivoModel.listarAtivos();
    io.emit('active_attendances_updated', atendimentos);
    console.log(`📡 Broadcast: ${atendimentos.length} atendimentos ativos`);
  } catch (error) {
    console.error('Erro ao fazer broadcast dos atendimentos:', error);
  }
};

// Função para obter usuários realmente online
const getRealOnlineUsers = async () => {
  try {
    const onlineUserIds = Array.from(activeUsers.values()).map(user => user.userId);
    
    if (onlineUserIds.length === 0) {
      return [];
    }
    
    // Query para buscar dados completos dos usuários online
    const placeholders = onlineUserIds.map(() => '?').join(',');
    const query = `
      SELECT 
        col.col_id,
        col.col_nome,
        col.col_categoria,
        cac.cac_descricao as categoria_nome,
        col.col_login,
        col.col_ativo
      FROM colaboradores col
      LEFT JOIN categorias_colaboradores cac ON col.col_categoria = cac.cac_id
      WHERE col.col_ativo = 1
      AND col.col_id IN (${placeholders})
      AND col.col_id NOT IN (
        SELECT DISTINCT atc_colaborador 
        FROM atendimentos_chamados 
        WHERE atc_data_hora_termino IS NULL
        AND atc_data_hora_inicio <= NOW()
      )
      ORDER BY col.col_nome ASC
    `;
    
    const usuarios = await executeQuery(query, onlineUserIds);
    const usuariosArray = Array.isArray(usuarios) ? usuarios : [];
    
    // Enriquecer com dados de socket
    const usuariosComSocket = usuariosArray.map(usuario => {
      const socketUser = Array.from(activeUsers.values())
        .find(su => su.userId === usuario.col_id);
      
      return {
        ...usuario,
        online: true,
        socketId: socketUser?.socketId,
        connectedAt: socketUser?.connectedAt,
        lastSeen: socketUser?.lastSeen
      };
    });
    
    console.log(`✅ Usuários realmente online e disponíveis: ${usuariosComSocket.length}`);
    return usuariosComSocket;
    
  } catch (error) {
    console.error('❌ Erro ao buscar usuários online reais:', error);
    return [];
  }
};

// Timer otimizado para sync
let lastSyncTime = 0;
const SYNC_INTERVAL = 5000;

setInterval(async () => {
  try {
    const now = Date.now();
    if (now - lastSyncTime < SYNC_INTERVAL) return;
    
    lastSyncTime = now;
    const atendimentos = await AtendimentoAtivoModel.listarAtivos();
    
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
}, SYNC_INTERVAL);

// Limpeza automática otimizada
setInterval(async () => {
  try {
    await AtendimentoAtivoModel.limparRegistrosOrfaos();
    await broadcastActiveAttendances();
  } catch (error) {
    console.error('Erro na limpeza automática:', error);
  }
}, 120000);

// SOCKET HANDLERS OTIMIZADOS
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);
  
  // Heartbeat atualizado
  socket.on('pong', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      user.lastSeen = new Date();
    }
  });

  socket.on('authenticate', async (userData) => {
    console.log('🔐 Usuário autenticando:', userData);
    
    // Limpar conexões antigas do mesmo usuário
    for (const [socketId, user] of activeUsers) {
      if (user.userId === userData.id && socketId !== socket.id) {
        console.log(`🧹 Removendo conexão antiga do usuário ${userData.nome}: ${socketId}`);
        activeUsers.delete(socketId);
        io.to(socketId).emit('force_disconnect', 'Nova conexão detectada');
      }
    }
    
    // ATUALIZADO: Incluir mais dados do usuário
    activeUsers.set(socket.id, {
      userId: userData.id,
      userName: userData.nome,
      userLogin: userData.login,
      userCategory: userData.categoria,
      socketId: socket.id,
      connectedAt: new Date(),
      lastSeen: new Date()
    });
    
    try {
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
      }

      const atendimentos = await AtendimentoAtivoModel.listarAtivos();
      socket.emit('active_attendances', atendimentos);
      
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

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
    
    const user = activeUsers.get(socket.id);
    if (user) {
      console.log(`👤 Usuário ${user.userName} desconectou`);
      activeUsers.delete(socket.id);
      socket.broadcast.emit('user_disconnected', user);
    }
  });

  socket.on('cancel_attendance', async (data) => {
    const { chamadoId, userId } = data;
    
    try {
      console.log(`🚫 Socket: Cancelando atendimento chamado ${chamadoId} do usuário ${userId}`);
      
      await AtendimentoAtivoModel.cancelar(chamadoId);
      
      socket.emit('attendance_cancelled');
      io.emit('user_cancelled_attendance', {
        userId,
        chamadoId
      });
      
      console.log(`✅ Socket: Atendimento ${chamadoId} cancelado e eventos emitidos`);
      
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
  
  // NOVO: Handler específico para transferência via socket
  socket.on('transfer_call_socket', async (data) => {
    const { chamadoId, fromUserId, toUserId } = data;
    
    try {
      console.log(`🔄 Socket: Transferindo chamado ${chamadoId}: ${fromUserId} → ${toUserId}`);
      
      // Buscar nomes dos usuários
      const [fromUser, toUser] = await Promise.all([
        executeQuery('SELECT col_nome FROM colaboradores WHERE col_id = ?', [fromUserId]),
        executeQuery('SELECT col_nome FROM colaboradores WHERE col_id = ?', [toUserId])
      ]);
      
      const fromUserName = fromUser[0]?.col_nome || 'Usuário';
      const toUserName = toUser[0]?.col_nome || 'Usuário';
      
      // Fazer a transferência no banco
      await AtendimentoAtivoModel.transferirChamado(chamadoId, fromUserId, toUserId);
      
      const transferData = {
        chamadoId,
        fromUserId,
        toUserId,
        fromUserName,
        toUserName,
        timestamp: new Date().toISOString()
      };
      
      // Para o usuário que transferiu - enviar confirmação
      socket.emit('transfer_completed', transferData);
      
      // Para o usuário que recebeu - encontrar socket e notificar
      const recipientSocket = Array.from(activeUsers.entries())
        .find(([_, user]) => user.userId === toUserId);
      
      if (recipientSocket) {
        const [recipientSocketId] = recipientSocket;
        
        // Notificar que recebeu transferência
        io.to(recipientSocketId).emit('call_transferred_to_you', transferData);
        
        // Notificar que está em atendimento
        io.to(recipientSocketId).emit('user_in_attendance', {
          chamadoId,
          userId: toUserId,
          userName: toUserName,
          startTime: transferData.timestamp
        });
        
        console.log(`✅ Notificação enviada para usuário ${toUserName} (${recipientSocketId})`);
      } else {
        console.log(`⚠️ Socket do usuário ${toUserName} não encontrado`);
      }
      
      // Para todos os outros - atualização geral
      socket.broadcast.emit('call_transferred', transferData);
      
      console.log(`✅ Socket: Transferência ${chamadoId} concluída com sucesso`);
      
      // Broadcast geral após um tempo
      setTimeout(async () => {
        await broadcastActiveAttendances();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Socket: Erro ao transferir:', error);
      socket.emit('transfer_error', {
        message: error instanceof Error ? error.message : 'Erro ao transferir chamado'
      });
    }
  });
});


// Cleanup na finalização do processo
process.on('SIGTERM', () => {
  clearInterval(heartbeatInterval);
  console.log('🧹 Limpeza concluída');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'ProEngControl API está funcionando!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    activeConnections: activeUsers.size,
    memoryUsage: process.memoryUsage()
  });
});

// Resto do código mantido igual...
app.get(API_PREFIX, (req, res) => {
  res.json({
    success: true,
    message: 'Bem-vindo ao ProEngControl - PEC API',
    version: '1.0.0',
    endpoints: {
      auth: `${API_PREFIX}/auth`,
      dispositivos: `${API_PREFIX}/dispositivos`,
      chamados: `${API_PREFIX}/chamados`,
    },
    timestamp: new Date().toISOString()
  });
});

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/dispositivos`, dispositivoRoutes);
app.use(`${API_PREFIX}/chamados`, chamadoRoutes);

app.use(errorHandler);

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota ${req.originalUrl} não encontrada`,
    timestamp: new Date().toISOString()
  });
});

const startServer = async () => {
  try {
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Falha na conexão com o banco de dados');
      process.exit(1);
    }

    await AtendimentoAtivoModel.limparRegistrosOrfaos();
    console.log('🧹 Limpeza inicial de registros órfãos concluída');

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

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

export default app;