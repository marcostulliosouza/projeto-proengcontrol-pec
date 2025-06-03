import { Router } from 'express';
import { login, me, logout } from '../controllers/authController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// POST /api/v1/auth/login - Fazer login
router.post('/login', login);

// GET /api/v1/auth/me - Obter dados do usuário logado
router.get('/me', authenticateToken, me);

// POST /api/v1/auth/logout - Fazer logout
router.post('/logout', authenticateToken, logout);

export default router;