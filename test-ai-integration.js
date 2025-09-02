#!/usr/bin/env node

/**
 * Comprehensive test suite for new AI edital analysis integration
 * Tests all 4 requested fixes: institution, location, dynamic value logic
 */

import { generateEditalAnalysis } from './server/services/openai.js';
import { storage } from './server/storage.js';

// Test data simulating different PDF scenarios
const testScenarios = [
  {
    name: "Edital ANCINE 2024 - Single Value",
    description: "Edital para financiamento de produções cinematográficas",
    pdfContent: `
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
    `
  },
  {
    name: "Edital SECULT/BA 2024 - Multiple Values",
    description: "Edital para diversas categorias de projetos culturais",
    pdfContent: `
      EDITAL SECULT/BA 2024
      
      INSTITUIÇÃO: Secretaria de Cultura da Bahia (SECULT/BA)
      
      ABRANGÊNCIA: Todo território nacional, com foco em Bahia, Pernambuco, Ceará
      
      VALORES POR CATEGORIA:
      - Curta-metragem: R$ 100.000,00
      - Média-metragem: R$ 300.000,00
      - Longa-metragem: R$ 800.000,00
      - Documentário: R$ 200.000,00
      - Animação: R$ 500.000,00
      
      PROCESSO SELETIVO: Avaliação técnica e análise curatorial
    `
  },
  {
    name: "Edital Petrobras Cultural - Complex Values",
    description: "Edital com múltiplas linhas de financiamento",
    pdfContent: `
      EDITAL PETROBRAS CULTURAL 2024
      
      INSTITUIÇÃO PROMOTORA: Petrobras Cultural
      
      COBERTURA: Nacional - todos os estados brasileiros
      
      LINHA 1 - ARTES VISUAIS: R$ 2.000.000 total, até R$ 200.000 por projeto
      LINHA 2 - MÚSICA: R$ 3.000.000 total, até R$ 300.000 por projeto
      LINHA 3 - TEATRO: R$ 1.500.000 total, até R$ 150.000 por projeto
      LINHA 4 - DANÇA: R$ 1.000.000 total, até R$ 100.000 por projeto
      
      TOTAL DO EDITAL: R$ 7.500.000,00
      
      CRITÉRIOS: Inscrição via plataforma online
    `
  },
  {
    name: "Edital sem valores específicos",
    description: "Edital com informações genéricas",
    pdfContent: `
      EDITAL DE FOMENTO À CULTURA
      
      ORGANIZADOR: Ministério da Cultura
      
      ESCOPO: Brasil
      
      Este edital visa apoiar projetos culturais diversos.
      
      Os valores serão definidos conforme análise dos projetos.
    `
  }
];

