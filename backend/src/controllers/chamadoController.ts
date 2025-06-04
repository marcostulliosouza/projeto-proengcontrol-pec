import { Request, Response } from 'express';
import { ChamadoModel } from '../models/Chamado';
import { AtendimentoAtivoModel } from '../models/AtendimentoAtivo';
import { ApiResponse, AuthRequest, PaginationParams, FilterParams } from '../types';
import { asyncHandler } from '../middlewares/errorHandler';

export const getChamados = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  const pagination: PaginationParams = { page, limit, offset };
  
  const filters: FilterParams = {
    search: req.query.search as string,
    status: req.query.status ? parseInt(req.query.status as string) : undefined,
    cliente: req.query.cliente ? parseInt(req.query.cliente as string) : undefined,
    tipo: req.query.tipo ? parseInt(req.query.tipo as string) : undefined,
    dataInicio: req.query.dataInicio as string,
    dataFim: req.query.dataFim as string,
  };

  const { chamados, total } = await ChamadoModel.findAll(pagination, filters);
  
  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    message: 'Chamados obtidos com sucesso',
    data: {
      chamados,
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

export const getChamado = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    res.status(400).json({
      success: false,
      message: 'ID inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const chamado = await ChamadoModel.findById(id);
  
  if (!chamado) {
    res.status(404).json({
      success: false,
      message: 'Chamado não encontrado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Chamado obtido com sucesso',
    data: chamado,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

export const createChamado = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { cha_tipo, cha_cliente, cha_produto, cha_DT, cha_descricao } = req.body;
  const operador = req.user?.nome || 'Sistema';

  // Validações básicas
  if (!cha_tipo || !cha_cliente || !cha_descricao) {
    res.status(400).json({
      success: false,
      message: 'Tipo, cliente e descrição são obrigatórios',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const chamadoData = {
    cha_tipo,
    cha_cliente,
    cha_produto: cha_produto || null,
    cha_DT: cha_DT || '',
    cha_descricao: cha_descricao.trim()
  };

  const chamadoId = await ChamadoModel.create(chamadoData, operador);

  res.status(201).json({
    success: true,
    message: 'Chamado criado com sucesso',
    data: { id: chamadoId },
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

export const updateChamado = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    res.status(400).json({
      success: false,
      message: 'ID inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const { cha_tipo, cha_cliente, cha_produto, cha_DT, cha_descricao, cha_status, cha_acao } = req.body;

  if (!cha_tipo || !cha_cliente || !cha_descricao) {
    res.status(400).json({
      success: false,
      message: 'Tipo, cliente e descrição são obrigatórios',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const chamadoData = {
    cha_tipo,
    cha_cliente,
    cha_produto: cha_produto || null,
    cha_DT: cha_DT || '',
    cha_descricao: cha_descricao.trim(),
    cha_status: cha_status || 1,
    cha_acao: cha_acao || null
  };

  const updated = await ChamadoModel.update(id, chamadoData);

  if (!updated) {
    res.status(404).json({
      success: false,
      message: 'Chamado não encontrado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Chamado atualizado com sucesso',
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

export const iniciarAtendimento = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const colaboradorId = req.user?.id;
  
  if (isNaN(id) || !colaboradorId) {
    res.status(400).json({
      success: false,
      message: 'ID inválido ou usuário não identificado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  try {
    // USAR NOVO MODELO
    await AtendimentoAtivoModel.iniciar(id, colaboradorId);

    res.json({
      success: true,
      message: 'Atendimento iniciado com sucesso',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error instanceof Error ? error.message : 'Erro ao iniciar atendimento'),
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});

export const finalizarChamado = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { acao_id } = req.body;
  
  if (isNaN(id) || !acao_id) {
    res.status(400).json({
      success: false,
      message: 'ID e ação são obrigatórios',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  try {
    // USAR NOVO MODELO
    await AtendimentoAtivoModel.finalizar(id, acao_id);

    res.json({
      success: true,
      message: 'Chamado finalizado com sucesso',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao finalizar chamado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});

export const cancelarAtendimento = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    res.status(400).json({
      success: false,
      message: 'ID inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  try {
    await AtendimentoAtivoModel.cancelar(id);

    res.json({
      success: true,
      message: 'Atendimento cancelado com sucesso',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao cancelar atendimento',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});

// Endpoints auxiliares
export const getTipos = asyncHandler(async (req: Request, res: Response) => {
  const tipos = await ChamadoModel.getTipos();
  
  res.json({
    success: true,
    message: 'Tipos obtidos com sucesso',
    data: tipos,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

export const getStatusChamado = asyncHandler(async (req: Request, res: Response) => {
  const status = await ChamadoModel.getStatus();
  
  res.json({
    success: true,
    message: 'Status obtidos com sucesso',
    data: status,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

export const getProdutosByCliente = asyncHandler(async (req: Request, res: Response) => {
  const clienteId = parseInt(req.params.clienteId);
  
  if (isNaN(clienteId)) {
    res.status(400).json({
      success: false,
      message: 'ID do cliente inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const produtos = await ChamadoModel.getProdutosByCliente(clienteId);
  
  res.json({
    success: true,
    message: 'Produtos obtidos com sucesso',
    data: produtos,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

export const getAcoes = asyncHandler(async (req: Request, res: Response) => {
  const acoes = await ChamadoModel.getAcoes();
  
  res.json({
    success: true,
    message: 'Ações obtidas com sucesso',
    data: acoes,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});