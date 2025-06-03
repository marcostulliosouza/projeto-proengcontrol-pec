import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { ApiResponse, AuthUser } from '../types';
import { asyncHandler } from '../middlewares/errorHandler';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { login, senha } = req.body;

  // Validar dados de entrada
  if (!login || !senha) {
    res.status(400).json({
      success: false,
      message: 'Login e senha são obrigatórios',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  // Buscar usuário
  const user = await UserModel.findByLogin(login);
  
  if (!user) {
    res.status(401).json({
      success: false,
      message: 'Credenciais inválidas',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  // Verificar senha
  const isValidPassword = await UserModel.verifyPassword(senha, user.col_senha);
  
  if (!isValidPassword) {
    res.status(401).json({
      success: false,
      message: 'Credenciais inválidas',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  // Buscar nome da categoria
  const categoria = await UserModel.getCategory(user.col_categoria);

  // Gerar token JWT
  const authUser: AuthUser = {
    id: user.col_id,
    nome: user.col_nome,
    login: user.col_login,
    categoria: user.col_categoria
  };

  const token = jwt.sign(
    authUser,
    process.env.JWT_SECRET as string
  );

  res.json({
    success: true,
    message: 'Login realizado com sucesso',
    data: {
      user: {
        id: user.col_id,
        nome: user.col_nome,
        login: user.col_login,
        categoria: user.col_categoria,
        categoriaNome: categoria
      },
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

export const me = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'Usuário não autenticado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const user = await UserModel.findById(userId);
  
  if (!user) {
    res.status(404).json({
      success: false,
      message: 'Usuário não encontrado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const categoria = await UserModel.getCategory(user.col_categoria);

  res.json({
    success: true,
    message: 'Dados do usuário obtidos com sucesso',
    data: {
      id: user.col_id,
      nome: user.col_nome,
      login: user.col_login,
      categoria: user.col_categoria,
      categoriaNome: categoria
    },
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  // Em uma implementação real, você poderia invalidar o token
  // Por enquanto, apenas retornamos sucesso
  res.json({
    success: true,
    message: 'Logout realizado com sucesso',
    timestamp: new Date().toISOString()
  } as ApiResponse);
});