/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../ui';
import { ManutencaoService, type MetricasManutencaoType } from '../../services/manutencaoService';

const MetricasManutencao: React.FC = () => {
  const [metricas, setMetricas] = useState<MetricasManutencaoType | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState({
    dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadMetricas();
  }, [periodo]);

  const loadMetricas = async () => {
    try {
      setLoading(true);
      const data = await ManutencaoService.getMetricas(periodo.dataInicio, periodo.dataFim);
      setMetricas(data);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="space-y-6">
      {/* Filtros de Período */}
      <Card>
        <div className="flex items-end space-x-4">
          <Input
            label="Data Início"
            type="date"
            value={periodo.dataInicio}
            onChange={(e) => setPeriodo(prev => ({ ...prev, dataInicio: e.target.value }))}
          />
          <Input
            label="Data Fim"
            type="date"
            value={periodo.dataFim}
            onChange={(e) => setPeriodo(prev => ({ ...prev, dataFim: e.target.value }))}
          />
          <Button variant="secondary" onClick={loadMetricas}>
            📊 Atualizar Métricas
          </Button>
        </div>
      </Card>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total de Manutenções</p>
              <p className="text-3xl font-bold">{metricas.totalManutencoes}</p>
            </div>
            <div className="w-12 h-12 bg-blue-400 bg-opacity-30 rounded-lg flex items-center justify-center">
              🔧
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Tempo Médio</p>
              <p className="text-3xl font-bold">
                {Math.floor(metricas.tempoMedioMinutos / 60)}h {metricas.tempoMedioMinutos % 60}m
              </p>
            </div>
            <div className="w-12 h-12 bg-green-400 bg-opacity-30 rounded-lg flex items-center justify-center">
              ⏱️
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">Pendentes</p>
              <p className="text-3xl font-bold">{metricas.manutencoesPendentes}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-400 bg-opacity-30 rounded-lg flex items-center justify-center">
              ⚠️
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Total Dispositivos</p>
              <p className="text-3xl font-bold">{metricas.totalDispositivos}</p>
            </div>
            <div className="w-12 h-12 bg-purple-400 bg-opacity-30 rounded-lg flex items-center justify-center">
              📱
            </div>
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manutenções por Dispositivo */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Manutenções por Dispositivo
          </h3>
          <div className="space-y-3">
            {metricas.porDispositivo.slice(0, 10).map((item, index) => (
              <div key={item.nome} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 truncate flex-1">
                  {index + 1}. {item.nome}
                </span>
                <div className="flex items-center space-x-2 ml-4">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ 
                        width: `${(item.total / Math.max(...metricas.porDispositivo.map(d => d.total))) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">
                    {item.total}
                  </span>
                </div>
              </div>
            ))}
            {metricas.porDispositivo.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                Nenhuma manutenção no período selecionado
              </p>
            )}
          </div>
        </Card>

        {/* Manutenções por Colaborador */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Manutenções por Colaborador
          </h3>
          <div className="space-y-3">
            {metricas.porColaborador.slice(0, 10).map((item, index) => (
              <div key={item.nome} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 truncate flex-1">
                  {index + 1}. {item.nome}
                </span>
                <div className="flex items-center space-x-2 ml-4">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full"
                      style={{ 
                        width: `${(item.total / Math.max(...metricas.porColaborador.map(c => c.total))) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">
                    {item.total}
                  </span>
                </div>
              </div>
            ))}
            {metricas.porColaborador.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                Nenhuma manutenção no período selecionado
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Evolução Mensal */}
      {metricas.evolucaoMensal.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Evolução Mensal de Manutenções
          </h3>
          <div className="overflow-x-auto">
            <div className="flex items-end space-x-4 min-w-max pb-4">
              {metricas.evolucaoMensal.map((item, index) => (
                <div key={item.mes} className="flex flex-col items-center">
                  <div 
                    className="bg-blue-500 rounded-t min-w-[40px] flex items-end justify-center text-white text-xs font-medium pb-1"
                    style={{ 
                      height: `${Math.max(20, (item.total / Math.max(...metricas.evolucaoMensal.map(m => m.total))) * 200)}px` 
                    }}
                  >
                    {item.total}
                  </div>
                  <div className="text-xs text-gray-600 mt-2 text-center">
                    {item.mes}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MetricasManutencao;