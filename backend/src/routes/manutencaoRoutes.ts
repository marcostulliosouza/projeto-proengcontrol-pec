import { Router } from 'express';
import {
  getDispositivosManutencao,
  verificarManutencaoAndamento,
  iniciarManutencao,
  finalizarManutencao,
  cancelarManutencao,
  getHistoricoManutencoes,
  getDetalhesManutencao,
  getFormulariosManutencao,
  getItensFormulario,
  criarFormulario,
  atualizarFormulario,
  getMetricasManutencao
} from '../controllers/manutencaoController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Dispositivos para manutenção
router.get('/dispositivos', getDispositivosManutencao);

// Manutenção do usuário
router.get('/minha-manutencao', verificarManutencaoAndamento);
router.post('/iniciar', iniciarManutencao);
router.put('/:id/finalizar', finalizarManutencao);
router.delete('/:id/cancelar', cancelarManutencao);

// Histórico e relatórios
router.get('/historico', getHistoricoManutencoes);
router.get('/metricas', requireRole([1, 2, 3]), getMetricasManutencao); // Admin, Gerente, Supervisor
router.get('/:id/detalhes', getDetalhesManutencao);

// Formulários (apenas supervisores+)
router.get('/formularios', requireRole([1, 2, 3]), getFormulariosManutencao);
router.get('/formularios/:formularioId/itens', requireRole([1, 2, 3]), getItensFormulario);
router.post('/formularios', requireRole([1, 2, 3]), criarFormulario);
router.put('/formularios/:id', requireRole([1, 2, 3]), atualizarFormulario);

export default router;