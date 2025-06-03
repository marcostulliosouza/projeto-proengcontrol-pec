import { Request, Response } from 'express';
import { DispositivoModel } from '../models/Dispositivo';
import { ApiResponse, AuthRequest, PaginationParams, FilterParams } from '../types';
import { asyncHandler } from '../middlewares/errorHandler';

export const getDispositivos = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  const pagination: PaginationParams = { page, limit, offset };
  
  const filters: FilterParams = {
    search: req.query.search as string,
    status: req.query.status ? parseInt(req.query.status as string) : undefined,
    cliente: req.query.cliente ? parseInt(req.query.cliente as string) : undefined,
  };

  const { dispositivos, total } = await DispositivoModel.findAll(pagination, filters);
  
  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    message: 'Dispositivos obtidos com sucesso',
    data: {
      dispositivos,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    },
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

export const getDispositivo = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    res.status(400).json({
      success: false,
      message: 'ID inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const dispositivo = await DispositivoModel.findById(id);
  
  if (!dispositivo) {
    res.status(404).json({
      success: false,
      message: 'Dispositivo não encontrado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Dispositivo obtido com sucesso',
    data: dispositivo,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

export const createDispositivo = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { dis_descricao, dis_cliente, dis_codigo_sap, dis_observacao, dis_ciclos_de_vida, dis_local } = req.body;

  // Validações básicas
  if (!dis_descricao || dis_descricao.trim() === '') {
    res.status(400).json({
      success: false,
      message: 'Descrição é obrigatória',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const dispositivoData = {
    dis_descricao: dis_descricao.trim(),
    dis_cliente: dis_cliente || null,
    dis_codigo_sap: dis_codigo_sap || null,
    dis_observacao: dis_observacao || null,
    dis_ciclos_de_vida: dis_ciclos_de_vida || 0,
    dis_local: dis_local || null,
    dis_status: 1, // Ativo por padrão
    dis_com_manutencao: 0 // Sem manutenção por padrão
  };

  const dispositivoId = await DispositivoModel.create(dispositivoData);

  res.status(201).json({
    success: true,
    message: 'Dispositivo criado com sucesso',
    data: { id: dispositivoId },
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

export const updateDispositivo = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    res.status(400).json({
      success: false,
      message: 'ID inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const { dis_descricao, dis_cliente, dis_codigo_sap, dis_status, dis_observacao, dis_ciclos_de_vida, dis_local } = req.body;

  if (!dis_descricao || dis_descricao.trim() === '') {
    res.status(400).json({
      success: false,
      message: 'Descrição é obrigatória',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const dispositivoData = {
    dis_descricao: dis_descricao.trim(),
    dis_cliente: dis_cliente || null,
    dis_codigo_sap: dis_codigo_sap || null,
    dis_status: dis_status || 1,
    dis_observacao: dis_observacao || null,
    dis_ciclos_de_vida: dis_ciclos_de_vida || 0,
    dis_local: dis_local || null
  };

  const updated = await DispositivoModel.update(id, dispositivoData);

  if (!updated) {
    res.status(404).json({
      success: false,
      message: 'Dispositivo não encontrado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Dispositivo atualizado com sucesso',
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

export const deleteDispositivo = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    res.status(400).json({
      success: false,
      message: 'ID inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const deleted = await DispositivoModel.delete(id);

  if (!deleted) {
    res.status(404).json({
      success: false,
      message: 'Dispositivo não encontrado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Dispositivo deletado com sucesso',
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Endpoints auxiliares
export const getClientes = asyncHandler(async (req: Request, res: Response) => {
  const clientes = await DispositivoModel.getClientes();
  
  res.json({
    success: true,
    message: 'Clientes obtidos com sucesso',
    data: clientes,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = await DispositivoModel.getStatus();
  
  res.json({
    success: true,
    message: 'Status obtidos com sucesso',
    data: status,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});