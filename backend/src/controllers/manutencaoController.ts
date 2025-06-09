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

// Buscar detalhes do dispositivo
export const getDispositivoDetalhes = asyncHandler(async (req: Request, res: Response) => {
  const dispositivoId = parseInt(req.params.dispositivoId);

  if (isNaN(dispositivoId)) {
    res.status(400).json({
      success: false,
      message: 'ID do dispositivo inválido',
      timestamp: new Date().toISOString()
    } as ApiResponse);
    return;
  }

  try {
    const query = `
      SELECT 
        d.dis_id,
        d.dis_descricao,
        d.dis_codigo_sap,
        d.dis_com_manutencao,
        d.dis_info_manutencao,
        dim.dim_id,
        dim.dim_tipo_intervalo,
        dim.dim_intervalo_dias,
        dim.dim_intervalo_placas,
        dim.dim_placas_executadas,
        dim.dim_formulario_manutencao,
        dim.dim_data_ultima_manutencao,
        c.cli_nome as cliente_nome,
        fmp.fmp_descricao as formulario_descricao
      FROM dispositivos d
      LEFT JOIN dispositivo_info_manutencao dim ON d.dis_info_manutencao = dim.dim_id
      LEFT JOIN clientes c ON d.dis_cliente = c.cli_id
      LEFT JOIN formularios_manutencao_preventiva fmp ON dim.dim_formulario_manutencao = fmp.fmp_id
      WHERE d.dis_id = ? AND d.dis_status = 1
    `;

    const { executeQuery } = require('../config/database');
    const results = await executeQuery(query, [dispositivoId]);
    
    if (!Array.isArray(results) || results.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Dispositivo não encontrado ou inativo',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    const dispositivo = results[0];

    // Validar se dispositivo tem manutenção ativa
    if (!dispositivo.dis_com_manutencao) {
      res.status(400).json({
        success: false,
        message: 'Dispositivo não está configurado para manutenção preventiva',
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      message: 'Detalhes do dispositivo obtidos com sucesso',
      data: {
        dis_id: dispositivo.dis_id,
        dis_descricao: dispositivo.dis_descricao,
        dis_codigo_sap: dispositivo.dis_codigo_sap,
        cliente_nome: dispositivo.cliente_nome,
        dim_formulario_manutencao: dispositivo.dim_formulario_manutencao || 1, // Default para formulário básico
        formulario_descricao: dispositivo.formulario_descricao || 'Formulário Básico',
        dim_tipo_intervalo: dispositivo.dim_tipo_intervalo,
        dim_intervalo_dias: dispositivo.dim_intervalo_dias,
        dim_intervalo_placas: dispositivo.dim_intervalo_placas,
        dim_placas_executadas: dispositivo.dim_placas_executadas,
        dim_data_ultima_manutencao: dispositivo.dim_data_ultima_manutencao
      },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Erro ao buscar detalhes do dispositivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao buscar detalhes do dispositivo',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
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

  try {
    const result = await ManutencaoPreventivaModel.iniciarManutencaoSegura({
      dispositivoId,
      colaboradorId: userId,
      ciclosTotais: ciclosTotais || 0,
      dataUltimaManutencao: dataUltimaManutencao || null,
      tipoIntervalo: tipoIntervalo || 'DIA',
      intervaloDias: intervaloDias || 0,
      intervaloPlacas: intervaloPlacas || 0,
      placasExecutadas: placasExecutadas || 0
    });

    if (!result.success) {
      res.status(409).json({
        success: false,
        message: result.error,
        timestamp: new Date().toISOString()
      } as ApiResponse);
      return;
    }

    // Emitir evento via WebSocket para atualizar outros usuários
    const io = req.app.get('io');
    if (io) {
      io.emit('manutencao_iniciada', {
        dispositivoId,
        manutencaoId: result.manutencaoId,
        colaboradorId: userId,
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Manutenção iniciada com sucesso',
      data: { id: result.manutencaoId },
      timestamp: new Date().toISOString()
    } as ApiResponse);

  } catch (error) {
    console.error('Erro ao iniciar manutenção:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      timestamp: new Date().toISOString()
    } as ApiResponse);
  }
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

// Endpoint para verificar status de dispositivos
export const getStatusDispositivos = asyncHandler(async (req: Request, res: Response) => {
  const estatisticas = await ManutencaoPreventivaModel.getEstatisticasDispositivos();
  
  res.json({
    success: true,
    message: 'Estatísticas obtidas com sucesso',
    data: estatisticas,
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