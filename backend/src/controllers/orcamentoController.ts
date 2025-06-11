import { Request, Response } from 'express';
import { OrcamentoModel } from '../models/Orcamento';
import { ApiResponse, AuthRequest } from '../types';
import { asyncHandler } from '../middlewares/errorHandler';

// Listar orçamentos
export const getOrcamentos = asyncHandler(async (req: Request, res: Response) => {
  const filtros = {
    ano: req.query.ano ? parseInt(req.query.ano as string) : undefined,
    centroCusto: req.query.centroCusto as string,
    categoria: req.query.categoria ? parseInt(req.query.categoria as string) : undefined
  };

  const orcamentos = await OrcamentoModel.findAll(filtros);

  res.json({
    success: true,
    message: 'Orçamentos obtidos com sucesso',
    data: orcamentos,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Buscar orçamento por ID
export const getOrcamento = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    res.status(400).json({
      success: false,
      message: 'ID inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const orcamento = await OrcamentoModel.findById(id);
  
  if (!orcamento) {
    res.status(404).json({
      success: false,
      message: 'Orçamento não encontrado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Orçamento obtido com sucesso',
    data: orcamento,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Criar orçamento
export const createOrcamento = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { cav_id, orc_centro_custo, orc_ano, orc_orcado } = req.body;

  // Validações básicas
  if (!cav_id || !orc_centro_custo || !orc_ano || !orc_orcado) {
    res.status(400).json({
      success: false,
      message: 'Categoria, centro de custo, ano e valor orçado são obrigatórios',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  if (orc_orcado <= 0) {
    res.status(400).json({
      success: false,
      message: 'Valor orçado deve ser maior que zero',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  if (orc_ano < 2020 || orc_ano > 2050) {
    res.status(400).json({
      success: false,
      message: 'Ano deve estar entre 2020 e 2050',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const orcamentoData = {
    cav_id,
    orc_centro_custo: orc_centro_custo.trim().toUpperCase(),
    orc_ano: parseInt(orc_ano),
    orc_orcado: parseFloat(orc_orcado)
  };

  try {
    const orcamentoId = await OrcamentoModel.create(orcamentoData);

    res.status(201).json({
      success: true,
      message: 'Orçamento criado com sucesso',
      data: { id: orcamentoId },
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao criar orçamento',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});

// Atualizar orçamento
export const updateOrcamento = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    res.status(400).json({
      success: false,
      message: 'ID inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const { cav_id, orc_centro_custo, orc_ano, orc_orcado } = req.body;

  if (!cav_id || !orc_centro_custo || !orc_ano || !orc_orcado) {
    res.status(400).json({
      success: false,
      message: 'Todos os campos são obrigatórios',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  if (orc_orcado <= 0) {
    res.status(400).json({
      success: false,
      message: 'Valor orçado deve ser maior que zero',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const orcamentoData = {
    cav_id,
    orc_centro_custo: orc_centro_custo.trim().toUpperCase(),
    orc_ano: parseInt(orc_ano),
    orc_orcado: parseFloat(orc_orcado)
  };

  const updated = await OrcamentoModel.update(id, orcamentoData);

  if (!updated) {
    res.status(404).json({
      success: false,
      message: 'Orçamento não encontrado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Orçamento atualizado com sucesso',
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Deletar orçamento
export const deleteOrcamento = asyncHandler(async (req: AuthRequest, res: Response) => {
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
    const deleted = await OrcamentoModel.delete(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Orçamento não encontrado',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      message: 'Orçamento removido com sucesso',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao deletar orçamento',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});

// Verificar disponibilidade orçamentária
export const verificarDisponibilidade = asyncHandler(async (req: Request, res: Response) => {
  const { categoriaId, centroCusto, ano, valor } = req.query;

  if (!categoriaId || !centroCusto || !ano || !valor) {
    res.status(400).json({
      success: false,
      message: 'Categoria, centro de custo, ano e valor são obrigatórios',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const disponibilidade = await OrcamentoModel.verificarDisponibilidade(
    parseInt(categoriaId as string),
    centroCusto as string,
    parseInt(ano as string),
    parseFloat(valor as string)
  );

  res.json({
    success: true,
    message: 'Disponibilidade verificada com sucesso',
    data: disponibilidade,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Resumo geral do orçamento
export const getResumoGeral = asyncHandler(async (req: Request, res: Response) => {
  const ano = req.query.ano ? parseInt(req.query.ano as string) : undefined;
  
  const resumo = await OrcamentoModel.getResumoGeral(ano);

  res.json({
    success: true,
    message: 'Resumo geral obtido com sucesso',
    data: resumo,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Alertas de orçamento
export const getAlertasOrcamento = asyncHandler(async (req: Request, res: Response) => {
  const limite = req.query.limite ? parseInt(req.query.limite as string) : 80;
  
  const alertas = await OrcamentoModel.getAlertasOrcamento(limite);

  res.json({
    success: true,
    message: 'Alertas de orçamento obtidos com sucesso',
    data: alertas,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Obter centros de custo
export const getCentrosCusto = asyncHandler(async (req: Request, res: Response) => {
  const centros = await OrcamentoModel.getCentrosCusto();

  res.json({
    success: true,
    message: 'Centros de custo obtidos com sucesso',
    data: centros,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Obter anos de orçamento
export const getAnosOrcamento = asyncHandler(async (req: Request, res: Response) => {
  const anos = await OrcamentoModel.getAnosOrcamento();

  res.json({
    success: true,
    message: 'Anos de orçamento obtidos com sucesso',
    data: anos,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Dashboard de orçamento
export const getDashboardOrcamento = asyncHandler(async (req: Request, res: Response) => {
  const anoAtual = new Date().getFullYear();
  
  try {
    const [resumoGeral, alertas] = await Promise.all([
      OrcamentoModel.getResumoGeral(anoAtual),
      OrcamentoModel.getAlertasOrcamento(80)
    ]);

    const dashboard = {
      ano: anoAtual,
      totais: resumoGeral.totais,
      resumoPorCategoria: resumoGeral.resumoPorCategoria.slice(0, 5), // Top 5
      resumoPorCentro: resumoGeral.resumoPorCentro.slice(0, 5), // Top 5
      alertas: alertas.length,
      alertasDetalhes: alertas.slice(0, 3) // Primeiros 3 alertas
    };

    res.json({
      success: true,
      message: 'Dashboard de orçamento obtido com sucesso',
      data: dashboard,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    console.error('Erro ao gerar dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao gerar dashboard',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});