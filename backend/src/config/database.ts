// config/database.ts - OTIMIZADO
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
  // Configurações válidas para MySQL2
  charset: string;
  supportBigNumbers: boolean;
  bigNumberStrings: boolean;
}

const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'better_call_test',
  connectionLimit: 20, // Aumentado para melhor concorrência
  waitForConnections: true,
  queueLimit: 0,
  timezone: '-03:00',
  // Configurações válidas
  charset: 'utf8mb4',
  supportBigNumbers: true,
  bigNumberStrings: true,
};

// Pool de conexões otimizado
export const pool = mysql.createPool(dbConfig);

// Cache para queries frequentes
const queryCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 segundos

// Limpar cache periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of queryCache) {
    if (now - value.timestamp > CACHE_TTL) {
      queryCache.delete(key);
    }
  }
}, CACHE_TTL);

// Função para testar conexão MELHORADA
export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();
    
    // Testar com query simples
    await connection.execute('SELECT 1 as test');
    
    // Verificar configurações do banco
    const [settings] = await connection.execute(`
      SELECT 
        @@max_connections as max_connections,
        @@wait_timeout as wait_timeout,
        @@interactive_timeout as interactive_timeout
    `);
    console.log('✅ Conexão com MySQL estabelecida com sucesso!');
    console.log('📊 Configurações do banco:', settings);
    
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com MySQL:', error);
    return false;
  }
};

// Função para executar queries com cache e otimizações
export const executeQuery = async (
  query: string, 
  params: any[] = [],
  useCache: boolean = false
): Promise<any> => {
  try {
    // Garantir que params seja sempre um array
    const safeParams = Array.isArray(params) ? params : [];
    
    // Gerar chave do cache se solicitado
    const cacheKey = useCache ? `${query}-${JSON.stringify(safeParams)}` : null;
    
    // Verificar cache para queries SELECT
    if (useCache && cacheKey && query.trim().toUpperCase().startsWith('SELECT')) {
      const cached = queryCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log('📋 Query servida do cache');
        return cached.result;
      }
    }
    
    console.log('🔍 Executando query:', {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      paramsLength: safeParams.length,
      useCache
    });
    
    const startTime = Date.now();
    const [results] = await pool.execute(query, safeParams);
    const executionTime = Date.now() - startTime;
    
    // Log de performance para queries lentas
    if (executionTime > 1000) {
      console.warn(`⚠️ Query lenta detectada (${executionTime}ms):`, query.substring(0, 200));
    }
    
    console.log(`✅ Query executada em ${executionTime}ms, resultados:`, 
      Array.isArray(results) ? `${results.length} registros` : 'não é array'
    );
    
    // Cachear resultado se solicitado
    if (useCache && cacheKey && query.trim().toUpperCase().startsWith('SELECT')) {
      queryCache.set(cacheKey, { result: results, timestamp: Date.now() });
    }
    
    return results;
  } catch (error) {
    console.error('❌ Erro na query:', {
      query: query.substring(0, 200),
      params: params,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    throw error;
  }
};

// Função para executar transações com retry
export const executeTransaction = async (
  operations: (connection: mysql.PoolConnection) => Promise<any>
): Promise<any> => {
  const maxRetries = 3;
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      console.log(`🔄 Iniciando transação (tentativa ${attempt})`);
      
      const result = await operations(connection);
      
      await connection.commit();
      console.log('✅ Transação commitada com sucesso');
      
      connection.release();
      return result;
      
    } catch (error) {
      await connection.rollback();
      console.error(`❌ Erro na transação (tentativa ${attempt}):`, error);
      
      connection.release();
      lastError = error as Error;
      
      // Se for deadlock ou lock timeout, tentar novamente
      if (attempt < maxRetries && 
          (error instanceof Error && 
           (error.message.includes('Deadlock') || 
            error.message.includes('Lock wait timeout')))) {
        console.log(`🔄 Tentando novamente em ${attempt * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      }
      
      break;
    }
  }
  
  throw lastError!;
};

// Função para monitorar performance do pool
export const getPoolStats = () => {
  const pool_any = pool as any;
  return {
    totalConnections: pool_any._allConnections?.length || 0,
    freeConnections: pool_any._freeConnections?.length || 0,
    acquiringConnections: pool_any._acquiringConnections?.length || 0,
    cacheSize: queryCache.size,
    config: {
      connectionLimit: dbConfig.connectionLimit,
      queueLimit: dbConfig.queueLimit
    }
  };
};

// Log de estatísticas periodicamente em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = getPoolStats();
    console.log('📊 Pool de conexões:', stats);
  }, 60000); // A cada minuto
}

export default pool;