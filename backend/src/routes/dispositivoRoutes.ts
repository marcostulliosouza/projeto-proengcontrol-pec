import { Router } from 'express';
import {
  getDispositivos,
  getDispositivo,
  createDispositivo,
  updateDispositivo,
  deleteDispositivo,
  getClientes,
  getStatus
} from '../controllers/dispositivoController';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// GET /api/v1/dispositivos - Listar dispositivos
router.get('/', getDispositivos);

// GET /api/v1/dispositivos/clientes - Obter clientes
router.get('/clientes', getClientes);

// GET /api/v1/dispositivos/status - Obter status
router.get('/status', getStatus);

// GET /api/v1/dispositivos/:id - Obter dispositivo específico
router.get('/:id', getDispositivo);

// POST /api/v1/dispositivos - Criar dispositivo
router.post('/', requireRole([2, 3, 4, 5]), createDispositivo); // Engenheiro+

// PUT /api/v1/dispositivos/:id - Atualizar dispositivo
router.put('/:id', requireRole([2, 3, 4, 5]), updateDispositivo); // Engenheiro+

// DELETE /api/v1/dispositivos/:id - Deletar dispositivo
router.delete('/:id', requireRole([4, 5]), deleteDispositivo); // Admin/Gerente

export default router;