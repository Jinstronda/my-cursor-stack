import OpenAI from "openai";

let openai: OpenAI | null = null;
let isOpenAIConnected = false;

// Test OpenAI connection on startup
async function validateOpenAIConnection() {
  try {
    console.log("Validando conexão com OpenAI...");
    await openai!.models.list();
    isOpenAIConnected = true;
    console.log("✅ Conexão com OpenAI validada com sucesso");
  } catch (error) {
    console.error("❌ Falha na validação da OpenAI:", error instanceof Error ? error.message : "Erro desconhecido");
    isOpenAIConnected = false;
  }
}

// Initialize OpenAI service after environment variables are loaded
export async function initializeOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (apiKey) {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    openai = new OpenAI({ 
      apiKey
    });

    // Validate connection
    await validateOpenAIConnection();
  } else {
    console.log("⚠️  OPENAI_API_KEY não está configurada - AI features desabilitadas");
    console.log("   Para habilitar funcionalidades de IA, adicione OPENAI_API_KEY ao seu .env");
  }
}

// Legacy function - kept for compatibility but no longer throws errors
// Individual functions now handle OpenAI availability gracefully
function checkOpenAIAvailability() {
  if (!openai || !isOpenAIConnected) {
    console.warn("OpenAI service not available - using fallback functionality");
    return false;
  }
  return true;
}

export interface ChatResponse {
  content: string;
  shouldGenerateDocument?: boolean;
  documentType?: string;
  nextStep?: 'creating' | 'completed';
}

export interface DocumentContent {
  title: string;
  sections: Array<{
    heading: string;
    content: string | object;
  }>;
}

/**
 * Normalize document content to ensure clean, readable format
 * Prevents JSON artifacts and maintains consistency
 */
function normalizeDocumentContent(document: DocumentContent): DocumentContent {
  return {
    ...document,
    sections: document.sections.map(section => ({
      ...section,
      content: normalizeContent(section.content)
    }))
  };
}

/**
 * Normalize individual content to clean string format
 */
function normalizeContent(content: string | object): string {
  if (typeof content === 'string') {
    return content.trim();
  }
  
  if (Array.isArray(content)) {
    // Convert arrays to clean bullet points
    return content
      .filter(item => item != null && String(item).trim().length > 0)
      .map(item => `• ${String(item).trim()}`)
      .join('\n');
  }
  
  if (typeof content === 'object' && content !== null) {
    // Convert objects to readable key-value format
    return Object.entries(content)
      .filter(([key, value]) => value != null && String(value).trim().length > 0)
      .map(([key, value]) => `**${key}**: ${String(value).trim()}`)
      .join('\n\n');
  }
  
  return String(content).trim();
}

export interface ProjectMetadata {
  title: string;
  description: string;
}

