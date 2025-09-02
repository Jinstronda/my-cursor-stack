import express from "express";
import multer from "multer";
import { storage } from "./storage";
import { insertEditalSchema } from "@shared/schema";
import { supabase, supabaseAdmin } from "./supabaseClient";
import pdf from "pdf-parse";
import { generateEditalAnalysis as generateAIAnalysis } from "./services/openai";

const router = express.Router();

/**
 * Configure multer for handling file uploads
 * Files are stored in memory before uploading to Supabase Storage
 */
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
  },
  fileFilter: (req, file, cb) => {
    // Only accept PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

/**
 * POST /api/editais - Create a new edital
 */
router.post("/", async (req, res) => {
  try {
    console.log('📥 POST /api/editais - Request body:', req.body);

    // Validate request body against schema
    const validatedData = insertEditalSchema.parse(req.body);
    console.log('✅ Validated data:', validatedData);

    // Create edital in database
    const edital = await storage.createEdital(validatedData);
    console.log('✅ Edital created:', edital);

    res.status(201).json(edital);
  } catch (error) {
    console.error('❌ Error creating edital:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Invalid data format',
        details: error.errors
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/editais - Get all editais with optional filtering (public access)
 */
router.get("/", async (req, res) => {
  try {
    const { status, limit } = req.query;
    const limitNum = limit ? parseInt(limit as string, 10) : 50;

    let editais;
    if (status && status !== 'todos') {
      editais = await storage.getEditaisByStatus(status as string, limitNum);
    } else {
      editais = await storage.getAllEditais(limitNum);
    }

    console.log(`📋 Retrieved ${editais.length} editais`);
    res.json(editais);
  } catch (error) {
    console.error('❌ Error fetching editais:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/editais/:id - Get edital by ID with PDFs
 */
router.get("/:id", async (req, res) => {
  try {
    const editalId = parseInt(req.params.id, 10);
    
    if (isNaN(editalId)) {
      return res.status(400).json({ error: 'Invalid edital ID' });
    }

    const edital = await storage.getEditalWithPdfs(editalId);
    
    if (!edital) {
      return res.status(404).json({ error: 'Edital not found' });
    }

    res.json(edital);
  } catch (error) {
    console.error('❌ Error fetching edital:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/editais/upload-pdf - Upload PDF file to Supabase Storage
 */
router.post("/upload-pdf", upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { editalId, fileName } = req.body;
    
    if (!editalId || !fileName) {
      return res.status(400).json({ error: 'Missing editalId or fileName' });
    }

    console.log(`📁 Uploading PDF: ${fileName} for edital ${editalId}`);

    // Check if Supabase client is available
    if (!supabase) {
      console.error('❌ Supabase client not initialized');
      return res.status(500).json({ error: 'Storage service unavailable' });
    }

    // Generate unique file path
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${editalId}_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const filePath = `editais/${editalId}/pdfs/${uniqueFileName}`;

    console.log(`🔄 Uploading to Supabase Storage: ${filePath}`);

    // Upload file to Supabase Storage using admin client for server-side operations
    const storageClient = supabaseAdmin || supabase;
    const { data: uploadData, error: uploadError } = await storageClient.storage
      .from('documents') // Make sure this bucket exists
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError);
      return res.status(500).json({ 
        error: 'File upload failed', 
        details: uploadError.message 
      });
    }

    console.log('✅ File uploaded to Supabase Storage:', uploadData);

    // Create PDF record in database
    const pdfRecord = await storage.createEditalPdf({
      editalId: parseInt(editalId, 10),
      fileName: fileName,
      filePath: filePath,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
    });

    console.log('✅ PDF record created:', pdfRecord);

    res.status(201).json({
      success: true,
      pdf: pdfRecord,
      storageData: uploadData
    });

  } catch (error) {
    console.error('❌ Error uploading PDF:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/editais/process-ai - Trigger AI processing for an edital
 */
router.post("/process-ai", async (req, res) => {
  try {
    const { editalId } = req.body;
    
    if (!editalId) {
      return res.status(400).json({ error: 'Missing editalId' });
    }

    console.log(`🤖 Starting AI processing for edital ${editalId}`);

    // Get the edital with PDFs
    const edital = await storage.getEditalWithPdfs(editalId);
    if (!edital) {
      return res.status(404).json({ error: 'Edital not found' });
    }

    if (edital.pdfs.length === 0) {
      return res.status(400).json({ error: 'No PDFs found for processing' });
    }

    // Start AI processing in background (non-blocking)
    // This should be implemented as a background job in production
    processEditaisAI(edital).catch(error => {
      console.error('❌ Background AI processing failed:', error);
    });

    res.json({ 
      success: true, 
      message: 'AI processing started in background',
      editalId: editalId,
      pdfCount: edital.pdfs.length
    });

  } catch (error) {
    console.error('❌ Error starting AI processing:', error);
    res.status(500).json({ 
      error: 'Failed to start AI processing',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Download PDF from Supabase Storage and extract text content
 */
async function downloadAndExtractPdf(filePath: string): Promise<string> {
  try {
    console.log(`📄 Downloading PDF from Supabase Storage: ${filePath}`);
    
    // Check if Supabase client is available
    const storageClient = supabaseAdmin || supabase;
    if (!storageClient) {
      throw new Error('Supabase client not initialized');
    }

    // Download file from Supabase Storage using admin client for server-side operations
    const { data, error } = await storageClient.storage
      .from('documents')
      .download(filePath);

    if (error) {
      console.error('❌ Error downloading PDF from Supabase:', error);
      throw new Error(`Failed to download PDF: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data received from Supabase Storage');
    }

    console.log(`✅ PDF downloaded successfully: ${data.size} bytes`);

    // Convert Blob to Buffer for pdf-parse
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`🔍 Extracting text from PDF...`);

    // Extract text from PDF using pdf-parse
    const pdfData = await pdf(buffer);
    
    const extractedText = pdfData.text.trim();
    console.log(`✅ Text extracted successfully: ${extractedText.length} characters`);
    
    if (extractedText.length < 50) {
      console.warn('⚠️  Extracted text is very short, might be an image-based PDF');
    }

    return extractedText;

  } catch (error) {
    console.error('❌ Error in downloadAndExtractPdf:', error);
    throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Removed local generateEditalAnalysis function - now using bulletproof OpenAI service

/**
 * Background AI processing function
 * Processes real PDFs and generates AI analysis
 */
async function processEditaisAI(edital: any) {
  try {
    console.log(`🤖 Processing AI for edital ${edital.id} with ${edital.pdfs.length} PDFs`);

    // Step 1: Extract text from all PDFs
    const pdfContents: string[] = [];
    
    for (const pdf of edital.pdfs) {
      try {
        console.log(`📄 Processing PDF: ${pdf.fileName}`);
        const extractedText = await downloadAndExtractPdf(pdf.filePath);
        
        if (extractedText && extractedText.length > 0) {
          pdfContents.push(extractedText);
          
          // Mark PDF as processed with extracted content
          await storage.markPdfAsProcessed(
            pdf.id,
            extractedText,
            `Texto extraído do PDF ${pdf.fileName} com ${extractedText.length} caracteres`
          );
        } else {
          console.warn(`⚠️ No text extracted from PDF: ${pdf.fileName}`);
        }
      } catch (error) {
        console.error(`❌ Error processing PDF ${pdf.fileName}:`, error);
        // Continue with other PDFs even if one fails
      }
    }

    if (pdfContents.length === 0) {
      console.warn('⚠️ No PDF content extracted, using fallback analysis');
      pdfContents.push('Conteúdo dos PDFs não pôde ser extraído para análise.');
    }

    // Step 2: Generate AI analysis using extracted content
    console.log(`🤖 Generating AI analysis with ${pdfContents.length} PDF(s)`);
    const analysisResult = await generateAIAnalysis(
      edital.nome, 
      edital.descricao || 'Sem descrição fornecida', 
      pdfContents
    );
    console.log(`✅ Analysis result received:`, { hasResumo: !!analysisResult.resumo, resumoStart: analysisResult.resumo?.substring(0, 50) });

    // Step 3: Structure analysis data for database with new fields
    const analysisData = {
      orgaoResponsavel: analysisResult.instituicao || 'Instituição não especificada',
      local: Array.isArray(analysisResult.localizacao) ? analysisResult.localizacao.join(', ') : analysisResult.localizacao || 'Brasil',
      valorTotal: analysisResult.valorTotal === 'Variável' || analysisResult.valorTotal === 'Não especificado' ? null : 
        (typeof analysisResult.valorTotal === 'string' ? parseFloat(analysisResult.valorTotal.replace(/[^\d.,]/g, '').replace(',', '.')) : analysisResult.valorTotal),
      valorMaximoPorProjeto: analysisResult.valorMaximoPorProjeto === 'Variável' || analysisResult.valorMaximoPorProjeto === 'Não especificado' ? null : 
        (typeof analysisResult.valorMaximoPorProjeto === 'string' ? parseFloat(analysisResult.valorMaximoPorProjeto.replace(/[^\d.,]/g, '').replace(',', '.')) : analysisResult.valorMaximoPorProjeto),
      analisePersonalizada: {
        resumo: analysisResult.resumo || 'Análise não disponível',
        pontosImportantes: analysisResult.pontosImportantes || [],
        recomendacoes: analysisResult.recomendacoes || []
      },
      palavrasChave: analysisResult.palavrasChave || [],
      criteriosElegibilidade: analysisResult.criteriosElegibilidade || [],
      processoSelecao: analysisResult.processoSelecao || 'Processo não especificado',
      documentosNecessarios: analysisResult.documentosNecessarios || []
    };

    // Step 4: Update edital with AI analysis
    await storage.updateEdital(edital.id, analysisData);

    console.log(`✅ AI processing completed successfully for edital ${edital.id}`);
    
  } catch (error) {
    console.error(`❌ AI processing failed for edital ${edital.id}:`, error);
    
    // Fallback: Update with error status instead of leaving unprocessed
    try {
      await storage.updateEdital(edital.id, {
        orgaoResponsavel: 'Instituição não identificada automaticamente',
        local: 'Brasil',
        valorTotal: null,
        valorMaximoPorProjeto: null,
        analisePersonalizada: {
          resumo: `Erro no processamento automático do edital "${edital.nome}". Análise manual necessária.`,
          pontosImportantes: ['Documentação completa obrigatória', 'Verificar critérios específicos no PDF'],
          recomendacoes: ['Ler edital completo manualmente', 'Consultar requisitos específicos']
        },
        palavrasChave: ['edital', 'processamento', 'erro'],
        criteriosElegibilidade: ['Consultar documento original'],
        processoSelecao: 'Consultar processo no documento original',
        documentosNecessarios: ['Consultar lista no documento original']
      });
    } catch (updateError) {
      console.error(`❌ Failed to update edital with fallback data:`, updateError);
    }
  }
}

export default router;