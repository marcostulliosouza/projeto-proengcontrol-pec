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
  getMetricasManutencao,
  getDispositivoDetalhes
} from '../controllers/manutencaoController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Dispositivos para manutenção
router.get('/dispositivos', getDispositivosManutencao);

// Detalhes específicos de um dispositivo
router.get('/dispositivo/:dispositivoId/detalhes', getDispositivoDetalhes);

// Manutenção do usuário
router.get('/minha-manutencao', verificarManutencaoAndamento);
router.post('/iniciar', iniciarManutencao);
router.put('/:id/finalizar', finalizarManutencao);
router.delete('/:id/cancelar', cancelarManutencao);

// Histórico e relatórios
router.get('/historico', getHistoricoManutencoes);
router.get('/metricas',  getMetricasManutencao); // Admin, Gerente, Supervisor
router.get('/:id/detalhes', getDetalhesManutencao);

// Formulários (apenas supervisores+)
router.get('/formularios',  getFormulariosManutencao);
router.get('/formularios/:formularioId/itens', getItensFormulario);
router.post('/formularios',  criarFormulario);
router.put('/formularios/:id', atualizarFormulario);

export default router;