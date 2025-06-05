import { Request, Response } from 'express';
import { ChamadoModel } from '../models/Chamado';
import { AtendimentoAtivoModel } from '../models/AtendimentoAtivo';
import { ApiResponse, AuthRequest, PaginationParams, FilterParams } from '../types';
import { asyncHandler } from '../middlewares/errorHandler';
import { executeQuery } from '../config/database';

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

// Buscar detratores por tipo de chamado (seguindo a lógica do Python)
export const getDetratoresByTipo = asyncHandler(async (req: Request, res: Response) => {
  const tipoId = parseInt(req.params.tipoId);

  if (isNaN(tipoId)) {
    res.status(400).json({
      success: false,
      message: 'ID do tipo inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
}

try {
  // Lógica igual ao Python: busca detratores do tipo OU sem tipo (dtr_tipo IS NULL)
  const query = `
    SELECT 
      d.dtr_id,
      d.dtr_descricao,
      d.dtr_tipo,
      tc.tch_descricao,
      d.dtr_indicador
    FROM detratores d
    LEFT JOIN tipos_chamado tc ON d.dtr_tipo = tc.tch_id
    WHERE d.dtr_ativo = 1 
    AND (d.dtr_tipo IS NULL OR d.dtr_tipo = ?)
    ORDER BY d.dtr_descricao ASC
  `;
  
  const detratores = await executeQuery(query, [tipoId]);
  
  res.json({
    success: true,
    message: 'Detratores obtidos com sucesso',
    data: detratores,
    timestamp: new Date().toISOString()
  } as ApiResponse);
} catch (error) {
  console.error('Erro ao buscar detratores:', error);
  res.status(500).json({
    success: false,
    message: 'Erro ao buscar detratores',
    timestamp: new Date().toISOString()
  } as ApiResponse);
}
});

// Buscar ações por detrator (baseado na estrutura do banco)
export const getAcoesByDetrator = asyncHandler(async (req: Request, res: Response) => {
const detratorId = parseInt(req.params.detratorId);

if (isNaN(detratorId)) {
  res.status(400).json({
    success: false,
    message: 'ID do detrator inválido',
    timestamp: new Date().toISOString()
  } as ApiResponse);
  return;
}

try {
  const query = `
    SELECT ach_id, ach_descricao, ach_detrator
    FROM acoes_chamados 
    WHERE ach_detrator = ?
    ORDER BY ach_descricao ASC
  `;
  
  const acoes = await executeQuery(query, [detratorId]);
  
  res.json({
    success: true,
    message: 'Ações obtidas com sucesso',
    data: acoes,
    timestamp: new Date().toISOString()
  } as ApiResponse);
} catch (error) {
  console.error('Erro ao buscar ações:', error);
  res.status(500).json({
    success: false,
    message: 'Erro ao buscar ações',
    timestamp: new Date().toISOString()
  } as ApiResponse);
}
});

// Finalizar chamado COM detrator e descrição (seguindo lógica do closeCall)
export const finalizarChamado = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { detrator_id, descricao_atendimento } = req.body;
  
  console.log('🔍 Backend - finalizarChamado chamado com:');
  console.log('- ID:', id, typeof id);
  console.log('- Detrator ID:', detrator_id, typeof detrator_id);
  console.log('- Descrição:', descricao_atendimento, typeof descricao_atendimento);
  
  if (isNaN(id)) {
    res.status(400).json({
      success: false,
      message: 'ID do chamado é inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }
  
  if (!detrator_id) {
    res.status(400).json({
      success: false,
      message: 'Detrator é obrigatório',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  // Validar descrição do atendimento
  if (!descricao_atendimento || typeof descricao_atendimento !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Descrição do atendimento é obrigatória',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const descricao = descricao_atendimento.trim();
  if (descricao.length === 0) {
    res.status(400).json({
      success: false,
      message: 'Descrição do atendimento não pode estar vazia',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  if (descricao.length > 250) {
    res.status(400).json({
      success: false,
      message: 'Descrição do atendimento deve ter no máximo 250 caracteres',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  try {
    console.log('✅ Validações passaram, finalizando chamado...');
    
    // Usar a nova função que segue a lógica exata do Python
    await AtendimentoAtivoModel.finalizarComDetrator(id, detrator_id, descricao);

    console.log('✅ Chamado finalizado com sucesso');

    // NOVO: Emitir evento via WebSocket para todos os usuários
    const io = req.app.get('io');
    if (io) {
      console.log(`📡 Emitindo evento de finalização para chamado ${id}`);
      io.emit('user_finished_attendance', {
        chamadoId: id,
        userId: req.user?.id
      });
    }

    res.json({
      success: true,
      message: 'Chamado finalizado com sucesso',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    console.error('❌ Erro ao finalizar chamado:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao finalizar chamado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});

// Relatório de detratores
export const getRelatorioDetratores = asyncHandler(async (req: Request, res: Response) => {
  const { dataInicio, dataFim } = req.query;

  if (!dataInicio || !dataFim) {
    res.status(400).json({
      success: false,
      message: 'Data de início e fim são obrigatórias',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  try {
    const query = `
      SELECT 
        d.dtr_id,
        d.dtr_descricao as detrator_descricao,
        d.dtr_indicador,
        tc.tch_descricao as tipo_chamado,
        COUNT(DISTINCT c.cha_id) as total_ocorrencias,
        COUNT(DISTINCT ac.ach_id) as total_acoes_distintas,
        AVG(TIMESTAMPDIFF(MINUTE, c.cha_data_hora_abertura, c.cha_data_hora_termino)) as tempo_medio_resolucao,
        GROUP_CONCAT(DISTINCT ac.ach_descricao SEPARATOR '; ') as acoes_utilizadas
      FROM chamados c
      INNER JOIN acoes_chamados ac ON c.cha_acao = ac.ach_id
      INNER JOIN detratores d ON ac.ach_detrator = d.dtr_id
      LEFT JOIN tipos_chamado tc ON d.dtr_tipo = tc.tch_id
      WHERE c.cha_status = 3 
      AND DATE(c.cha_data_hora_termino) BETWEEN ? AND ?
      GROUP BY d.dtr_id, d.dtr_descricao, d.dtr_indicador, tc.tch_descricao
      ORDER BY total_ocorrencias DESC, d.dtr_indicador DESC
    `;
    
    const relatorio = await executeQuery(query, [dataInicio, dataFim]);
    
    res.json({
      success: true,
      message: 'Relatório de detratores obtido com sucesso',
      data: relatorio,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    console.error('Erro ao gerar relatório de detratores:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});