export async function generateChatResponse(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>): Promise<ChatResponse> {
  try {
    // Check if OpenAI is available before making request
    if (!openai || !isOpenAIConnected) {
      console.log("OpenAI not available, returning fallback chat response");
      return {
        content: "Desculpe, o serviço de IA está temporariamente indisponível. Mas posso ajudá-lo a organizar suas ideias! Conte-me mais sobre seu projeto cinematográfico e vamos desenvolver juntos os próximos passos."
      };
    }
    const systemPrompt = `Você é um produtor cinematográfico AI experiente e criativo. Você ajuda cineastas a desenvolver seus projetos desde a concepção até a produção. Suas especialidades incluem:

- Desenvolvimento de roteiros e conceitos
- Criação de documentos de produção (bible do projeto, breakdown de personagens, orçamentos, cronogramas)
- Análise de viabilidade de projetos
- Orientação sobre processo criativo e técnico

IMPORTANTE: Sempre responda em formato JSON estruturado conforme as especificações abaixo.

FLUXO OBRIGATÓRIO PARA CRIAÇÃO DE DOCUMENTOS:
Quando o usuário pedir para criar um documento, SEMPRE siga estas 3 etapas (o sistema automatiza as etapas 2 e 3):

1. PRIMEIRA RESPOSTA - Confirme que entendeu e retorne JSON:
{
  "content": "Entendi perfeitamente sua ideia! Vou criar [TIPO DO DOCUMENTO] baseado nas informações que você compartilhou. Isso vai incluir [BREVE DESCRIÇÃO DO QUE SERÁ CRIADO].",
  "shouldGenerateDocument": false,
  "nextStep": "creating"
}

O sistema então criará automaticamente:
- Etapa 2: Mensagem dizendo que está criando o documento
- Etapa 3: Mensagem confirmando que criou e adicionou na pasta

REGRAS:
- APENAS gere documentos se o usuário EXPLICITAMENTE solicitar
- Seja curioso e faça perguntas detalhadas antes de criar documentos
- Responda sempre em português brasileiro de forma profissional mas acessível
- SEMPRE use o formato JSON válido para suas respostas

Para conversas normais (sem criação de documento), responda em JSON:
{
  "content": "sua resposta fazendo perguntas ou discutindo o projeto"
}`;

    const response = await openai!.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map(msg => ({ role: msg.role as 'user' | 'assistant' | 'system', content: msg.content }))
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    let result;
    try {
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Resposta vazia da OpenAI");
      }
      result = JSON.parse(content);
      
      // Validate required fields
      if (typeof result !== 'object' || result === null) {
        throw new Error("Resposta inválida da OpenAI");
      }
      
      // Ensure nextStep field is properly handled
      if (result.nextStep) {
        result.nextStep = result.nextStep;
      }
    } catch (parseError) {
      console.error("Erro ao fazer parse da resposta OpenAI (chat):", parseError);
      console.error("Conteúdo recebido:", response.choices[0].message.content);
      throw new Error("Resposta malformada do serviço de IA. Tente novamente.");
    }
    
    return {
      content: result.content || "Desculpe, não consegui processar sua solicitação.",
      shouldGenerateDocument: result.shouldGenerateDocument || false,
      documentType: result.documentType,
      nextStep: result.nextStep
    };
  } catch (error) {
    console.error("Erro ao gerar resposta do chat:", error);
    
    // Provide specific error messages based on error type
    if (error instanceof Error) {
      if (error.message.includes("temporariamente indisponível")) {
        throw error; // Re-throw our custom availability error
      }
      if (error.message.includes("Invalid API key") || error.message.includes("401")) {
        throw new Error("Problema de autenticação com o serviço de IA. Contate o suporte.");
      }
      if (error.message.includes("Rate limit") || error.message.includes("429")) {
        throw new Error("Muitas solicitações simultâneas. Aguarde alguns segundos e tente novamente.");
      }
    }
    
    throw new Error("Erro temporário no serviço de IA. Tente novamente em alguns momentos.");
  }
}

