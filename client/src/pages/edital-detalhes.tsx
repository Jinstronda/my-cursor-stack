import { 
  FileText, 
  Calendar, 
  Building2, 
  DollarSign, 
  Clock, 
  MapPin, 
  CheckCircle, 
  AlertCircle,
  Download,
  ExternalLink,
  ArrowLeft,
  Users,
  Target,
  FileCheck,
  Info,
  Loader2
} from "lucide-react";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import UserAvatar from "@/components/user-avatar";
import SecondaryNavigation from "@/components/secondary-navigation";
import Logo from "@/components/logo";
import { useState, useEffect } from "react";
import type { EditalWithPdfs } from "@shared/schema";

// Interface para análise personalizada da IA
interface AnalisePersonalizada {
  resumo: string;
  pontosImportantes: string[];
  recomendacoes: string[];
}


const EditalDetalhes = () => {
  const params = useParams();
  const editalId = params.id as string;
  const [edital, setEdital] = useState<EditalWithPdfs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch edital details from API
  useEffect(() => {
    const fetchEdital = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/editais/${editalId}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Edital não encontrado');
          }
          throw new Error(`Erro ao carregar edital: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📋 Edital loaded:', data);
        setEdital(data);
      } catch (error) {
        console.error('❌ Error loading edital:', error);
        setError(error instanceof Error ? error.message : 'Erro ao carregar edital');
      } finally {
        setIsLoading(false);
      }
    };

    if (editalId) {
      fetchEdital();
    }
  }, [editalId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Carregando edital...</h2>
          <p className="text-muted-foreground">Aguarde enquanto carregamos os detalhes do edital.</p>
        </div>
      </div>
    );
  }

  // Error or not found state
  if (error || !edital) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {error === 'Edital não encontrado' ? 'Edital não encontrado' : 'Erro ao carregar'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {error === 'Edital não encontrado' 
              ? 'O edital que você está procurando não existe ou foi removido.'
              : error || 'Ocorreu um erro inesperado ao carregar os dados do edital.'
            }
          </p>
          <Link href="/explorar/editais">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Editais
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatarMoeda = (valor: string | number | null) => {
    if (valor === null || valor === undefined) return 'Variável';
    if (valor === 'Variável') return 'Variável';
    if (valor === 'Não especificado') return 'Não informado';
    
    const numValue = typeof valor === 'string' ? parseFloat(valor) : valor;
    if (isNaN(numValue)) return 'Variável';
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numValue);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Helper function to handle string or array data
  const processarTextoArray = (texto: string | string[] | undefined): string[] => {
    if (!texto) return [];
    if (Array.isArray(texto)) return texto;
    // Se for string única, dividir por pontos ou quebras de linha
    return texto.split(/[\n•·]/).filter(item => item.trim().length > 0).map(item => item.trim());
  };

  const calcularDiasRestantes = (prazo: string) => {
    const hoje = new Date();
    const dataPrazo = new Date(prazo);
    const diffTime = dataPrazo.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const diasRestantes = calcularDiasRestantes(edital.prazoInscricao);
  const isProximoVencimento = diasRestantes <= 7 && diasRestantes > 0;
  const isVencido = diasRestantes < 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="relative flex items-center h-10">
            <div className="absolute left-0 flex items-center justify-center">
              <Logo size={28} />
            </div>
            
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-8">
              <Link href="/explorar">
                <Button variant="ghost" className="h-10 text-sm font-normal px-4 text-foreground">
                  Explorar
                </Button>
              </Link>
              <Link href="/criar">
                <Button variant="ghost" className="h-10 text-sm font-normal px-4 text-muted-foreground hover:text-foreground">
                  Criar
                </Button>
              </Link>
            </div>

            <div className="absolute right-0 flex items-center justify-center">
              <Link href="/perfil">
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground">
                  <UserAvatar size={28} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <SecondaryNavigation type="explorar" />

      {/* Content */}
      <div className="flex-1 bg-background">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link href="/explorar/editais">
              <Button variant="ghost" size="sm" className="p-0 h-auto text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar aos Editais
              </Button>
            </Link>
          </div>

          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground mb-3">{edital.nome}</h1>
                <div className="flex items-center text-muted-foreground mb-2">
                  <Building2 className="w-5 h-5 mr-2" />
                  <span className="text-lg">{edital.orgaoResponsavel}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span>{edital.local || 'Local não especificado'}</span>
                </div>
                {edital.palavrasChave && edital.palavrasChave.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {edital.palavrasChave.map((palavra, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {palavra}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right">
                <Button size="lg" className="mb-4">
                  <FileCheck className="w-5 h-5 mr-2" />
                  Inscrever Projeto
                </Button>
                <div className="space-y-2">
                  <Badge 
                    variant={edital.status === 'aberto' ? 'default' : 'secondary'}
                    className={`text-sm ${
                      edital.status === 'aberto' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {edital.status === 'aberto' ? 'Aberto' : 'Encerrado'}
                  </Badge>
                  {isProximoVencimento && (
                    <Badge variant="destructive" className="block text-sm">
                      <Clock className="w-4 h-4 mr-1" />
                      {diasRestantes} dia{diasRestantes !== 1 ? 's' : ''} restante{diasRestantes !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <DollarSign className="w-8 h-8 text-primary mr-3" />
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      <p className="text-lg font-bold text-foreground">{formatarMoeda(edital.valorTotal)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Target className="w-8 h-8 text-primary mr-3" />
                    <div>
                      <p className="text-sm text-muted-foreground">Máx. por Projeto</p>
                      <p className="text-lg font-bold text-foreground">{formatarMoeda(edital.valorMaximoPorProjeto)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Calendar className="w-8 h-8 text-primary mr-3" />
                    <div>
                      <p className="text-sm text-muted-foreground">Prazo Inscrição</p>
                      <p className={`text-lg font-bold ${
                        isVencido ? 'text-destructive' : 
                        isProximoVencimento ? 'text-orange-600' : 'text-foreground'
                      }`}>
                        {formatarData(edital.prazoInscricao)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Users className="w-8 h-8 text-primary mr-3" />
                    <div>
                      <p className="text-sm text-muted-foreground">Resultado</p>
                      <p className="text-lg font-bold text-foreground">{formatarData(edital.dataResultado)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Areas */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-foreground mb-3">Áreas Contempladas</h3>
              <div className="flex flex-wrap gap-2">
                {edital.areasContempladas.map((area) => (
                  <Badge key={area} variant="secondary" className="text-sm">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Info className="w-5 h-5 mr-2" />
                    Sobre o Edital
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-foreground leading-relaxed">
                    {edital.analisePersonalizada?.resumo ? (
                      <div>
                        <h4 className="font-semibold mb-3 text-primary">Análise Personalizada</h4>
                        <p className="mb-4">{(edital.analisePersonalizada as AnalisePersonalizada).resumo}</p>
                        
                        {(edital.analisePersonalizada as AnalisePersonalizada).pontosImportantes && (edital.analisePersonalizada as AnalisePersonalizada).pontosImportantes.length > 0 && (
                          <div className="mb-4">
                            <h5 className="font-medium mb-2 text-foreground">Pontos Importantes:</h5>
                            <ul className="space-y-1">
                              {(edital.analisePersonalizada as AnalisePersonalizada).pontosImportantes.map((ponto, index) => (
                                <li key={index} className="flex items-start">
                                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 mr-2 flex-shrink-0" />
                                  <span className="text-sm">{ponto}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {(edital.analisePersonalizada as AnalisePersonalizada).recomendacoes && (edital.analisePersonalizada as AnalisePersonalizada).recomendacoes.length > 0 && (
                          <div>
                            <h5 className="font-medium mb-2 text-foreground">Recomendações:</h5>
                            <ul className="space-y-1">
                              {(edital.analisePersonalizada as AnalisePersonalizada).recomendacoes.map((recomendacao, index) => (
                                <li key={index} className="flex items-start">
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                                  <span className="text-sm">{recomendacao}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p>{edital.descricao || 'Descrição não disponível'}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Requisitos Básicos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {edital.criteriosElegibilidade && edital.criteriosElegibilidade.length > 0 ? (
                      edital.criteriosElegibilidade.map((requisito, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                          <span className="text-foreground">{requisito}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted-foreground">Requisitos não disponíveis</li>
                    )}
                  </ul>
                </CardContent>
              </Card>

              {/* Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Documentos Necessários
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {edital.documentosNecessarios && edital.documentosNecessarios.length > 0 ? (
                      edital.documentosNecessarios.map((documento, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                          <span className="text-foreground">{documento}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted-foreground">Documentos não especificados</li>
                    )}
                  </ul>
                </CardContent>
              </Card>

              {/* Evaluation Criteria */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    Critérios de Avaliação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {edital.processoSelecao ? (
                      edital.processoSelecao.split('\n').filter(criterio => criterio.trim()).map((criterio, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0" />
                          <span className="text-foreground">{criterio.trim()}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted-foreground">Critérios não disponíveis</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Cronograma
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute left-3 top-8 w-0.5 h-8 bg-border" />
                      <div className="flex items-start">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground text-sm">Inscrições Abertas</h4>
                          <p className="text-sm text-primary font-medium">{new Date(edital.prazoInscricao).toLocaleDateString('pt-BR')}</p>
                          <p className="text-xs text-muted-foreground mt-1">Prazo final para envio de propostas</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="flex items-start">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground text-sm">Resultados</h4>
                          <p className="text-sm text-primary font-medium">{new Date(edital.dataResultado).toLocaleDateString('pt-BR')}</p>
                          <p className="text-xs text-muted-foreground mt-1">Divulgação dos projetos selecionados</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact and Links */}
              <Card>
                <CardHeader>
                  <CardTitle>Contato e Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {edital.linkEdital && (
                    <div>
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <a href={edital.linkEdital} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Edital Completo
                        </a>
                      </Button>
                    </div>
                  )}
                  
                  {edital.emailContato && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">E-mail</p>
                      <p className="text-sm text-foreground font-medium">{edital.emailContato}</p>
                    </div>
                  )}
                  
                  {edital.telefoneContato && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Telefone</p>
                      <p className="text-sm text-foreground font-medium">{edital.telefoneContato}</p>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <Badge variant="outline" className="w-full justify-center py-2">
                      {edital.tipoVerba === 'publica' ? 'Verba Pública' : 'Verba Privada'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* CTA */}
              {edital.status === 'aberto' && diasRestantes > 0 && (
                <Card className="bg-primary/5">
                  <CardContent className="p-6 text-center">
                    <FileCheck className="w-12 h-12 mx-auto text-primary mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">Pronto para se inscrever?</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Inscreva seu projeto neste edital e concorra ao financiamento.
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Restam {diasRestantes} dia{diasRestantes !== 1 ? 's' : ''} para o prazo final
                    </p>
                    <Button size="lg" className="w-full" disabled>
                      Consulte o Edital Original
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditalDetalhes;