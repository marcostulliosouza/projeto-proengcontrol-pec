import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  waitForConnections: boolean;
  queueLimit: number;
  timezone: string;
}

const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'better_call_test',
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  timezone: '-03:00',
};

// Pool de conexões para melhor performance
export const pool = mysql.createPool(dbConfig);

// Função para testar conexão
export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ Conexão com MySQL estabelecida com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com MySQL:', error);
    return false;
  }
};

// Função para executar queries com log
export const executeQuery = async (
  query: string, 
  params: any[] = []
): Promise<any> => {
  try {
    // Garantir que params seja sempre um array
    const safeParams = Array.isArray(params) ? params : [];
    
    console.log('🔍 Executando query:', {
      query: query.substring(0, 100) + '...',
      paramsLength: safeParams.length,
      params: safeParams
    });
    
    const [results] = await pool.execute(query, safeParams);
    
    console.log('✅ Query executada com sucesso, resultados:', Array.isArray(results) ? results.length : 'não é array');
    
    return results;
  } catch (error) {
    console.error('❌ Erro na query:', query);
    console.error('❌ Parâmetros:', params);
    console.error('❌ Erro completo:', error);
    throw error;
  }
};

export default pool;