export async function generateDocument(type: string, projectContext: string): Promise<DocumentContent> {
  try {
    // Check if OpenAI is available before making request
    if (!openai || !isOpenAIConnected) {
      console.log("OpenAI not available, returning fallback document");
      return generateFallbackDocument(type, projectContext);
    }
    
    console.log(`Starting document generation for type: ${type}`);
    console.log(`Project context: ${projectContext}`);
    
    let documentPrompt = "";
    
    switch (type) {
      case "overview":
        documentPrompt = `Crie um documento detalhado de visão geral do projeto cinematográfico baseado no contexto: ${projectContext}

Inclua seções para:
- Logline
- Gênero e Tom
- Temas Centrais
- Estrutura de Três Atos
- Referências Visuais
- Considerações de Orçamento
- Próximos Passos

Responda em formato JSON com a estrutura:
{
  "title": "Título do documento",
  "sections": [
    {
      "heading": "Nome da seção",
      "content": "Conteúdo da seção ou objeto estruturado"
    }
  ]
}`;
        break;
        
      case "character":
        documentPrompt = `Crie um breakdown detalhado de personagens para o projeto: ${projectContext}

Inclua para cada personagem principal:
- Nome e idade
- Background e motivações
- Arco narrativo
- Relacionamentos chave
- Notas para casting

Responda em formato JSON com a estrutura:
{
  "title": "Análise de Personagens - [Nome do Projeto]",
  "sections": [
    {
      "heading": "Personagem Principal",
      "content": "Descrição detalhada do personagem principal"
    },
    {
      "heading": "Personagens Secundários",
      "content": "Descrição dos personagens secundários"
    },
    {
      "heading": "Notas para Casting",
      "content": "Orientações para seleção de elenco"
    }
  ]
}`;
        break;
        
      case "budget":
        documentPrompt = `Crie um esboço de orçamento para o projeto: ${projectContext}

Inclua categorias principais:
- Above-the-line (elenco, direção, produção)
- Below-the-line (equipe técnica, equipamentos)
- Pós-produção
- Marketing e distribuição
- Contingência

Responda em formato JSON com a estrutura:
{
  "title": "Orçamento de Produção - [Nome do Projeto]",
  "sections": [
    {
      "heading": "Above-the-Line",
      "content": "Custos com elenco, direção e produção executiva"
    },
    {
      "heading": "Below-the-Line",
      "content": "Custos com equipe técnica e equipamentos"
    },
    {
      "heading": "Pós-Produção",
      "content": "Custos de edição, som, cor e finalização"
    },
    {
      "heading": "Marketing e Distribuição",
      "content": "Custos de divulgação e distribuição"
    },
    {
      "heading": "Contingência",
      "content": "Reserva para imprevistos (10-15% do total)"
    }
  ]
}`;
        break;
        
      case "schedule":
        documentPrompt = `Crie um cronograma de produção para o projeto: ${projectContext}

Inclua fases:
- Pré-produção
- Produção principal
- Pós-produção
- Distribuição

Responda em formato JSON com a estrutura:
{
  "title": "Cronograma de Produção - [Nome do Projeto]",
  "sections": [
    {
      "heading": "Pré-Produção",
      "content": "Planejamento, casting, locações e preparação"
    },
    {
      "heading": "Produção Principal",
      "content": "Filmagem principal com cronograma detalhado"
    },
    {
      "heading": "Pós-Produção",
      "content": "Edição, som, cor, efeitos e finalização"
    },
    {
      "heading": "Distribuição",
      "content": "Marketing, festivais e lançamento"
    }
  ]
}`;
        break;
        
      default:
        throw new Error("Tipo de documento não suportado");
    }

    const response = await openai!.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Você é um especialista em documentação cinematográfica. Crie documentos detalhados e profissionais em português brasileiro." },
        { role: "user", content: documentPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
    });

    let result;
    try {
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Resposta vazia da OpenAI");
      }
      result = JSON.parse(content);
      
      // Validate document structure
      if (typeof result !== 'object' || result === null) {
        throw new Error("Resposta inválida da OpenAI");
      }
      if (!result.title || !Array.isArray(result.sections)) {
        throw new Error("Estrutura de documento inválida");
      }
    } catch (parseError) {
      console.error("Erro ao fazer parse da resposta OpenAI (document):", parseError);
      console.error("Conteúdo recebido:", response.choices[0].message.content);
      throw new Error("Resposta malformada do serviço de IA. Tente novamente.");
    }
    
    console.log(`OpenAI response for ${type}:`, result);
    
    const finalDocument = {
      title: result.title || `Documento ${type}`,
      sections: result.sections || []
    };
    
    console.log(`Final document for ${type}:`, finalDocument);
    
    // Normalize document content before returning
    const normalizedDocument = normalizeDocumentContent(finalDocument);
    console.log(`Normalized document for ${type}:`, normalizedDocument);
    
    return normalizedDocument;
  } catch (error) {
    console.error("Erro ao gerar documento:", error);
    
    // Provide specific error messages based on error type
    if (error instanceof Error) {
      if (error.message.includes("temporariamente indisponível")) {
        throw error; // Re-throw our custom availability error
      }
      if (error.message.includes("Invalid API key") || error.message.includes("401")) {
        throw new Error("Problema de autenticação com o serviço de IA. Contate o suporte.");
      }
      if (error.message.includes("Rate limit") || error.message.includes("429")) {
        throw new Error("Muitas solicitações simultâneas. Aguarde alguns segundos e tente novamente.");
      }
      if (error.message.includes("Tipo de documento não suportado")) {
        throw error; // Re-throw document type error
      }
    }
    
    // Return fallback document instead of throwing error
    console.log("Using fallback document generation due to error");
    return generateFallbackDocument(type, projectContext);
  }
}

