import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, AuthUser } from '@/types';

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Token de acesso requerido',
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Erro na verificação do token:', error);
    res.status(403).json({
      success: false,
      message: 'Token inválido ou expirado',
      timestamp: new Date().toISOString()
    });
  }
};

export const requireRole = (allowedCategories: number[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuário não autenticado',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!allowedCategories.includes(req.user.categoria)) {
      res.status(403).json({
        success: false,
        message: 'Permissão insuficiente para acessar este recurso',
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};