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

app.set('io', io);

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
    
    if (!novoUserEntry) {
      socket.emit('transfer_error', { message: 'Usuário destino não está online', chamadoId });
      return;
    }
    
    const timestamp = new Date().toISOString();
    
    // 1. PRIMEIRO: Notificar quem transferiu para fechar modal
    socket.emit('user_transferred_out', {
      chamadoId,
      userId: antigoColaboradorId,
      timestamp
    });
    
    // 2. SEGUNDO: Aguardar um pouco e notificar quem recebeu
    setTimeout(() => {
      io.to(novoUserEntry.socketId).emit('user_transferred_in', {
        chamadoId,
        userId: novoColaboradorId,
        userName: novoUserEntry.nome,
        startTime: timestamp,
        motivo: 'transferred_in',
        transferredBy: antigoUser?.nome || 'Usuário',
        timestamp
      });
      
      // 3. TERCEIRO: Broadcast geral para atualizar timers
      socket.broadcast.emit('user_started_attendance', {
        chamadoId,
        userId: novoColaboradorId,
        userName: novoUserEntry.nome,
        startTime: timestamp,
        motivo: 'transferred_general'
      });
      
      console.log(`✅ Socket: Eventos de transferência emitidos em sequência`);
    }, 500);
    
    // 4. QUARTO: Atualizar broadcasts após delay maior
    setTimeout(async () => {
      await broadcastActiveAttendances();
    }, 2000);
    
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