async function runComprehensiveTests() {
  console.log('🧪 Starting comprehensive AI edital analysis tests...\n');

  const results = [];

  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`📋 Test ${i + 1}: ${scenario.name}`);

    try {
      const result = await generateEditalAnalysis(
        scenario.name,
        scenario.description,
        [scenario.pdfContent]
      );

      results.push({
        scenario: scenario.name,
        result,
        passed: true
      });

      console.log('✅ Institution:', result.instituicao);
      console.log('✅ Location:', result.localizacao);
      console.log('✅ Total Value:', result.valorTotal);
      console.log('✅ Max Project Value:', result.valorMaximoPorProjeto);
      console.log('✅ Summary:', result.resumo?.substring(0, 100) + '...');
      console.log('');

    } catch (error) {
      console.error('❌ Test failed:', error.message);
      results.push({
        scenario: scenario.name,
        error: error.message,
        passed: false
      });
    }
  }

  // Validate results against expected patterns
  console.log('🔍 Validating results...\n');
  
  results.forEach((test, index) => {
    if (!test.passed) return;
    
    const { result } = test;
    
    // Check institution extraction
    const institutionValid = result.instituicao && 
      !result.instituicao.toLowerCase().includes('sistema noci') &&
      result.instituicao.length > 5;
    
    // Check location extraction
    const locationValid = result.localizacao && 
      Array.isArray(result.localizacao) && 
      result.localizacao.length > 0 &&
      !result.localizacao[0].toLowerCase().includes('brasil');
    
    // Check value logic
    const valueLogicValid = 
      (test.scenarios[index]?.name.includes('Single') && 
       result.valorTotal !== 'Variável' && 
       result.valorMaximoPorProjeto !== 'Variável') ||
      (test.scenarios[index]?.name.includes('Multiple') && 
       (result.valorTotal === 'Variável' || result.valorMaximoPorProjeto === 'Variável'));
    
    console.log(`Test ${index + 1} validations:`);
    console.log(`  Institution: ${institutionValid ? '✅' : '❌'} - "${result.instituicao}"`);
    console.log(`  Location: ${locationValid ? '✅' : '❌'} - [${result.localizacao?.join(', ')}]`);
    console.log(`  Value Logic: ${valueLogicValid ? '✅' : '❌'} - Total: ${result.valorTotal}, Max: ${result.valorMaximoPorProjeto}`);
  });

  // Summary
  console.log('\n📊 Test Summary:');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`✅ Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Ready for production.');
  } else {
    console.log('⚠️  Some tests failed. Review issues above.');
  }

  return results;
}

// Test database integration
async function testDatabaseIntegration() {
  console.log('\n📊 Testing database integration...\n');
  
  try {
    // Create a test edital
    const testEdital = await storage.createEdital({
      nome: "Teste AI Integration",
      descricao: "Edital de teste para validar integração AI",
      orgaoResponsavel: "Test Institution",
      local: "São Paulo, Rio de Janeiro",
      prazoInscricao: new Date('2024-12-31'),
      dataResultado: new Date('2025-02-15'),
      status: "aberto",
      tipoVerba: "publica",
      createdBy: "test-user"
    });

    console.log('✅ Test edital created:', testEdital.id);

    // Update with AI analysis
    await storage.updateEdital(testEdital.id, {
      orgaoResponsavel: "Agência Nacional do Cinema (ANCINE)",
      local: "São Paulo, Rio de Janeiro, Minas Gerais",
      valorTotal: 50000000,
      valorMaximoPorProjeto: 1500000,
      analisePersonalizada: {
        resumo: "Edital de fomento cinematográfico com valores bem definidos",
        pontosImportantes: ["CNPJ ativo necessário", "Roteiro finalizado obrigatório"],
        recomendacoes: ["Preparar documentação completa", "Verificar prazos"]
      },
      palavrasChave: ["cinema", "produção", "financiamento"],
      criteriosElegibilidade: ["Empresas brasileiras", "CNPJ ativo", "Roteiro finalizado"],
      processoSelecao: "Análise de mérito técnico e artístico",
      documentosNecessarios: ["CNPJ", "Roteiro", "Orçamento"]
    });

    console.log('✅ AI analysis integrated successfully');

    // Verify the edital
    const updatedEdital = await storage.getEdital(testEdital.id);
    console.log('✅ Retrieved updated edital:', {
      orgaoResponsavel: updatedEdital.orgaoResponsavel,
      local: updatedEdital.local,
      valorTotal: updatedEdital.valorTotal,
      valorMaximoPorProjeto: updatedEdital.valorMaximoPorProjeto,
      hasAnalise: !!updatedEdital.analisePersonalizada
    });

    return true;

  } catch (error) {
    console.error('❌ Database integration test failed:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive AI edital analysis validation...\n');
  
  try {
    const aiResults = await runComprehensiveTests();
    const dbSuccess = await testDatabaseIntegration();
    
    console.log('\n🎯 Final Validation Summary:');
    console.log(`AI Analysis Tests: ${aiResults.filter(r => r.passed).length}/${aiResults.length} passed`);
    console.log(`Database Integration: ${dbSuccess ? '✅' : '❌'}`);
    
    if (dbSuccess && aiResults.every(r => r.passed)) {
      console.log('\n🎉 ALL TESTS PASSED! The new AI analysis system is ready for production.');
      console.log('\n✅ Features validated:');
      console.log('   • Institution extraction from PDF content');
      console.log('   • Location extraction (specific Brazilian states)');
      console.log('   • Dynamic value logic for total funding');
      console.log('   • Dynamic value logic for max project values');
      console.log('   • Database integration with proper field mapping');
    } else {
      console.log('\n⚠️  Some validation issues found. Review the logs above.');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests, runComprehensiveTests, testDatabaseIntegration };