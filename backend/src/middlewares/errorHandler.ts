import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Erro interno do servidor';

  // Log do erro para debug
  console.error('Error details:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Tratamento específico para erros do MySQL
  if (error.message.includes('ER_DUP_ENTRY')) {
    statusCode = 409;
    message = 'Registro duplicado. Este item já existe no sistema.';
  } else if (error.message.includes('ER_NO_REFERENCED_ROW')) {
    statusCode = 400;
    message = 'Referência inválida. Verifique os dados informados.';
  } else if (error.message.includes('ER_ROW_IS_REFERENCED')) {
    statusCode = 409;
    message = 'Não é possível excluir. Este registro está sendo usado por outros itens.';
  }

  const response: ApiResponse = {
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    timestamp: new Date().toISOString()
  };

  res.status(statusCode).json(response);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};