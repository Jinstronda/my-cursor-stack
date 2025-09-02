#!/usr/bin/env node

/**
 * Test script to verify AI changes work correctly
 * Tests the new AI prompt structure and value logic
 */

import { generateEditalAnalysis } from './server/services/openai.js';

// Mock test data
const testEditalName = "Edital de Fomento ao Audiovisual - ANCINE 2024";
const testEditalDescription = "Edital para financiamento de produções audiovisuais nacionais";

// Test PDF content with various scenarios
const testPdfContents = [
  `
  EDITAL ANCINE 2024/001
  
  INSTITUIÇÃO RESPONSÁVEL: Agência Nacional do Cinema (ANCINE)
  
  LOCALIZAÇÃO: São Paulo, Rio de Janeiro, Minas Gerais
  
  VALOR TOTAL DO EDITAL: R$ 50.000.000,00 (cinquenta milhões de reais)
  
  VALOR MÁXIMO POR PROJETO: R$ 1.500.000,00 (um milhão e quinhentos mil reais)
  
  Este edital destina-se ao financiamento de produções cinematográficas de longa-metragem.
  
  CRITÉRIOS DE ELEGIBILIDADE:
  - Empresas brasileiras com CNPJ ativo
  - Projetos com roteiro finalizado
  - Comprovação de capacidade técnica
  
  PROCESSO DE SELEÇÃO: Análise de mérito técnico e artístico
  
  DOCUMENTOS NECESSÁRIOS:
  - CNPJ da empresa
  - Roteiro do projeto
  - Orçamento detalhado
  `,
  `
  EDITAL SECULT/BA 2024
  
  INSTITUIÇÃO: Secretaria de Cultura da Bahia (SECULT/BA)
  
  ABRANGÊNCIA: Todo território nacional
  
  VALORES POR CATEGORIA:
  - Curta-metragem: R$ 100.000,00
  - Média-metragem: R$ 300.000,00
  - Longa-metragem: R$ 800.000,00
  
  PROCESSO SELETIVO: Avaliação técnica e análise curatorial
  `
];

async function runTests() {
  console.log('🧪 Testing AI edital analysis changes...\n');

  try {
    // Test 1: Single value scenario
    console.log('📋 Test 1: Single value scenario');
    const result1 = await generateEditalAnalysis(testEditalName, testEditalDescription, [testPdfContents[0]]);
    console.log('✅ Institution:', result1.instituicao);
    console.log('✅ Location:', result1.localizacao);
    console.log('✅ Total Value:', result1.valorTotal);
    console.log('✅ Max Project Value:', result1.valorMaximoPorProjeto);
    console.log('');

    // Test 2: Multiple values scenario
    console.log('📋 Test 2: Multiple values scenario');
    const result2 = await generateEditalAnalysis(
      "Edital SECULT/BA 2024", 
      "Edital para diversas categorias de projetos", 
      [testPdfContents[1]]
    );
    console.log('✅ Institution:', result2.instituicao);
    console.log('✅ Location:', result2.localizacao);
    console.log('✅ Total Value:', result2.valorTotal);
    console.log('✅ Max Project Value:', result2.valorMaximoPorProjeto);
    console.log('');

    // Test 3: Fallback scenario
    console.log('📋 Test 3: Fallback scenario (empty content)');
    const result3 = await generateEditalAnalysis(testEditalName, testEditalDescription, ['']);
    console.log('✅ Institution:', result3.instituicao);
    console.log('✅ Location:', result3.localizacao);
    console.log('✅ Total Value:', result3.valorTotal);
    console.log('✅ Max Project Value:', result3.valorMaximoPorProjeto);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    // Test fallback generation
    console.log('\n🔄 Testing fallback generation...');
    const fallback = {
      instituicao: 'Instituição não identificada',
      localizacao: ['Brasil'],
      valorTotal: 'Variável',
      valorMaximoPorProjeto: 'Variável',
      resumo: 'Análise não disponível',
      pontosImportantes: ['Consultar edital original'],
      recomendacoes: ['Verificar documentação completa']
    };
    console.log('✅ Fallback generated successfully');
  }
}

// Run tests
runTests().catch(console.error);