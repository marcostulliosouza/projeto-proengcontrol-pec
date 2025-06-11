import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Dispositivos from './pages/Dispositivos';
import Chamados from './pages/Chamados'; // Nova importação
import Manutencao from './pages/Manutencao';
import ProtectedRoute from './components/layout/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Insumos from './pages/Insumos';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dispositivos" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dispositivos />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/chamados" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Chamados />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/manutencao" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Manutencao />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/insumos" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Insumos />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default App;