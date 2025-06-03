import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';

const Dashboard: React.FC = () => {
  const { state } = useAuth();

  // Stats temporários (depois vamos buscar da API)
  const stats = {
    totalDispositivos: 150,
    dispositivosAtivos: 142,
    chamadosAbertos: 8,
    manutencoesPendentes: 5,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">
            Dashboard
          </h1>
          <p className="text-secondary-600">
            Bem-vindo de volta, {state.user?.nome}!
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-secondary-500">
            Última atualização: {new Date().toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Dispositivos</p>
              <p className="text-3xl font-bold">{stats.totalDispositivos}</p>
            </div>
            <div className="w-12 h-12 bg-blue-400 bg-opacity-30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Dispositivos Ativos</p>
              <p className="text-3xl font-bold">{stats.dispositivosAtivos}</p>
            </div>
            <div className="w-12 h-12 bg-green-400 bg-opacity-30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">Chamados Abertos</p>
              <p className="text-3xl font-bold">{stats.chamadosAbertos}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-400 bg-opacity-30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Manutenções Pendentes</p>
              <p className="text-3xl font-bold">{stats.manutencoesPendentes}</p>
            </div>
            <div className="w-12 h-12 bg-red-400 bg-opacity-30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L5.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Chamados Recentes">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                <div>
                  <p className="font-medium text-secondary-900">
                    Problema no equipamento #{i + 100}
                  </p>
                  <p className="text-sm text-secondary-600">
                    Aberto há {i} horas
                  </p>
                </div>
                <span className="status-badge status-warning">
                  Em Aberto
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Manutenções Programadas">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                <div>
                  <p className="font-medium text-secondary-900">
                    Dispositivo TEST-{i.toString().padStart(3, '0')}
                  </p>
                  <p className="text-sm text-secondary-600">
                    Agendado para {new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className="status-badge status-info">
                  Agendado
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;