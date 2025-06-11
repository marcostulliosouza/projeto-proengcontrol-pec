/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input } from '../ui';
import { ManutencaoService, type MetricasManutencaoType } from '../../services/manutencaoService';

interface PeriodoPreset {
  label: string;
  dataInicio: string;
  dataFim: string;
  icon: string;
}

const MetricasManutencao: React.FC = () => {
  const [metricas, setMetricas] = useState<MetricasManutencaoType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string>('mes-atual');
  const [periodo, setPeriodo] = useState({
    dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0]
  });

  // Presets de período
  const periodosPreset: PeriodoPreset[] = [
    {
      label: 'Hoje',
      dataInicio: new Date().toISOString().split('T')[0],
      dataFim: new Date().toISOString().split('T')[0],
      icon: '📅'
    },
    {
      label: 'Esta Semana',
      dataInicio: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())).toISOString().split('T')[0],
      dataFim: new Date().toISOString().split('T')[0],
      icon: '📊'
    },
    {
      label: 'Este Mês',
      dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      dataFim: new Date().toISOString().split('T')[0],
      icon: '📈'
    },
    {
      label: 'Últimos 30 dias',
      dataInicio: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
      dataFim: new Date().toISOString().split('T')[0],
      icon: '🗓️'
    },
    {
      label: 'Últimos 90 dias',
      dataInicio: new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0],
      dataFim: new Date().toISOString().split('T')[0],
      icon: '📋'
    },
    {
      label: 'Este Ano',
      dataInicio: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      dataFim: new Date().toISOString().split('T')[0],
      icon: '🎯'
    }
  ];

  const loadMetricas = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ManutencaoService.getMetricas(periodo.dataInicio, periodo.dataFim);
      setMetricas(data);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    loadMetricas();
  }, [loadMetricas]);

  const handlePresetChange = (preset: PeriodoPreset, presetKey: string) => {
    setSelectedPreset(presetKey);
    setPeriodo({
      dataInicio: preset.dataInicio,
      dataFim: preset.dataFim
    });
  };

  const formatDuracao = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas > 0) {
      return `${horas}h ${mins}m`;
    }
    return `${mins}min`;
  };

  const calcularTaxaEficiencia = () => {
    if (!metricas || metricas.totalManutencoes === 0) return 0;
    const realizadas = metricas.totalManutencoes;
    const pendentes = metricas.manutencoesPendentes;
    const total = realizadas + pendentes;
    return total > 0 ? Math.round((realizadas / total) * 100) : 100;
  };

  const calcularMediaPorDia = () => {
    if (!metricas || !periodo.dataInicio || !periodo.dataFim) return 0;
    const inicio = new Date(periodo.dataInicio);
    const fim = new Date(periodo.dataFim);
    const diffTime = Math.abs(fim.getTime() - inicio.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    return (metricas.totalManutencoes / diffDays).toFixed(1);
  };

  if (loading || !metricas) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando métricas...</p>
        </div>
      </div>
    );
  }

  const taxaEficiencia = calcularTaxaEficiencia();
  const mediaPorDia = calcularMediaPorDia();

  return (
    <div className="space-y-6">
      {/* Header com Título e Informações do Período */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">📊 Métricas de Manutenção</h1>
            <p className="text-blue-100">
              Período: {new Date(periodo.dataInicio).toLocaleDateString('pt-BR')} até {new Date(periodo.dataFim).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{metricas.totalManutencoes}</div>
            <div className="text-sm text-blue-100">Manutenções realizadas</div>
          </div>
        </div>
      </div>

      {/* Filtros de Período com Presets */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Filtros de Período</h3>
            <Button variant="secondary" onClick={loadMetricas} disabled={loading}>
              {loading ? '⏳' : '🔄'} Atualizar
            </Button>
          </div>
          
          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            {periodosPreset.map((preset, index) => (
              <button
                key={index}
                onClick={() => handlePresetChange(preset, `preset-${index}`)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPreset === `preset-${index}`
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {preset.icon} {preset.label}
              </button>
            ))}
          </div>

          {/* Seleção Manual */}
          <div className="flex items-end space-x-4 pt-2 border-t">
            <Input
              label="Data Início"
              type="date"
              value={periodo.dataInicio}
              onChange={(e) => {
                setPeriodo(prev => ({ ...prev, dataInicio: e.target.value }));
                setSelectedPreset('custom');
              }}
            />
            <Input
              label="Data Fim"
              type="date"
              value={periodo.dataFim}
              onChange={(e) => {
                setPeriodo(prev => ({ ...prev, dataFim: e.target.value }));
                setSelectedPreset('custom');
              }}
            />
          </div>
        </div>
      </Card>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total de Manutenções</p>
              <p className="text-3xl font-bold mb-1">{metricas.totalManutencoes}</p>
              <p className="text-blue-200 text-xs">
                📈 {mediaPorDia} por dia em média
              </p>
            </div>
            <div className="w-16 h-16 bg-blue-400 bg-opacity-30 rounded-full flex items-center justify-center text-2xl">
              🔧
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Tempo Médio</p>
              <p className="text-3xl font-bold mb-1">
                {formatDuracao(metricas.tempoMedioMinutos)}
              </p>
              <p className="text-green-200 text-xs">
                ⚡ Por manutenção
              </p>
            </div>
            <div className="w-16 h-16 bg-green-400 bg-opacity-30 rounded-full flex items-center justify-center text-2xl">
              ⏱️
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Pendentes</p>
              <p className="text-3xl font-bold mb-1">{metricas.manutencoesPendentes}</p>
              <p className="text-yellow-200 text-xs">
                ⚠️ Aguardando execução
              </p>
            </div>
            <div className="w-16 h-16 bg-yellow-400 bg-opacity-30 rounded-full flex items-center justify-center text-2xl">
              📋
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Taxa de Eficiência</p>
              <p className="text-3xl font-bold mb-1">{taxaEficiencia}%</p>
              <p className="text-purple-200 text-xs">
                🎯 Realizadas vs Total
              </p>
            </div>
            <div className="w-16 h-16 bg-purple-400 bg-opacity-30 rounded-full flex items-center justify-center text-2xl">
              📊
            </div>
          </div>
        </Card>
      </div>

      {/* Estatísticas Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              📱
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total de Dispositivos</p>
              <p className="text-2xl font-bold text-gray-900">{metricas.totalDispositivos}</p>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              ⚡
            </div>
            <div>
              <p className="text-gray-600 text-sm">Tempo Total Investido</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatDuracao(metricas.totalManutencoes * metricas.tempoMedioMinutos)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              📈
            </div>
            <div>
              <p className="text-gray-600 text-sm">Média por Dispositivo</p>
              <p className="text-2xl font-bold text-gray-900">
                {metricas.totalDispositivos > 0 ? (metricas.totalManutencoes / metricas.totalDispositivos).toFixed(1) : '0'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Gráficos Melhorados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manutenções por Dispositivo */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                🔧
              </span>
              Top 10 Dispositivos
            </h3>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {metricas.porDispositivo.length} dispositivos
            </span>
          </div>
          
          <div className="space-y-4">
            {metricas.porDispositivo.slice(0, 10).map((item, index) => {
              const maxValue = Math.max(...metricas.porDispositivo.map(d => d.total));
              const percentage = maxValue > 0 ? (item.total / maxValue) * 100 : 0;
              
              return (
                <div key={item.nome} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-500' :
                        'bg-blue-500'
                      }`}>
                        {index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
                      </div>
                      <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {item.nome}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-gray-900">
                        {item.total}
                      </span>
                      <span className="text-xs text-gray-500">manutenções</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 group-hover:h-4 transition-all">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {metricas.porDispositivo.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  📊
                </div>
                <p className="text-gray-500">Nenhuma manutenção no período selecionado</p>
              </div>
            )}
          </div>
        </Card>

        {/* Manutenções por Colaborador */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                👥
              </span>
              Top 10 Colaboradores
            </h3>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {metricas.porColaborador.length} colaboradores
            </span>
          </div>
          
          <div className="space-y-4">
            {metricas.porColaborador.slice(0, 10).map((item, index) => {
              const maxValue = Math.max(...metricas.porColaborador.map(c => c.total));
              const percentage = maxValue > 0 ? (item.total / maxValue) * 100 : 0;
              
              return (
                <div key={item.nome} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-500' :
                        'bg-green-500'
                      }`}>
                        {index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
                      </div>
                      <span className="text-sm font-medium text-gray-900 group-hover:text-green-600 transition-colors">
                        {item.nome}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-gray-900">
                        {item.total}
                      </span>
                      <span className="text-xs text-gray-500">manutenções</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 group-hover:h-4 transition-all">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {metricas.porColaborador.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  👥
                </div>
                <p className="text-gray-500">Nenhuma manutenção no período selecionado</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Evolução Mensal Melhorada */}
      {metricas.evolucaoMensal.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                📈
              </span>
              Evolução Mensal
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Manutenções</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Tempo Médio</span>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <div className="flex items-end space-x-6 min-w-max pb-4" style={{ minHeight: '280px' }}>
              {metricas.evolucaoMensal.map((item, index) => {
                const maxManutencoes = Math.max(...metricas.evolucaoMensal.map(m => m.total));
                const maxTempo = Math.max(...metricas.evolucaoMensal.map(m => m.tempo_medio));
                const alturaManutencoes = maxManutencoes > 0 ? (item.total / maxManutencoes) * 200 : 20;
                const alturaTempo = maxTempo > 0 ? (item.tempo_medio / maxTempo) * 200 : 20;
                
                return (
                  <div key={item.mes} className="flex flex-col items-center group">
                    <div className="flex items-end space-x-2 mb-4">
                      {/* Barra de Manutenções */}
                      <div className="flex flex-col items-center">
                        <div 
                          className="bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg min-w-[32px] flex items-end justify-center text-white text-xs font-bold pb-2 shadow-lg group-hover:shadow-xl transition-shadow"
                          style={{ height: `${Math.max(40, alturaManutencoes)}px` }}
                        >
                          {item.total}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Qtd</div>
                      </div>
                      
                      {/* Barra de Tempo Médio */}
                      <div className="flex flex-col items-center">
                        <div 
                          className="bg-gradient-to-t from-green-600 to-green-400 rounded-t-lg min-w-[32px] flex items-end justify-center text-white text-xs font-bold pb-2 shadow-lg group-hover:shadow-xl transition-shadow"
                          style={{ height: `${Math.max(40, alturaTempo)}px` }}
                        >
                          {item.tempo_medio}m
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Tempo</div>
                      </div>
                    </div>
                    
                    <div className="text-sm font-medium text-gray-900 text-center bg-gray-100 px-3 py-1 rounded-full group-hover:bg-blue-100 transition-colors">
                      {item.mes}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Resumo Final */}
      <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border border-blue-200">
        <div className="text-center py-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📊 Resumo do Período
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-2xl font-bold text-blue-600">{metricas.totalManutencoes}</div>
              <div className="text-gray-600">Manutenções Realizadas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{formatDuracao(metricas.tempoMedioMinutos)}</div>
              <div className="text-gray-600">Tempo Médio</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{taxaEficiencia}%</div>
              <div className="text-gray-600">Taxa de Eficiência</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{mediaPorDia}</div>
              <div className="text-gray-600">Manutenções/Dia</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MetricasManutencao;