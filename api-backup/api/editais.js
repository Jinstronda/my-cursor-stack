/**
 * Optimized Serverless Function for /api/editais
 * Lightweight endpoint to avoid FUNCTION_INVOCATION_FAILED
 * 
 * This function is designed to:
 * - Have minimal cold start time
 * - Avoid heavy Express server initialization
 * - Provide fast editais data (public endpoint)
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with minimal overhead
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
}

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Get all editais (public endpoint)
 */
async function getAllEditais(limit = 50) {
  if (!supabase) {
    console.log('❌ Supabase client not initialized');
    return [];
  }

  try {
    console.log(`🔍 Fetching all editais from Supabase (limit: ${limit})...`);
    
    const { data: editais, error } = await supabase
      .from('editais')
      .select(`
        id,
        nome,
        descricao,
        orgao_responsavel,
        valor_total,
        valor_maximo_por_projeto,
        prazo_inscricao,
        data_resultado,
        status,
        tipo_verba,
        areas_contempladas,
        requisitos_basicos,
        local,
        created_by,
        created_at,
        updated_at,
        analise_personalizada,
        palavras_chave,
        criterios_elegibilidade,
        processo_selecao,
        documentos_necessarios,
        email_contato,
        telefone_contato,
        link_edital
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('❌ Supabase query error:', error.message);
      return [];
    }
    
    console.log(`✅ Found ${editais?.length || 0} editais`);
    return editais || [];
  } catch (error) {
    console.error("Error fetching editais:", error);
    return [];
  }
}

/**
 * Get editais by status (public endpoint)
 */
async function getEditaisByStatus(status, limit = 50) {
  if (!supabase) {
    console.log('❌ Supabase client not initialized');
    return [];
  }

  try {
    console.log(`🔍 Fetching editais with status '${status}' from Supabase (limit: ${limit})...`);
    
    const { data: editais, error } = await supabase
      .from('editais')
      .select(`
        id,
        nome,
        descricao,
        orgao_responsavel,
        valor_total,
        valor_maximo_por_projeto,
        prazo_inscricao,
        data_resultado,
        status,
        tipo_verba,
        areas_contempladas,
        requisitos_basicos,
        local,
        created_by,
        created_at,
        updated_at,
        analise_personalizada,
        palavras_chave,
        criterios_elegibilidade,
        processo_selecao,
        documentos_necessarios,
        email_contato,
        telefone_contato,
        link_edital
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('❌ Supabase query error:', error.message);
      return [];
    }
    
    console.log(`✅ Found ${editais?.length || 0} editais with status '${status}'`);
    return editais || [];
  } catch (error) {
    console.error(`Error fetching editais by status '${status}':`, error);
    return [];
  }
}

/**
 * Main serverless function handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📋 Editais request received');
    
    const { status, limit } = req.query;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    let editais;
    if (status && status !== 'todos') {
      editais = await getEditaisByStatus(status, limitNum);
    } else {
      editais = await getAllEditais(limitNum);
    }

    console.log(`✅ Returning ${editais.length} editais`);
    res.json(editais);
  } catch (error) {
    console.error("❌ Error in editais function:", error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}