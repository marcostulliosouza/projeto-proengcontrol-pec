// src/routes/relatoriosRoutes.ts

import { Router } from 'express';
import { 
  getChamadosPorPeriodo,
  getStatusDispositivos,
  getManutencoesPpreventivas,
  getIndicadoresProducao,
  exportarRelatorio,
  getOpcoesRelatorio
} from '../controllers/relatoriosController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// Rotas de relatórios específicos
router.get('/chamados-periodo', requireRole([1, 2, 3]), getChamadosPorPeriodo);
router.get('/dispositivos-status', requireRole([1, 2, 3]), getStatusDispositivos);
router.get('/manutencoes-preventivas', requireRole([1, 2, 3]), getManutencoesPpreventivas);
router.get('/producao-indicadores', requireRole([1, 2]), getIndicadoresProducao); // Apenas supervisores e admins

// Rota para exportação
router.post('/exportar', requireRole([1, 2, 3]), exportarRelatorio);

// Rotas para opções de filtros
router.get('/opcoes/clientes', getOpcoesRelatorio);
router.get('/opcoes/status', getOpcoesRelatorio);
router.get('/opcoes/tipos', getOpcoesRelatorio);

export default router;