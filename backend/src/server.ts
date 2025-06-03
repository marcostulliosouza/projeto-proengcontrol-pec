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
const usersInAttendance = new Map(); // userId -> { chamadoId, startTime, socketId }
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
    
    // Verificar se usuário já está em atendimento
    const userInAttendance = Array.from(usersInAttendance.entries())
      .find(([userId, data]) => userId === userData.id);
    
    if (userInAttendance) {
      socket.emit('user_in_attendance', {
        chamadoId: userInAttendance[1].chamadoId,
        startTime: userInAttendance[1].startTime
      });
    }
    
    socket.broadcast.emit('user_connected', userData);
  });

  // Iniciar atendimento - NOVO
  socket.on('start_attendance', (data) => {
    const { chamadoId, userId, userName } = data;
    
    // Verificar se usuário já está atendendo algo
    if (usersInAttendance.has(userId)) {
      socket.emit('attendance_blocked', { 
        reason: 'Você já está atendendo outro chamado' 
      });
      return;
    }
    
    // Verificar se chamado já está sendo atendido
    const existingAttendance = Array.from(usersInAttendance.values())
      .find(attendance => attendance.chamadoId === chamadoId);
    
    if (existingAttendance) {
      socket.emit('attendance_blocked', { 
        reason: 'Este chamado já está sendo atendido' 
      });
      return;
    }
    
    // Registrar atendimento
    const attendanceData = {
      chamadoId,
      userId,
      userName,
      socketId: socket.id,
      startTime: new Date().toISOString()
    };
    
    usersInAttendance.set(userId, attendanceData);
    
    socket.emit('attendance_started', attendanceData);
    socket.broadcast.emit('user_started_attendance', attendanceData);
  });

  // Finalizar atendimento - NOVO
  socket.on('finish_attendance', (data) => {
    const { userId } = data;
    
    if (usersInAttendance.has(userId)) {
      const attendanceData = usersInAttendance.get(userId);
      usersInAttendance.delete(userId);
      
      socket.emit('attendance_finished');
      socket.broadcast.emit('user_finished_attendance', {
        userId,
        chamadoId: attendanceData.chamadoId
      });
    }
  });

  // Lock de chamado (mantém o existente, mas adapta)
  socket.on('lock_chamado', (data) => {
    const { chamadoId, userId, userName } = data;
    
    // Verificar se usuário está em atendimento
    if (usersInAttendance.has(userId)) {
      const currentAttendance = usersInAttendance.get(userId);
      if (currentAttendance.chamadoId !== chamadoId) {
        socket.emit('lock_failed', { 
          chamadoId, 
          reason: 'Você está atendendo outro chamado' 
        });
        return;
      }
    }
    
    if (!chamadoLocks.has(chamadoId)) {
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
      const lockInfo = chamadoLocks.get(chamadoId);
      socket.emit('lock_failed', { 
        chamadoId, 
        lockedBy: lockInfo 
      });
    }
  });

  // Timer de atendimento com broadcast
  socket.on('timer_update', (data) => {
    const { chamadoId, seconds, userId } = data;
    
    // Broadcast para todos exceto o remetente
    socket.broadcast.emit('timer_updated', {
      chamadoId,
      seconds,
      userId,
      timestamp: new Date().toISOString()
    });
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
    
    // Remover atendimento (mas manter dados para reconexão em 30 segundos)
    const user = activeUsers.get(socket.id);
    if (user) {
      const userAttendance = usersInAttendance.get(user.id);
      if (userAttendance) {
        // Dar 30 segundos para reconexão
        setTimeout(() => {
          if (usersInAttendance.has(user.id)) {
            usersInAttendance.delete(user.id);
            io.emit('user_finished_attendance', {
              userId: user.id,
              chamadoId: userAttendance.chamadoId,
              reason: 'Desconexão'
            });
          }
        }, 30000);
      }
      
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