// Generate fallback metadata when OpenAI is not available
function generateFallbackMetadata(initialMessage: string): ProjectMetadata {
  // Extract key words and create a simple title
  const words = initialMessage.toLowerCase().split(' ').filter(word => word.length > 3);
  const keyWords = words.slice(0, 3); // Take first 3 meaningful words
  
  // Generate a simple title based on the content
  let title = "Projeto Cinematográfico";
  if (keyWords.length > 0) {
    title = keyWords.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    if (title.length > 50) {
      title = title.substring(0, 47) + "...";
    }
  }
  
  // Create a simple description
  let description = initialMessage;
  if (description.length > 150) {
    description = description.substring(0, 147) + "...";
  }
  
  return {
    title,
    description
  };
}

// Generate fallback document when OpenAI is not available
function generateFallbackDocument(type: string, projectContext: string): DocumentContent {
  const typeLabels: Record<string, string> = {
    overview: "Visão Geral do Projeto",
    character: "Desenvolvimento de Personagens",
    budget: "Orçamento de Produção",
    schedule: "Cronograma de Produção",
    script: "Roteiro",
    treatment: "Tratamento"
  };
  
  const title = typeLabels[type] || "Documento do Projeto";
  
  const content = {
    title,
    sections: [{
      heading: "Contexto do Projeto",
      content: projectContext || "Este documento será desenvolvido com base nas informações do projeto."
    }, {
      heading: "Próximos Passos",
      content: "Este documento é um rascunho inicial. Para obter um documento completo e detalhado, certifique-se de que o serviço de IA esteja configurado."
    }]
  };
  
  // Normalize fallback document as well
  return normalizeDocumentContent(content);
}

/**
 * Generate AI analysis specifically for edital documents
 * This function is designed for analyzing tender/grant documents, not chat conversations
 */
