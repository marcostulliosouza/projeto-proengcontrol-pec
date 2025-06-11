import { Request, Response } from 'express';
import { InsumoModel } from '../models/Insumos';
import { ApiResponse, AuthRequest } from '../types';
import { asyncHandler } from '../middlewares/errorHandler';

// Listar insumos
export const getInsumos = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const filtros = {
    search: req.query.search as string,
    categoria: req.query.categoria ? parseInt(req.query.categoria as string) : undefined,
    status: req.query.status as string,
    estoqueBaixo: req.query.estoqueBaixo === 'true',
    page,
    limit
  };

  const { insumos, total } = await InsumoModel.findAll(filtros);
  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    message: 'Insumos obtidos com sucesso',
    data: {
      insumos,
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

// Buscar insumo por ID
export const getInsumo = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    res.status(400).json({
      success: false,
      message: 'ID inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const insumo = await InsumoModel.findById(id);
  
  if (!insumo) {
    res.status(404).json({
      success: false,
      message: 'Insumo não encontrado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Insumo obtido com sucesso',
    data: insumo,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Criar novo insumo
export const createInsumo = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { 
    cai_id, ins_cod_sap, ins_nome, ins_descricao, ins_qtd,
    ins_valor_unit, ins_estoque_minimo, ins_localizacao, ins_observacoes 
  } = req.body;

  // Validações básicas
  if (!cai_id || !ins_nome) {
    res.status(400).json({
      success: false,
      message: 'Categoria e nome são obrigatórios',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  if (ins_valor_unit < 0 || ins_estoque_minimo < 0 || ins_qtd < 0) {
    res.status(400).json({
      success: false,
      message: 'Valores não podem ser negativos',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const insumoData = {
    cai_id,
    ins_cod_sap: ins_cod_sap?.trim() || null,
    ins_nome: ins_nome.trim(),
    ins_descricao: ins_descricao?.trim() || null,
    ins_qtd: parseInt(ins_qtd) || 0,
    ins_valor_unit: parseFloat(ins_valor_unit) || 0,
    ins_estoque_minimo: parseInt(ins_estoque_minimo) || 0,
    ins_localizacao: ins_localizacao?.trim() || null,
    ins_observacoes: ins_observacoes?.trim() || null
  };

  try {
    const insumoId = await InsumoModel.create(insumoData);

    // Se há quantidade inicial, registrar movimentação
    if (insumoData.ins_qtd > 0) {
      await InsumoModel.movimentarEstoque({
        ins_id: insumoId,
        mov_tipo: 'ENTRADA',
        mov_quantidade: insumoData.ins_qtd,
        mov_motivo: 'ESTOQUE INICIAL',
        mov_observacao: 'Cadastro inicial do insumo',
        mov_colaborador: req.user?.id || 1,
        mov_documento: 'CADASTRO'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Insumo criado com sucesso',
      data: { id: insumoId },
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao criar insumo',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});

// Atualizar insumo
export const updateInsumo = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    res.status(400).json({
      success: false,
      message: 'ID inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const { 
    cai_id, ins_cod_sap, ins_nome, ins_descricao,
    ins_valor_unit, ins_estoque_minimo, ins_localizacao, ins_observacoes 
  } = req.body;

  if (!cai_id || !ins_nome) {
    res.status(400).json({
      success: false,
      message: 'Categoria e nome são obrigatórios',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  if (ins_valor_unit < 0 || ins_estoque_minimo < 0) {
    res.status(400).json({
      success: false,
      message: 'Valores não podem ser negativos',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const insumoData = {
    cai_id,
    ins_cod_sap: ins_cod_sap?.trim() || null,
    ins_nome: ins_nome.trim(),
    ins_descricao: ins_descricao?.trim() || null,
    ins_valor_unit: parseFloat(ins_valor_unit) || 0,
    ins_estoque_minimo: parseInt(ins_estoque_minimo) || 0,
    ins_localizacao: ins_localizacao?.trim() || null,
    ins_observacoes: ins_observacoes?.trim() || null
  };

  const updated = await InsumoModel.update(id, insumoData);

  if (!updated) {
    res.status(404).json({
      success: false,
      message: 'Insumo não encontrado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Insumo atualizado com sucesso',
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Deletar insumo
export const deleteInsumo = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    res.status(400).json({
      success: false,
      message: 'ID inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const deleted = await InsumoModel.delete(id);

  if (!deleted) {
    res.status(404).json({
      success: false,
      message: 'Insumo não encontrado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Insumo removido com sucesso',
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Movimentar estoque
export const movimentarEstoque = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { mov_tipo, mov_quantidade, mov_motivo, mov_observacao, mov_documento, mov_centro_custo } = req.body;
  const userId = req.user?.id;

  if (isNaN(id) || !userId) {
    res.status(400).json({
      success: false,
      message: 'ID inválido ou usuário não identificado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  if (!mov_tipo || !mov_quantidade || mov_quantidade <= 0) {
    res.status(400).json({
      success: false,
      message: 'Tipo de movimentação e quantidade são obrigatórios',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  if (!['ENTRADA', 'SAIDA', 'AJUSTE', 'TRANSFERENCIA'].includes(mov_tipo)) {
    res.status(400).json({
      success: false,
      message: 'Tipo de movimentação inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  try {
    await InsumoModel.movimentarEstoque({
      ins_id: id,
      mov_tipo,
      mov_quantidade: parseInt(mov_quantidade),
      mov_motivo: mov_motivo?.trim() || null,
      mov_observacao: mov_observacao?.trim() || null,
      mov_colaborador: userId,
      mov_documento: mov_documento?.trim() || null,
      mov_centro_custo: mov_centro_custo?.trim() || null
    });

    res.json({
      success: true,
      message: 'Movimentação realizada com sucesso',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao movimentar estoque',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});

// Histórico de movimentações
export const getHistoricoMovimentacoes = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const filtros = {
    dataInicio: req.query.dataInicio as string,
    dataFim: req.query.dataFim as string,
    tipo: req.query.tipo as string,
    colaborador: req.query.colaborador ? parseInt(req.query.colaborador as string) : undefined,
    page,
    limit
  };

  const { movimentacoes, total } = await InsumoModel.getHistoricoMovimentacoes(
    isNaN(id) ? undefined : id,
    filtros
  );

  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    message: 'Histórico obtido com sucesso',
    data: {
      movimentacoes,
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

// Relatório de estoque baixo
export const getEstoqueBaixo = asyncHandler(async (req: Request, res: Response) => {
  const insumos = await InsumoModel.getEstoqueBaixo();
  
  res.json({
    success: true,
    message: 'Relatório de estoque baixo obtido com sucesso',
    data: insumos,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Buscar categorias
export const getCategorias = asyncHandler(async (req: Request, res: Response) => {
  const categorias = await InsumoModel.getCategorias();
  
  res.json({
    success: true,
    message: 'Categorias obtidas com sucesso',
    data: categorias,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Dashboard - estatísticas
export const getEstatisticas = asyncHandler(async (req: Request, res: Response) => {
  const estatisticas = await InsumoModel.getEstatisticas();
  
  res.json({
    success: true,
    message: 'Estatísticas obtidas com sucesso',
    data: estatisticas,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Buscar insumos para autocomplete
export const getInsumosAutocomplete = asyncHandler(async (req: Request, res: Response) => {
  const search = req.query.search as string;
  
  if (!search || search.length < 2) {
    res.json({
      success: true,
      data: [],
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const { insumos } = await InsumoModel.findAll({
    search,
    limit: 10
  });

  const simplified = insumos.map(insumo => ({
    ins_id: insumo.ins_id,
    ins_nome: insumo.ins_nome,
    ins_cod_sap: insumo.ins_cod_sap,
    ins_qtd: insumo.ins_qtd,
    ins_estoque_minimo: insumo.ins_estoque_minimo,
    categoria_nome: insumo.categoria_nome
  }));

  res.json({
    success: true,
    message: 'Insumos para autocomplete obtidos com sucesso',
    data: simplified,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});