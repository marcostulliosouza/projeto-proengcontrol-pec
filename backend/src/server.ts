// Em backend/src/server.ts - VERSÃO COMPLETA ATUALIZADA:

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
import { AtendimentoAtivoModel } from './models/AtendimentoAtivo';

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

// Store para usuários conectados
const activeUsers = new Map();

// Função para broadcast de atendimentos ativos
const broadcastActiveAttendances = async () => {
  try {
    const atendimentos = await AtendimentoAtivoModel.listarAtivos();
    io.emit('active_attendances_updated', atendimentos);
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

// Limpeza automática a cada 2 minutos (pode manter se necessário)
setInterval(async () => {
  try {
    // Limpar conexões órfãs se necessário
    await broadcastActiveAttendances();
  } catch (error) {
    console.error('Erro na limpeza automática:', error);
  }
}, 120000);

// Configuração do WebSocket
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  // Usuário se autentica
  socket.on('authenticate', async (userData) => {
    activeUsers.set(socket.id, {
      ...userData,
      socketId: socket.id,
      connectedAt: new Date()
    });
    
    try {
      // Verificar se usuário já está em atendimento
      const atendimentoAtivo = await AtendimentoAtivoModel.buscarPorColaborador(userData.id);
      
      if (atendimentoAtivo) {
        socket.emit('user_in_attendance', {
          chamadoId: atendimentoAtivo.atc_chamado,
          userId: atendimentoAtivo.atc_colaborador,
          userName: atendimentoAtivo.colaborador_nome,
          startTime: atendimentoAtivo.atc_data_hora_inicio,
          elapsedSeconds: atendimentoAtivo.tempo_decorrido || 0
        });
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

  // Iniciar atendimento
  socket.on('start_attendance', async (data) => {
    const { chamadoId, userId, userName } = data;
    
    try {
      await AtendimentoAtivoModel.iniciar(chamadoId, userId);
      
      const attendanceData = {
        chamadoId,
        userId,
        userName,
        socketId: socket.id,
        startTime: new Date().toISOString()
      };
      
      socket.emit('attendance_started', attendanceData);
      socket.broadcast.emit('user_started_attendance', attendanceData);
      
      // Broadcast atualização geral
      await broadcastActiveAttendances();
    } catch (error) {
      socket.emit('attendance_blocked', { 
        reason: (error as any)?.message || 'Não foi possível iniciar atendimento' 
      });
    }
  });

  // Finalizar atendimento
  socket.on('finish_attendance', async (data) => {
    const { userId } = data;
    
    try {
      // Buscar atendimento ativo do usuário
      const atendimentoAtivo = await AtendimentoAtivoModel.buscarPorColaborador(userId);
      
      if (atendimentoAtivo) {
        socket.emit('attendance_finished');
        socket.broadcast.emit('user_finished_attendance', {
          userId,
          chamadoId: atendimentoAtivo.atc_chamado
        });
        
        // Broadcast atualização geral
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
      await AtendimentoAtivoModel.cancelar(chamadoId);
      
      socket.emit('attendance_cancelled');
      socket.broadcast.emit('user_cancelled_attendance', {
        userId,
        chamadoId
      });
      
      // Broadcast atualização geral
      await broadcastActiveAttendances();
    } catch (error) {
      console.error('Erro ao cancelar atendimento:', error);
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

  // Sincronizar timers (não usado mais - agora é automático)
  socket.on('sync_timers', async () => {
    try {
      const atendimentos = await AtendimentoAtivoModel.listarAtivos();
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
      console.error('Erro ao sincronizar timers:', error);
    }
  });

  // Desconexão
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    
    const user = activeUsers.get(socket.id);
    if (user) {
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
    environment: process.env.NODE_ENV
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