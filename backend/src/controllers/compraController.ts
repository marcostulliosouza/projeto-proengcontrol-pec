import { Request, Response } from 'express';
import { CompraModel, SolicitacaoCompraModel, FornecedorModel } from '../models/Compra';
import { ApiResponse, AuthRequest } from '../types';
import { asyncHandler } from '../middlewares/errorHandler';

// ===== COMPRAS =====

// Listar compras
export const getCompras = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const filtros = {
    search: req.query.search as string,
    status: req.query.status as string,
    categoria: req.query.categoria ? parseInt(req.query.categoria as string) : undefined,
    dataInicio: req.query.dataInicio as string,
    dataFim: req.query.dataFim as string,
    centroCusto: req.query.centroCusto as string,
    page,
    limit
  };

  const { compras, total } = await CompraModel.findAll(filtros);
  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    message: 'Compras obtidas com sucesso',
    data: {
      compras,
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

// Buscar compra por ID
export const getCompra = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    res.status(400).json({
      success: false,
      message: 'ID inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const compra = await CompraModel.findById(id);
  
  if (!compra) {
    res.status(404).json({
      success: false,
      message: 'Compra não encontrada',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Compra obtida com sucesso',
    data: compra,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Criar nova compra
export const createCompra = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { 
    cav_id, com_rc, com_cod_sap, com_descricao, com_qtd,
    com_valor_unit, com_utilizacao, com_centro_custo, com_conta_razao, for_id
  } = req.body;

  // Validações básicas
  if (!cav_id || !com_rc || !com_descricao || !com_centro_custo || !com_conta_razao) {
    res.status(400).json({
      success: false,
      message: 'Categoria, RC, descrição, centro de custo e conta razão são obrigatórios',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  if (com_qtd <= 0 || com_valor_unit < 0) {
    res.status(400).json({
      success: false,
      message: 'Quantidade deve ser maior que zero e valor não pode ser negativo',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const compraData = {
    cav_id,
    com_rc: com_rc.trim(),
    com_cod_sap: com_cod_sap?.trim() || null,
    com_descricao: com_descricao.trim(),
    com_qtd: parseInt(com_qtd),
    com_valor_unit: parseFloat(com_valor_unit) || 0,
    com_utilizacao: com_utilizacao?.trim() || null,
    com_centro_custo: com_centro_custo.trim(),
    com_conta_razao: com_conta_razao.trim(),
    com_colaborador_abertura: req.user?.id || null,
    for_id: for_id || null
  };

  const compraId = await CompraModel.create(compraData);

  res.status(201).json({
    success: true,
    message: 'Compra criada com sucesso',
    data: { id: compraId },
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Atualizar compra
export const updateCompra = asyncHandler(async (req: AuthRequest, res: Response) => {
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
    cav_id, com_rc, com_cod_sap, com_descricao, com_qtd,
    com_valor_unit, com_utilizacao, com_centro_custo, com_conta_razao, for_id, com_obs
  } = req.body;

  if (!cav_id || !com_rc || !com_descricao || !com_centro_custo || !com_conta_razao) {
    res.status(400).json({
      success: false,
      message: 'Campos obrigatórios não podem estar vazios',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const compraData = {
    cav_id,
    com_rc: com_rc.trim(),
    com_cod_sap: com_cod_sap?.trim() || null,
    com_descricao: com_descricao.trim(),
    com_qtd: parseInt(com_qtd),
    com_valor_unit: parseFloat(com_valor_unit) || 0,
    com_utilizacao: com_utilizacao?.trim() || null,
    com_centro_custo: com_centro_custo.trim(),
    com_conta_razao: com_conta_razao.trim(),
    for_id: for_id || null,
    com_obs: com_obs?.trim() || null
  };

  const updated = await CompraModel.update(id, compraData);

  if (!updated) {
    res.status(404).json({
      success: false,
      message: 'Compra não encontrada',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Compra atualizada com sucesso',
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Aprovar compra
export const aprovarCompra = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { fornecedorId } = req.body;
  const aprovadorId = req.user?.id;

  if (isNaN(id) || !aprovadorId) {
    res.status(400).json({
      success: false,
      message: 'ID inválido ou usuário não identificado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const aprovado = await CompraModel.aprovar(id, aprovadorId, fornecedorId);

  if (!aprovado) {
    res.status(404).json({
      success: false,
      message: 'Compra não encontrada ou já foi processada',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Compra aprovada com sucesso',
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Receber compra
export const receberCompra = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { notaFiscal, dataRecebimento, observacoes } = req.body;
  const colaboradorId = req.user?.id;

  if (isNaN(id) || !colaboradorId) {
    res.status(400).json({
      success: false,
      message: 'ID inválido ou usuário não identificado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  if (!notaFiscal) {
    res.status(400).json({
      success: false,
      message: 'Nota fiscal é obrigatória',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  try {
    const recebido = await CompraModel.receberCompra(id, {
      notaFiscal: notaFiscal.trim(),
      dataRecebimento: dataRecebimento || undefined,
      observacoes: observacoes?.trim() || undefined,
      colaboradorId
    });

    if (!recebido) {
      res.status(404).json({
        success: false,
        message: 'Compra não encontrada ou não está aprovada',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      message: 'Compra recebida e estoque atualizado com sucesso',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao receber compra',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});

// Cancelar compra
export const cancelarCompra = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    res.status(400).json({
      success: false,
      message: 'ID inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const cancelado = await CompraModel.cancelar(id);

  if (!cancelado) {
    res.status(404).json({
      success: false,
      message: 'Compra não encontrada ou não pode ser cancelada',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Compra cancelada com sucesso',
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Buscar categorias de verba
export const getCategoriasVerba = asyncHandler(async (req: Request, res: Response) => {
  const categorias = await CompraModel.getCategoriasVerba();
  
  res.json({
    success: true,
    message: 'Categorias de verba obtidas com sucesso',
    data: categorias,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Relatório de compras
export const getRelatorioCompras = asyncHandler(async (req: Request, res: Response) => {
  const { dataInicio, dataFim, categoria, status, centroCusto } = req.query;

  if (!dataInicio || !dataFim) {
    res.status(400).json({
      success: false,
      message: 'Data de início e fim são obrigatórias',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const filtros = {
    dataInicio: dataInicio as string,
    dataFim: dataFim as string,
    categoria: categoria ? parseInt(categoria as string) : undefined,
    status: status as string,
    centroCusto: centroCusto as string
  };

  const relatorio = await CompraModel.getRelatorioCompras(filtros);

  res.json({
    success: true,
    message: 'Relatório de compras gerado com sucesso',
    data: relatorio,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// ===== SOLICITAÇÕES DE COMPRA =====

// Listar solicitações
export const getSolicitacoes = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const filtros = {
    status: req.query.status as string,
    urgencia: req.query.urgencia as string,
    solicitante: req.query.solicitante ? parseInt(req.query.solicitante as string) : undefined,
    dataInicio: req.query.dataInicio as string,
    dataFim: req.query.dataFim as string,
    page,
    limit
  };

  const { solicitacoes, total } = await SolicitacaoCompraModel.findAll(filtros);
  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    message: 'Solicitações obtidas com sucesso',
    data: {
      solicitacoes,
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

// Criar solicitação de compra
export const createSolicitacao = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { ins_id, sol_quantidade, sol_justificativa, sol_urgencia } = req.body;
  const solicitanteId = req.user?.id;

  if (!ins_id || !sol_quantidade || !solicitanteId) {
    res.status(400).json({
      success: false,
      message: 'Insumo, quantidade e solicitante são obrigatórios',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  if (sol_quantidade <= 0) {
    res.status(400).json({
      success: false,
      message: 'Quantidade deve ser maior que zero',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const solicitacaoData = {
    ins_id,
    sol_quantidade: parseInt(sol_quantidade),
    sol_justificativa: sol_justificativa?.trim() || null,
    sol_urgencia: sol_urgencia || 'MEDIA',
    sol_colaborador_solicitante: solicitanteId
  };

  const solicitacaoId = await SolicitacaoCompraModel.create(solicitacaoData);

  res.status(201).json({
    success: true,
    message: 'Solicitação criada com sucesso',
    data: { id: solicitacaoId },
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Aprovar/Rejeitar solicitação
export const processarSolicitacao = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { status, observacao } = req.body;
  const aprovadorId = req.user?.id;

  if (isNaN(id) || !aprovadorId) {
    res.status(400).json({
      success: false,
      message: 'ID inválido ou usuário não identificado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  if (!status || !['APROVADA', 'REJEITADA'].includes(status)) {
    res.status(400).json({
      success: false,
      message: 'Status deve ser APROVADA ou REJEITADA',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const processado = await SolicitacaoCompraModel.processarSolicitacao(
    id,
    aprovadorId,
    status,
    observacao?.trim()
  );

  if (!processado) {
    res.status(404).json({
      success: false,
      message: 'Solicitação não encontrada ou já foi processada',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: `Solicitação ${status.toLowerCase()} com sucesso`,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// ===== FORNECEDORES =====

// Listar fornecedores
export const getFornecedores = asyncHandler(async (req: Request, res: Response) => {
  const filtros = {
    search: req.query.search as string,
    ativo: req.query.ativo !== undefined ? req.query.ativo === 'true' : true
  };

  const fornecedores = await FornecedorModel.findAll(filtros);

  res.json({
    success: true,
    message: 'Fornecedores obtidos com sucesso',
    data: fornecedores,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Criar fornecedor
export const createFornecedor = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { for_nome, for_cnpj, for_contato, for_telefone, for_email, for_endereco } = req.body;

  if (!for_nome || for_nome.trim() === '') {
    res.status(400).json({
      success: false,
      message: 'Nome do fornecedor é obrigatório',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const fornecedorData = {
    for_nome: for_nome.trim(),
    for_cnpj: for_cnpj?.trim() || null,
    for_contato: for_contato?.trim() || null,
    for_telefone: for_telefone?.trim() || null,
    for_email: for_email?.trim() || null,
    for_endereco: for_endereco?.trim() || null
  };

  const fornecedorId = await FornecedorModel.create(fornecedorData);

  res.status(201).json({
    success: true,
    message: 'Fornecedor criado com sucesso',
    data: { id: fornecedorId },
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Atualizar fornecedor
export const updateFornecedor = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    res.status(400).json({
      success: false,
      message: 'ID inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const { for_nome, for_cnpj, for_contato, for_telefone, for_email, for_endereco } = req.body;

  if (!for_nome || for_nome.trim() === '') {
    res.status(400).json({
      success: false,
      message: 'Nome do fornecedor é obrigatório',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const fornecedorData = {
    for_nome: for_nome.trim(),
    for_cnpj: for_cnpj?.trim() || null,
    for_contato: for_contato?.trim() || null,
    for_telefone: for_telefone?.trim() || null,
    for_email: for_email?.trim() || null,
    for_endereco: for_endereco?.trim() || null
  };

  const updated = await FornecedorModel.update(id, fornecedorData);

  if (!updated) {
    res.status(404).json({
      success: false,
      message: 'Fornecedor não encontrado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Fornecedor atualizado com sucesso',
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Desativar fornecedor
export const desativarFornecedor = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    res.status(400).json({
      success: false,
      message: 'ID inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const desativado = await FornecedorModel.desativar(id);

  if (!desativado) {
    res.status(404).json({
      success: false,
      message: 'Fornecedor não encontrado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Fornecedor desativado com sucesso',
    timestamp: new Date().toISOString()
  } as ApiResponse);
});