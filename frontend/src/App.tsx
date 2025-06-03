import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Componente temporário para dashboard
const Dashboard = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-secondary-900">Dashboard</h1>
    <p className="text-secondary-600">Bem-vindo ao ProEngControl!</p>
  </div>
);

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default App;