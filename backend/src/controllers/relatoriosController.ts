// src/controllers/relatoriosController.ts

import { Request, Response } from 'express';
import { RelatoriosModel } from '../models/Relatorios';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export const getChamadosPorPeriodo = async (req: Request, res: Response) => {
  try {
    const filtros = {
      dataInicio: req.query.dataInicio as string,
      dataFim: req.query.dataFim as string,
      cliente: req.query.cliente as string,
      status: req.query.status as string,
      tipo: req.query.tipo as string,
      operador: req.query.operador as string,
    };

    console.log('🔍 Buscando chamados com filtros:', filtros);

    const dados = await RelatoriosModel.getChamadosPorPeriodo(filtros);
    
    const response = {
      dados,
      metadados: {
        tipo: 'chamados-periodo',
        dataGeracao: new Date().toISOString(),
        usuario: req.user?.nome || 'Sistema',
        filtros,
        totalRegistros: dados.length
      },
      success: true
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao gerar relatório de chamados:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório de chamados'
    });
  }
};

export const getStatusDispositivos = async (req: Request, res: Response) => {
  try {
    const filtros = {
      dataInicio: req.query.dataInicio as string,
      dataFim: req.query.dataFim as string,
      cliente: req.query.cliente as string,
      status: req.query.status as string,
    };

    console.log('🔍 Buscando dispositivos com filtros:', filtros);

    const dados = await RelatoriosModel.getStatusDispositivos(filtros);
    
    const response = {
      dados,
      metadados: {
        tipo: 'dispositivos-status',
        dataGeracao: new Date().toISOString(),
        usuario: req.user?.nome || 'Sistema',
        filtros,
        totalRegistros: dados.length
      },
      success: true
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao gerar relatório de dispositivos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório de dispositivos'
    });
  }
};

export const getManutencoesPpreventivas = async (req: Request, res: Response) => {
  try {
    const filtros = {
      dataInicio: req.query.dataInicio as string,
      dataFim: req.query.dataFim as string,
      cliente: req.query.cliente as string,
      tecnico: req.query.tecnico as string,
      status: req.query.status as string,
    };

    console.log('🔍 Buscando manutenções com filtros:', filtros);

    const dados = await RelatoriosModel.getManutencoesPpreventivas(filtros);
    
    const response = {
      dados,
      metadados: {
        tipo: 'manutencoes-preventivas',
        dataGeracao: new Date().toISOString(),
        usuario: req.user?.nome || 'Sistema',
        filtros,
        totalRegistros: dados.length
      },
      success: true
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao gerar relatório de manutenções:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório de manutenções'
    });
  }
};

export const getIndicadoresProducao = async (req: Request, res: Response) => {
  try {
    const filtros = {
      dataInicio: req.query.dataInicio as string,
      dataFim: req.query.dataFim as string,
    };

    console.log('🔍 Buscando indicadores de produção com filtros:', filtros);

    const dados = await RelatoriosModel.getIndicadoresProducao(filtros);
    
    const response = {
      dados,
      metadados: {
        tipo: 'producao-indicadores',
        dataGeracao: new Date().toISOString(),
        usuario: req.user?.nome || 'Sistema',
        filtros,
        totalRegistros: dados.length
      },
      success: true
    };

    res.json(response);
  } catch (error) {
    console.error('Erro ao gerar relatório de produção:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório de produção'
    });
  }
};