export async function generateEditalAnalysis(editalName: string, editalDescription: string, pdfContents: string[]): Promise<any> {
  try {
    console.log(`🤖 Generating edital analysis for: ${editalName}`);
    console.log(`📄 Processing ${pdfContents.length} PDF(s) with total ${pdfContents.join(' ').length} characters`);

    // Check if OpenAI is available before making request
    if (!openai || !isOpenAIConnected) {
      console.log("❌ OpenAI not available, returning structured fallback edital analysis");
      return {
        resumo: `Análise do edital "${editalName}" não pode ser processada automaticamente no momento. Por favor, consulte os documentos PDF originais para informações completas sobre objetivos, critérios de elegibilidade, valores disponíveis, prazos de inscrição e documentos necessários.`,
        pontosImportantes: [
          "Consultar documentação completa nos PDFs originais",
          "Verificar todos os critérios de elegibilidade",  
          "Atentar para prazos de submissão",
          "Preparar documentação conforme especificado no edital"
        ],
        recomendacoes: [
          "Ler edital completo antes de iniciar candidatura",
          "Preparar documentos com antecedência suficiente",
          "Verificar conformidade com todos os requisitos",
          "Buscar esclarecimentos se necessário"
        ],
        palavrasChave: ["edital", "audiovisual", "cultura", "financiamento", "projeto"],
        criteriosElegibilidade: ["Documentação regular conforme especificado"],
        processoSelecao: "Consultar processo detalhado nos documentos PDF",
        documentosNecessarios: ["Conforme especificado no edital completo"]
      };
    }

    // Combine all PDF contents
    const combinedContent = pdfContents.join('\n\n--- PRÓXIMO DOCUMENTO ---\n\n');

    // Create comprehensive prompt for edital analysis  
    const analysisPrompt = `Você é um especialista em análise de editais culturais e audiovisuais. Analise cuidadosamente o seguinte edital em detalhes:

**INFORMAÇÕES BÁSICAS:**
- Nome do Edital: ${editalName}
- Descrição: ${editalDescription}

**CONTEÚDO DOS DOCUMENTOS PDF:**
${combinedContent}

**INSTRUÇÕES DETALHADAS:**
Analise completamente o conteúdo e extraia as seguintes informações de forma precisa e detalhada:

1. **INSTITUIÇÃO RESPONSÁVEL**: Identifique o nome EXATO da instituição responsável pelo edital (ex: ANCINE, SECULT, FUNARTE, Petrobras, etc.) - não use "Sistema NOCI"

2. **LOCALIZAÇÃO**: Identifique os estados do Brasil contemplados pelo edital. Se mencionar "âmbito nacional" ou "todo território nacional", retorne ["Brasil"]. Se mencionar estados específicos, liste-os (ex: ["São Paulo", "Rio de Janeiro", "Minas Gerais"])

3. **VALOR TOTAL DO EDITAL**: Analise os valores mencionados no edital:
   - Se houver apenas UM valor total claramente declarado, use esse valor
   - Se houver MÚLTIPLOS valores (por categoria, por região, etc.), use "Variável"
   - Se não houver valor claramente definido, use "Não especificado"

4. **VALOR MÁXIMO POR PROJETO**: Analise os limites por projeto:
   - Se houver apenas UM limite máximo por projeto, use esse valor
   - Se houver MÚLTIPLOS limites (por categoria, tipo de projeto, etc.), use "Variável"
   - Se não houver limite especificado, use "Não especificado"

5. **RESUMO EXECUTIVO**: Resuma o objetivo principal do edital em 2-3 parágrafos

6. **PONTOS IMPORTANTES**: Liste 4-6 pontos mais críticos que os candidatos devem saber

7. **RECOMENDAÇÕES**: Forneça 3-5 recomendações práticas para aumentar chances de aprovação

8. **PALAVRAS-CHAVE**: Extraia 8-12 palavras-chave relevantes do documento

9. **CRITÉRIOS DE ELEGIBILIDADE**: Liste todos os critérios de elegibilidade encontrados

10. **PROCESSO DE SELEÇÃO**: Descreva como funciona o processo de seleção

11. **DOCUMENTOS NECESSÁRIOS**: Liste todos os documentos necessários para inscrição

Responda APENAS em formato JSON válido com esta estrutura exata:
{
  "instituicao": "Nome exato da instituição responsável",
  "localizacao": ["lista de estados ou Brasil"],
  "valorTotal": "valor numérico ou Variável ou Não especificado",
  "valorMaximoPorProjeto": "valor numérico ou Variável ou Não especificado",
  "resumo": "Resumo executivo detalhado do edital",
  "pontosImportantes": ["ponto 1", "ponto 2", "ponto 3", "ponto 4"],
  "recomendacoes": ["recomendação 1", "recomendação 2", "recomendação 3"],
  "palavrasChave": ["palavra1", "palavra2", "palavra3", "palavra4", "palavra5"],
  "criteriosElegibilidade": ["critério 1", "critério 2", "critério 3"],
  "processoSelecao": "Descrição detalhada do processo de seleção",
  "documentosNecessarios": ["documento 1", "documento 2", "documento 3"]
}`;

    const response = await openai!.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: 'system', 
          content: 'Você é um especialista em análise de editais culturais e audiovisuais. Sempre responda em JSON válido com análises precisas e práticas baseadas exclusivamente no conteúdo fornecido.' 
        },
        { 
          role: 'user', 
          content: analysisPrompt 
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 2000
    });

    let analysisResult;
    try {
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Resposta vazia da OpenAI');
      }
      analysisResult = JSON.parse(content);
      
      // Validate required fields
      const requiredFields = ['resumo', 'pontosImportantes', 'recomendacoes', 'palavrasChave', 'criteriosElegibilidade', 'processoSelecao', 'documentosNecessarios'];
      for (const field of requiredFields) {
        if (!analysisResult[field]) {
          console.warn(`Campo obrigatório ausente na resposta da IA: ${field}`);
        }
      }
      
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse da resposta OpenAI para análise de edital:', parseError);
      console.error('Conteúdo recebido:', response.choices[0].message.content);
      
      // Return structured fallback instead of generic chat fallback
      return {
        resumo: `Análise detalhada do edital "${editalName}" encontrou dificuldades no processamento automático. O edital trata de ${editalDescription}. Por favor, consulte os documentos PDF para informações completas.`,
        pontosImportantes: [
          "Consultar documentação completa nos PDFs originais",
          "Verificar todos os critérios de elegibilidade",
          "Atentar para prazos de submissão", 
          "Preparar documentação conforme especificado"
        ],
        recomendacoes: [
          "Ler edital completo antes de iniciar candidatura",
          "Preparar documentos com antecedência",
          "Verificar conformidade com todos os requisitos",
          "Buscar esclarecimentos se necessário"
        ],
        palavrasChave: ["edital", "audiovisual", "cultura", "financiamento", "projeto"],
        criteriosElegibilidade: ["Documentação regular conforme especificado"],
        processoSelecao: "Consultar processo detalhado nos documentos PDF",
        documentosNecessarios: ["Conforme especificado no edital completo"]
      };
    }

    console.log('✅ Análise de edital gerada com sucesso');
    return analysisResult;

  } catch (error) {
    console.error('❌ Erro ao gerar análise do edital:', error);
    
    // Return structured fallback for any other errors
    return {
      resumo: `Análise do edital "${editalName}" não pode ser completada devido a erro técnico. ${editalDescription} - Consulte os documentos PDF para informações completas.`,
      pontosImportantes: [
        "Consultar documentação completa nos PDFs originais", 
        "Verificar critérios de elegibilidade específicos",
        "Atentar para todos os prazos mencionados",
        "Preparar documentação conforme solicitado"
      ],
      recomendacoes: [
        "Ler edital completo com atenção",
        "Preparar documentos com antecedência",
        "Verificar todos os requisitos",
        "Buscar esclarecimentos se necessário"
      ],
      palavrasChave: ["edital", "cultura", "audiovisual", "financiamento", "projeto"],
      criteriosElegibilidade: ["Documentação regular"],
      processoSelecao: "Consultar processo nos documentos originais",
      documentosNecessarios: ["Conforme especificado no edital"]
    };
  }
}

