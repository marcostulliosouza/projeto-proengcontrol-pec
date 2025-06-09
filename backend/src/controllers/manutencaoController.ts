import { Request, Response } from 'express';
import { ManutencaoPreventivaModel, FormularioManutencaoModel } from '../models/ManutencaoPreventiva';
import { ApiResponse, AuthRequest } from '../types';
import { asyncHandler } from '../middlewares/errorHandler';

// Buscar dispositivos que precisam de manutenção
export const getDispositivosManutencao = asyncHandler(async (req: Request, res: Response) => {
  const dispositivos = await ManutencaoPreventivaModel.getDispositivosManutencao();
  
  res.json({
    success: true,
    message: 'Dispositivos para manutenção obtidos com sucesso',
    data: dispositivos,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Verificar manutenção em andamento para usuário
export const verificarManutencaoAndamento = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'Usuário não identificado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const manutencao = await ManutencaoPreventivaModel.verificarManutencaoAndamento(userId);
  
  res.json({
    success: true,
    message: manutencao ? 'Manutenção em andamento encontrada' : 'Nenhuma manutenção em andamento',
    data: manutencao,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Iniciar manutenção
export const iniciarManutencao = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'Usuário não identificado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const {
    dispositivoId,
    ciclosTotais,
    dataUltimaManutencao,
    tipoIntervalo,
    intervaloDias,
    intervaloPlacas,
    placasExecutadas
  } = req.body;

  // Validações básicas
  if (!dispositivoId) {
    res.status(400).json({
      success: false,
      message: 'Dispositivo é obrigatório',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  // Verificar se usuário já tem manutenção em andamento
  const manutencaoExistente = await ManutencaoPreventivaModel.verificarManutencaoAndamento(userId);
  if (manutencaoExistente) {
    res.status(400).json({
      success: false,
      message: `Você já tem uma manutenção em andamento para o dispositivo ${manutencaoExistente.dispositivo_descricao}`,
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const manutencaoId = await ManutencaoPreventivaModel.iniciarManutencao({
    dispositivoId,
    colaboradorId: userId,
    ciclosTotais: ciclosTotais || 0,
    dataUltimaManutencao: dataUltimaManutencao || null,
    tipoIntervalo: tipoIntervalo || 'DIA',
    intervaloDias: intervaloDias || 0,
    intervaloPlacas: intervaloPlacas || 0,
    placasExecutadas: placasExecutadas || 0
  });

  res.status(201).json({
    success: true,
    message: 'Manutenção iniciada com sucesso',
    data: { id: manutencaoId },
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Finalizar manutenção
export const finalizarManutencao = asyncHandler(async (req: AuthRequest, res: Response) => {
  const manutencaoId = parseInt(req.params.id);
  const { observacao, respostas } = req.body;

  if (isNaN(manutencaoId)) {
    res.status(400).json({
      success: false,
      message: 'ID da manutenção inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  if (!observacao || !observacao.trim()) {
    res.status(400).json({
      success: false,
      message: 'Observação é obrigatória',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const success = await ManutencaoPreventivaModel.finalizarManutencao(
    manutencaoId,
    observacao.trim(),
    respostas || []
  );

  if (!success) {
    res.status(500).json({
      success: false,
      message: 'Erro ao finalizar manutenção',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Manutenção finalizada com sucesso',
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Cancelar manutenção
export const cancelarManutencao = asyncHandler(async (req: AuthRequest, res: Response) => {
  const manutencaoId = parseInt(req.params.id);

  if (isNaN(manutencaoId)) {
    res.status(400).json({
      success: false,
      message: 'ID da manutenção inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const success = await ManutencaoPreventivaModel.cancelarManutencao(manutencaoId);

  if (!success) {
    res.status(404).json({
      success: false,
      message: 'Manutenção não encontrada',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Manutenção cancelada com sucesso',
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Buscar histórico de manutenções
export const getHistoricoManutencoes = asyncHandler(async (req: Request, res: Response) => {
  const { dataInicio, dataFim, dispositivo, colaborador, status } = req.query;

  const filtros = {
    dataInicio: dataInicio as string,
    dataFim: dataFim as string,
    dispositivo: dispositivo ? parseInt(dispositivo as string) : undefined,
    colaborador: colaborador ? parseInt(colaborador as string) : undefined,
    status: status ? parseInt(status as string) : undefined
  };

  const manutencoes = await ManutencaoPreventivaModel.getHistoricoManutencoes(filtros);

  res.json({
    success: true,
    message: 'Histórico de manutenções obtido com sucesso',
    data: manutencoes,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Buscar detalhes de uma manutenção
export const getDetalhesManutencao = asyncHandler(async (req: Request, res: Response) => {
  const manutencaoId = parseInt(req.params.id);

  if (isNaN(manutencaoId)) {
    res.status(400).json({
      success: false,
      message: 'ID da manutenção inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const detalhes = await ManutencaoPreventivaModel.getDetalhesManutencao(manutencaoId);

  if (!detalhes) {
    res.status(404).json({
      success: false,
      message: 'Manutenção não encontrada',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Detalhes da manutenção obtidos com sucesso',
    data: detalhes,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Controllers para Formulários
export const getFormulariosManutencao = asyncHandler(async (req: Request, res: Response) => {
  const formularios = await FormularioManutencaoModel.getFormularios();
  
  res.json({
    success: true,
    message: 'Formulários obtidos com sucesso',
    data: formularios,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

export const getItensFormulario = asyncHandler(async (req: Request, res: Response) => {
  const formularioId = parseInt(req.params.formularioId);

  if (isNaN(formularioId)) {
    res.status(400).json({
      success: false,
      message: 'ID do formulário inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const itens = await FormularioManutencaoModel.getItensFormulario(formularioId);

  res.json({
    success: true,
    message: 'Itens do formulário obtidos com sucesso',
    data: itens,
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

export const criarFormulario = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'Usuário não identificado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const { descricao, itens } = req.body;

  if (!descricao || !descricao.trim()) {
    res.status(400).json({
      success: false,
      message: 'Descrição do formulário é obrigatória',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    res.status(400).json({
      success: false,
      message: 'Formulário deve ter pelo menos um item',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const formularioId = await FormularioManutencaoModel.criarFormulario(
    descricao.trim(),
    userId,
    itens
  );

  res.status(201).json({
    success: true,
    message: 'Formulário criado com sucesso',
    data: { id: formularioId },
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

export const atualizarFormulario = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const formularioId = parseInt(req.params.id);
  
  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'Usuário não identificado',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  if (isNaN(formularioId)) {
    res.status(400).json({
      success: false,
      message: 'ID do formulário inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const { descricao, itensInserir, itensAtualizar, itensRemover } = req.body;

  if (!descricao || !descricao.trim()) {
    res.status(400).json({
      success: false,
      message: 'Descrição do formulário é obrigatória',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  const success = await FormularioManutencaoModel.atualizarFormulario(
    formularioId,
    descricao.trim(),
    userId,
    itensInserir || [],
    itensAtualizar || [],
    itensRemover || []
  );

  if (!success) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar formulário',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    message: 'Formulário atualizado com sucesso',
    timestamp: new Date().toISOString()
  } as ApiResponse);
});

// Relatórios e Métricas
export const getMetricasManutencao = asyncHandler(async (req: Request, res: Response) => {
  const { dataInicio, dataFim } = req.query;

  try {
    // Métricas de manutenções realizadas
    const manutencoes = await ManutencaoPreventivaModel.getHistoricoManutencoes({
      dataInicio: dataInicio as string,
      dataFim: dataFim as string,
      status: 2 // Apenas finalizadas
    });

    // Calcular métricas
    const totalManutencoes = manutencoes.length;
    const tempoMedio = manutencoes.length > 0 
      ? manutencoes.reduce((acc, m) => acc + (m.duracao_total || 0), 0) / manutencoes.length
      : 0;

    // Agrupar por dispositivo
    const porDispositivo = manutencoes.reduce((acc, m) => {
      const key = m.dispositivo_descricao || 'Desconhecido';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Agrupar por colaborador
    const porColaborador = manutencoes.reduce((acc, m) => {
      const key = m.colaborador_nome || 'Desconhecido';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Dispositivos que precisam de manutenção
    const dispositivosManutencao = await ManutencaoPreventivaModel.getDispositivosManutencao();
    const pendentes = dispositivosManutencao.filter(d => d.necessita_manutencao).length;

    const metricas = {
      totalManutencoes,
      tempoMedioMinutos: Math.round(tempoMedio),
      manutencoesPendentes: pendentes,
      totalDispositivos: dispositivosManutencao.length,
      porDispositivo: Object.entries(porDispositivo).map(([nome, total]) => ({ nome, total })),
      porColaborador: Object.entries(porColaborador).map(([nome, total]) => ({ nome, total })),
      evolucaoMensal: await getEvolucaoMensal(dataInicio as string, dataFim as string)
    };

    res.json({
      success: true,
      message: 'Métricas obtidas com sucesso',
      data: metricas,
      timestamp: new Date().toISOString()
    } as ApiResponse);
  } catch (error) {
    console.error('Erro ao gerar métricas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar métricas',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
});

// Função auxiliar para evolução mensal
async function getEvolucaoMensal(dataInicio: string, dataFim: string) {
  try {
    const query = `
      SELECT 
        DATE_FORMAT(lmd_data_hora_inicio, '%Y-%m') as mes,
        COUNT(*) as total,
        AVG(TIMESTAMPDIFF(MINUTE, lmd_data_hora_inicio, lmd_data_hora_fim)) as tempo_medio
      FROM log_manutencao_dispositivo
      WHERE lmd_status = 2 
      ${dataInicio ? 'AND DATE(lmd_data_hora_inicio) >= ?' : ''}
      ${dataFim ? 'AND DATE(lmd_data_hora_inicio) <= ?' : ''}
      GROUP BY DATE_FORMAT(lmd_data_hora_inicio, '%Y-%m')
      ORDER BY mes ASC
    `;

    const params = [];
    if (dataInicio) params.push(dataInicio);
    if (dataFim) params.push(dataFim);

    const { executeQuery } = require('../config/database');
    const results = await executeQuery(query, params);
    
    return Array.isArray(results) ? results : [];
  } catch (error) {
    console.error('Erro ao calcular evolução mensal:', error);
    return [];
  }
}