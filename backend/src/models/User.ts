import { executeQuery } from '@/config/database';
import { User } from '@/types';
import bcrypt from 'bcryptjs';

export class UserModel {
  // Buscar usuário por login
  static async findByLogin(login: string): Promise<User | null> {
    try {
      const query = `
        SELECT col_id, col_nome, col_categoria, col_ativo, col_senha, col_login
        FROM colaboradores 
        WHERE col_login = ? AND col_ativo = 1
      `;
      
      const results = await executeQuery(query, [login]);
      
      if (Array.isArray(results) && results.length > 0) {
        return results[0] as User;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar usuário por login:', error);
      throw error;
    }
  }

  // Buscar usuário por ID
  static async findById(id: number): Promise<User | null> {
    try {
      const query = `
        SELECT col_id, col_nome, col_categoria, col_ativo, col_senha, col_login
        FROM colaboradores 
        WHERE col_id = ? AND col_ativo = 1
      `;
      
      const results = await executeQuery(query, [id]);
      
      if (Array.isArray(results) && results.length > 0) {
        return results[0] as User;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar usuário por ID:', error);
      throw error;
    }
  }

  // Verificar senha
  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      throw error;
    }
  }

  // Hash da senha
  static async hashPassword(password: string): Promise<string> {
    try {
      const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      return await bcrypt.hash(password, rounds);
    } catch (error) {
      console.error('Erro ao fazer hash da senha:', error);
      throw error;
    }
  }

  // Listar todos os usuários ativos
  static async findAll(): Promise<User[]> {
    try {
      const query = `
        SELECT col_id, col_nome, col_categoria, col_ativo, col_login
        FROM colaboradores 
        WHERE col_ativo = 1
        ORDER BY col_nome
      `;
      
      const results = await executeQuery(query);
      return Array.isArray(results) ? results as User[] : [];
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      throw error;
    }
  }

  // Buscar categoria do colaborador
  static async getCategory(categoryId: number): Promise<string | null> {
    try {
      const query = `
        SELECT cac_descricao 
        FROM categorias_colaboradores 
        WHERE cac_id = ?
      `;
      
      const results = await executeQuery(query, [categoryId]);
      
      if (Array.isArray(results) && results.length > 0) {
        return results[0].cac_descricao;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar categoria:', error);
      throw error;
    }
  }
}