export async function generateProjectMetadata(initialMessage: string): Promise<ProjectMetadata> {
  try {
    // Check if OpenAI is available before making request
    if (!openai || !isOpenAIConnected) {
      console.log("OpenAI not available, using fallback metadata generation");
      return generateFallbackMetadata(initialMessage);
    }
    
    console.log("Generating project metadata for message:", initialMessage);
    
    const metadataPrompt = `Baseado na seguinte ideia de projeto cinematográfico, gere um título criativo e uma descrição profissional concisa:

IDEIA: "${initialMessage}"

Crie:
1. Um título cativante e cinematográfico (máximo 50 caracteres)
2. Uma descrição profissional que capture a essência do projeto (máximo 150 caracteres)

A descrição deve ser envolvente e dar uma visão clara do gênero, tom e história principal.

Responda APENAS em formato JSON:
{
  "title": "Título do projeto",
  "description": "Descrição concisa e profissional"
}`;

    const response = await openai!.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "Você é um especialista em desenvolvimento de projetos cinematográficos. Crie títulos e descrições envolventes e profissionais em português brasileiro." 
        },
        { role: "user", content: metadataPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 300
    });

    let result;
    try {
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Resposta vazia da OpenAI");
      }
      result = JSON.parse(content);
      
      // Validate response structure
      if (typeof result !== 'object' || result === null) {
        throw new Error("Resposta inválida da OpenAI");
      }
      if (!result.title || !result.description) {
        throw new Error("Metadados incompletos da OpenAI");
      }
    } catch (parseError) {
      console.error("Erro ao fazer parse da resposta OpenAI (metadata):", parseError);
      console.error("Conteúdo recebido:", response.choices[0].message.content);
      
      // Fallback to default metadata
      return {
        title: "Novo Projeto Cinematográfico",
        description: "Projeto em desenvolvimento com base na ideia inicial do usuário."
      };
    }
    
    console.log("Generated project metadata:", result);
    
    return {
      title: result.title || "Novo Projeto Cinematográfico",
      description: result.description || "Projeto em desenvolvimento"
    };
  } catch (error) {
    console.error("Erro ao gerar metadados do projeto:", error);
    
    // Return fallback metadata based on user input instead of static text
    console.log("Using fallback metadata generation due to error");
    return generateFallbackMetadata(initialMessage);
  }
}
