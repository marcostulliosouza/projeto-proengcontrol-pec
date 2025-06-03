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

import { testConnection } from './config/database';
import { errorHandler } from './middlewares/errorHandler';

// Configurar variáveis de ambiente
dotenv.config();

const app = express();

const server = createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});


const PORT = process.env.PORT || 3001;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

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

// Store para controlar locks de chamados
const chamadoLocks = new Map();
const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  // Usuário se autentica
  socket.on('authenticate', (userData) => {
    activeUsers.set(socket.id, {
      ...userData,
      socketId: socket.id,
      connectedAt: new Date()
    });
    socket.broadcast.emit('user_connected', userData);
  });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'ProEngControl API está funcionando!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

// Usuário tenta abrir/lock um chamado
  socket.on('lock_chamado', (data) => {
    const { chamadoId, userId, userName } = data;
    
    if (!chamadoLocks.has(chamadoId)) {
      // Lock disponível
      chamadoLocks.set(chamadoId, {
        userId,
        userName,
        socketId: socket.id,
        lockedAt: new Date()
      });
      
      socket.emit('lock_success', { chamadoId });
      socket.broadcast.emit('chamado_locked', {
        chamadoId,
        lockedBy: { userId, userName }
      });
    } else {
      // Já está locked
      const lockInfo = chamadoLocks.get(chamadoId);
      socket.emit('lock_failed', { 
        chamadoId, 
        lockedBy: lockInfo 
      });
    }
  });

  // Usuário libera lock do chamado
  socket.on('unlock_chamado', (data) => {
    const { chamadoId } = data;
    if (chamadoLocks.has(chamadoId)) {
      chamadoLocks.delete(chamadoId);
      io.emit('chamado_unlocked', { chamadoId });
    }
  });

  // Atualização de status do chamado
  socket.on('chamado_updated', (chamadoData) => {
    socket.broadcast.emit('chamado_changed', chamadoData);
  });

  // Timer de atendimento
  socket.on('start_timer', (data) => {
    socket.broadcast.emit('timer_started', data);
  });

  socket.on('timer_update', (data) => {
    socket.broadcast.emit('timer_updated', data);
  });

  // Desconexão
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    
    // Remover locks do usuário
    for (const [chamadoId, lockInfo] of chamadoLocks.entries()) {
      if (lockInfo.socketId === socket.id) {
        chamadoLocks.delete(chamadoId);
        socket.broadcast.emit('chamado_unlocked', { chamadoId });
      }
    }
    
    // Remover usuário ativo
    const user = activeUsers.get(socket.id);
    if (user) {
      activeUsers.delete(socket.id);
      socket.broadcast.emit('user_disconnected', user);
    }
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
      dashboard: `${API_PREFIX}/dashboard`
    },
    timestamp: new Date().toISOString()
  });
});

// Rotas da API
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/dispositivos`, dispositivoRoutes);
app.use(`${API_PREFIX}/chamados`, chamadoRoutes);

// TODO: Aqui vamos adicionar as rotas quando criarmos
// app.use(`${API_PREFIX}/auth`, authRoutes);
// app.use(`${API_PREFIX}/dispositivos`, dispositivosRoutes);
// app.use(`${API_PREFIX}/chamados`, chamadosRoutes);
// app.use(`${API_PREFIX}/manutencao`, manutencaoRoutes);
// app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);

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

    // Iniciar servidor
    server.listen(PORT, () => {
      console.log('🚀 ProEngControl - PEC API');
      console.log(`📡 Servidor rodando na porta ${PORT}`);
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