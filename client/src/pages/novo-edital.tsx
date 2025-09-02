import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Upload, X, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/components/AuthProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { apiRequest, apiFormRequest } from "@/lib/queryClient";

export default function NovoEditalPage() {
  const { user, isAuthenticated, isLoading } = useAuthContext();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  
  // Form state
  const [nomeEdital, setNomeEdital] = useState("");
  const [descricao, setDescricao] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Check if user is admin when component mounts
  useEffect(() => {
    const checkAdminPermissions = async () => {
      if (!user || !isAuthenticated || !supabase) {
        setCheckingPermissions(false);
        return;
      }

      try {
        // Check if user has admin role in database using Supabase client
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Erro ao verificar permissões:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(userData?.role === 'admin');
        }
      } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        setIsAdmin(false);
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkAdminPermissions();
  }, [user, isAuthenticated]);

  // Handle file upload
  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');
    const totalFiles = arquivos.length + pdfFiles.length;
    
    if (totalFiles > 10) {
      alert('Máximo de 10 PDFs permitidos');
      return;
    }
    
    setArquivos(prev => [...prev, ...pdfFiles]);
  };

  // Remove file from list
  const removeFile = (index: number) => {
    setArquivos(prev => prev.filter((_, i) => i !== index));
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // Handle form submission with Supabase Storage upload
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nomeEdital.trim()) {
      setSubmitError('Nome do edital é obrigatório');
      return;
    }

    if (!user) {
      setSubmitError('Usuário não autenticado');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Step 1: Create the edital record
      const editalData = {
        nome: nomeEdital.trim(),
        descricao: descricao.trim() || 'Sem descrição fornecida',
        orgaoResponsavel: 'Sistema NOCI', // Default value
        prazoInscricao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        dataResultado: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
        status: 'aberto' as const,
        tipoVerba: 'publica' as const,
        areasContempladas: ['Audiovisual'],
        requisitosBasicos: ['Documentação completa'],
        local: 'Brasil',
        createdBy: user.id,
      };

      console.log('🔄 Criando edital:', editalData);
      
      // Use apiRequest to ensure proper authentication headers
      const editalResponse = await apiRequest('POST', '/api/editais', editalData);

      const createdEdital = await editalResponse.json();
      console.log('✅ Edital criado:', createdEdital);

      // Step 2: Upload PDFs if any were selected
      if (arquivos.length > 0) {
        console.log(`🔄 Uploading ${arquivos.length} PDF files...`);
        
        const uploadPromises = arquivos.map(async (arquivo, index) => {
          try {
            console.log(`🔄 Uploading file ${index + 1}/${arquivos.length}: ${arquivo.name}`);
            
            // Upload to Supabase Storage
            const formData = new FormData();
            formData.append('file', arquivo);
            formData.append('editalId', createdEdital.id.toString());
            formData.append('fileName', arquivo.name);

            // Use apiFormRequest to ensure proper authentication headers for file upload
            const uploadResponse = await apiFormRequest('POST', '/api/editais/upload-pdf', formData);

            const uploadResult = await uploadResponse.json();
            console.log(`✅ File uploaded: ${arquivo.name}`, uploadResult);
            
            return uploadResult;
          } catch (error) {
            console.error(`❌ Error uploading ${arquivo.name}:`, error);
            throw error;
          }
        });

        await Promise.all(uploadPromises);
        console.log('🎉 Todos os arquivos foram enviados com sucesso!');
        
        // Step 3: Trigger AI processing in the background (only if there are PDFs)
        try {
          // Use apiRequest to ensure proper authentication headers
          await apiRequest('POST', '/api/editais/process-ai', { editalId: createdEdital.id });
          console.log('🤖 Processamento de IA iniciado em background');
        } catch (aiError) {
          console.warn('⚠️ Erro ao iniciar processamento de IA (não crítico):', aiError);
        }
      } else {
        console.log('ℹ️ Nenhum PDF para upload, pulando processamento de IA');
      }

      // Success! Reset form and redirect
      setNomeEdital('');
      setDescricao('');
      setArquivos([]);
      alert('✅ Edital criado com sucesso! O processamento de IA será executado em segundo plano.');
      
      // Optional: redirect to editais page
      window.location.href = '/explorar/editais';
      
    } catch (error) {
      console.error('❌ Erro no envio do formulário:', error);
      setSubmitError(error instanceof Error ? error.message : 'Erro desconhecido ao criar edital');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading states
  if (isLoading || checkingPermissions) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Check if user has permission
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Acesso Negado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Você não tem permissão para acessar esta página. Apenas administradores podem criar editais.
            </p>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Voltar ao início
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center">
            <Link href="/explorar/editais">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar aos Editais
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-normal">
              Criar Novo Edital
            </CardTitle>
            <p className="text-muted-foreground">
              Preencha as informações do edital e faça upload dos arquivos PDF
            </p>
          </CardHeader>
          
          <CardContent>
            {/* Error Alert */}
            {submitError && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome do Edital */}
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-sm font-medium">
                  Nome do Edital *
                </Label>
                <Input
                  id="nome"
                  placeholder="Ex: Edital ANCINE 2024 - Produção de Longas-metragens"
                  value={nomeEdital}
                  onChange={(e) => setNomeEdital(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="descricao" className="text-sm font-medium">
                  Descrição do Edital
                </Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva o edital, seus objetivos, requisitos principais, valores, prazos e outras informações importantes..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="min-h-[200px] resize-none"
                  style={{ fieldSizing: 'content' }}
                />
                <p className="text-xs text-muted-foreground">
                  Campo de texto expansível - pode escrever quanto texto for necessário
                </p>
              </div>

              {/* Upload de Arquivos */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">
                  Arquivos PDF (máximo 10 arquivos)
                </Label>
                
                {/* Upload Area - Restricted to this container only */}
                <div
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragOver
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="text-sm text-foreground">
                      Arraste os arquivos PDF aqui ou clique para selecionar
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Apenas arquivos PDF • Máximo 10 arquivos • Até 50MB por arquivo
                    </p>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,application/pdf"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                {/* File List */}
                {arquivos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Arquivos selecionados ({arquivos.length}/10):
                    </p>
                    <div className="space-y-2">
                      {arquivos.map((arquivo, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm truncate">{arquivo.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(arquivo.size / 1024 / 1024).toFixed(1)} MB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-6">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Criando Edital...
                    </>
                  ) : (
                    'Criar Edital'
                  )}
                </Button>
                <Link href="/explorar/editais">
                  <Button type="button" variant="outline" disabled={isSubmitting}>
                    Cancelar
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}