export const exportarRelatorio = async (req: Request, res: Response) => {
  try {
    const { tipo, filtros, opcoes } = req.body;
    
    console.log('📊 Exportando relatório:', { tipo, opcoes });

    let dados: any[] = [];
    
    // Buscar dados baseado no tipo
    switch (tipo) {
      case 'chamados-periodo':
        dados = await RelatoriosModel.getChamadosPorPeriodo(filtros);
        break;
      case 'dispositivos-status':
        dados = await RelatoriosModel.getStatusDispositivos(filtros);
        break;
      case 'manutencoes-preventivas':
        dados = await RelatoriosModel.getManutencoesPpreventivas(filtros);
        break;
      case 'producao-indicadores':
        dados = await RelatoriosModel.getIndicadoresProducao(filtros);
        break;
      default:
        throw new Error('Tipo de relatório inválido');
    }

    // Gerar arquivo baseado no formato
    switch (opcoes.formato) {
      case 'excel':
        await gerarExcel(res, dados, tipo, opcoes);
        break;
      case 'pdf':
        await gerarPDF(res, dados, tipo, opcoes);
        break;
      case 'csv':
        await gerarCSV(res, dados, tipo);
        break;
      default:
        throw new Error('Formato de exportação inválido');
    }

  } catch (error) {
    console.error('Erro ao exportar relatório:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao exportar relatório'
    });
  }
};

export const getOpcoesRelatorio = async (req: Request, res: Response) => {
  try {
    const tipo = req.path.split('/').pop(); // clientes, status, tipos
    
    let opcoes: any[] = [];
    
    switch (tipo) {
      case 'clientes':
        opcoes = await RelatoriosModel.getClientes();
        break;
      case 'status':
        opcoes = await RelatoriosModel.getStatus();
        break;
      case 'tipos':
        opcoes = await RelatoriosModel.getTipos();
        break;
    }

    res.json(opcoes);
  } catch (error) {
    console.error('Erro ao buscar opções:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar opções'
    });
  }
};

// Funções auxiliares para exportação
async function gerarExcel(res: Response, dados: any[], tipo: string, opcoes: any) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Relatório');
  
  // Configurar cabeçalhos baseado no tipo
  const colunas = getColunasExcel(tipo);
  worksheet.columns = colunas;
  
  // Adicionar dados
  dados.forEach(item => {
    worksheet.addRow(item);
  });
  
  // Estilizar cabeçalho
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Configurar resposta
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=relatorio_${tipo}_${new Date().getTime()}.xlsx`
  );
  
  await workbook.xlsx.write(res);
  res.end();
}

async function gerarPDF(res: Response, dados: any[], tipo: string, opcoes: any) {
  const doc = new PDFDocument();
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=relatorio_${tipo}_${new Date().getTime()}.pdf`
  );
  
  doc.pipe(res);
  
  // Título
  doc.fontSize(16).text(`Relatório: ${tipo}`, 50, 50);
  doc.fontSize(10).text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 50, 80);
  
  // Tabela simples (pode ser melhorada)
  let y = 120;
  dados.forEach((item, index) => {
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
    
    doc.text(`${index + 1}. ${JSON.stringify(item)}`, 50, y);
    y += 20;
  });
  
  doc.end();
}

async function gerarCSV(res: Response, dados: any[], tipo: string) {
  const colunas = Object.keys(dados[0] || {});
  
  let csv = colunas.join(',') + '\n';
  
  dados.forEach(item => {
    const valores = colunas.map(col => `"${item[col] || ''}"`);
    csv += valores.join(',') + '\n';
  });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=relatorio_${tipo}_${new Date().getTime()}.csv`
  );
  
  res.send(csv);
}

function getColunasExcel(tipo: string) {
  switch (tipo) {
    case 'chamados-periodo':
      return [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Cliente', key: 'cliente', width: 20 },
        { header: 'Tipo', key: 'tipo', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Operador', key: 'operador', width: 20 },
        { header: 'Data Abertura', key: 'dataAbertura', width: 15 },
        { header: 'Tempo Atendimento', key: 'tempoAtendimento', width: 15 }
      ];
    case 'dispositivos-status':
      return [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Dispositivo', key: 'dispositivo', width: 25 },
        { header: 'Cliente', key: 'cliente', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Última Manutenção', key: 'ultimaManutencao', width: 15 },
        { header: 'Próxima Manutenção', key: 'proximaManutencao', width: 15 }
      ];
    default:
      return [{ header: 'Dados', key: 'dados', width: 50 }];
  }
}