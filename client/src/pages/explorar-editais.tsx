import { FileText, Calendar, Building2, DollarSign, Filter, Clock, MapPin, Search, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import UserAvatar from "@/components/user-avatar";
import SecondaryNavigation from "@/components/secondary-navigation";
import Logo from "@/components/logo";
import { useState, useEffect } from "react";
import type { Edital } from "@shared/schema";

const ExplorarEditais = () => {
  const [location] = useLocation();
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'aberto' | 'encerrado'>('todos');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'publica' | 'privada'>('todos');
  const [busca, setBusca] = useState('');
  const [editais, setEditais] = useState<Edital[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch editais from API
  useEffect(() => {
    const fetchEditais = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/editais', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Erro ao buscar editais: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📋 Editais loaded:', data);
        setEditais(data);
      } catch (error) {
        console.error('❌ Error loading editais:', error);
        setError(error instanceof Error ? error.message : 'Erro ao carregar editais');
        setEditais([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEditais();
  }, []);

  // Filter editais based on current state
  const editaisFiltrados = editais.filter(edital => {
    const matchStatus = filtroStatus === 'todos' || edital.status === filtroStatus;
    const matchTipo = filtroTipo === 'todos' || edital.tipoVerba === filtroTipo;
    const matchBusca = busca === '' || 
      edital.nome.toLowerCase().includes(busca.toLowerCase()) ||
      edital.orgaoResponsavel.toLowerCase().includes(busca.toLowerCase()) ||
      (edital.areasContempladas && edital.areasContempladas.some(area => area.toLowerCase().includes(busca.toLowerCase())));
    
    return matchStatus && matchTipo && matchBusca;
  });

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

  const formatarData = (data: string | Date) => {
    const date = typeof data === 'string' ? new Date(data) : data;
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const calcularDiasRestantes = (prazo: string | Date) => {
    const hoje = new Date();
    const dataPrazo = typeof prazo === 'string' ? new Date(prazo) : prazo;
    const diffTime = dataPrazo.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="relative flex items-center h-10">
              <div className="absolute left-0 flex items-center justify-center">
                <Logo size={28} />
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

        <div className="flex-1 bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando editais...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="relative flex items-center h-10">
            {/* Logo */}
            <div className="absolute left-0 flex items-center justify-center">
              <Logo size={28} />
            </div>
            
            {/* Navigation */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-8">
              <Link href="/explorar">
                <Button 
                  variant="ghost" 
                  className={`h-10 text-sm font-normal px-4 ${location.startsWith('/explorar') ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Explorar
                </Button>
              </Link>
              <Link href="/criar">
                <Button 
                  variant="ghost" 
                  className={`h-10 text-sm font-normal px-4 ${location.startsWith('/criar') ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Criar
                </Button>
              </Link>
            </div>

            {/* User Menu */}
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

      {/* Secondary Navigation */}
      <SecondaryNavigation type="explorar" />

      {/* Content */}
      <div className="flex-1 bg-background">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Editais Culturais</h1>
            <p className="text-muted-foreground">Descubra oportunidades de financiamento para seus projetos culturais</p>
          </div>

          {/* Filters and Search */}
          <div className="mb-8 space-y-4">
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar editais..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Status:</span>
                <div className="flex gap-2">
                  {(['todos', 'aberto', 'encerrado'] as const).map((status) => (
                    <Button
                      key={status}
                      variant={filtroStatus === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFiltroStatus(status)}
                      className="h-8 px-3"
                    >
                      {status === 'todos' ? 'Todos' : status === 'aberto' ? 'Abertos' : 'Encerrados'}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Verba:</span>
                <div className="flex gap-2">
                  {(['todos', 'publica', 'privada'] as const).map((tipo) => (
                    <Button
                      key={tipo}
                      variant={filtroTipo === tipo ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFiltroTipo(tipo)}
                      className="h-8 px-3"
                    >
                      {tipo === 'todos' ? 'Todas' : tipo === 'publica' ? 'Pública' : 'Privada'}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              {editaisFiltrados.length} edital{editaisFiltrados.length !== 1 ? 's' : ''} encontrado{editaisFiltrados.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Editorial Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {editaisFiltrados.map((edital) => {
              const diasRestantes = calcularDiasRestantes(edital.prazoInscricao);
              const isProximoVencimento = diasRestantes <= 7 && diasRestantes > 0;
              const isVencido = diasRestantes < 0;
              
              return (
                <Link key={edital.id} href={`/edital/${edital.id}`}>
                  <div className="group bg-card border border-border rounded-xl p-6 hover:bg-card/80 hover:border-border/80 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 cursor-pointer">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-lg leading-tight mb-2 group-hover:text-primary transition-colors">
                          {edital.nome}
                        </h3>
                        <div className="flex items-center text-sm text-muted-foreground mb-2">
                          <Building2 className="w-4 h-4 mr-2" />
                          {edital.orgaoResponsavel}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 mr-2" />
                          {edital.local}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>

                    {/* Status and Type */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge 
                        variant={edital.status === 'aberto' ? 'default' : 'secondary'}
                        className={`text-xs ${
                          edital.status === 'aberto' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {edital.status === 'aberto' ? 'Aberto' : 'Encerrado'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {edital.tipoVerba === 'publica' ? 'Verba Pública' : 'Verba Privada'}
                      </Badge>
                      {isProximoVencimento && (
                        <Badge variant="destructive" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {diasRestantes} dia{diasRestantes !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>

                    {/* Areas */}
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {edital.areasContempladas && edital.areasContempladas.length > 0 ? (
                          <>
                            {edital.areasContempladas.slice(0, 3).map((area) => (
                              <Badge key={area} variant="secondary" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                            {edital.areasContempladas.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{edital.areasContempladas.length - 3}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Todas as áreas
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Financial Info */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="flex items-center text-sm text-muted-foreground mb-1">
                          <DollarSign className="w-4 h-4 mr-1" />
                          Valor Total
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          {formatarMoeda(edital.valorTotal)}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center text-sm text-muted-foreground mb-1">
                          <DollarSign className="w-4 h-4 mr-1" />
                          Máx. por Projeto
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          {formatarMoeda(edital.valorMaximoPorProjeto)}
                        </p>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center text-sm text-muted-foreground mb-1">
                          <Calendar className="w-4 h-4 mr-1" />
                          Inscrições
                        </div>
                        <p className={`text-sm font-medium ${
                          isVencido ? 'text-destructive' : 
                          isProximoVencimento ? 'text-orange-600' : 'text-foreground'
                        }`}>
                          até {formatarData(edital.prazoInscricao)}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center text-sm text-muted-foreground mb-1">
                          <Calendar className="w-4 h-4 mr-1" />
                          Resultado
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {formatarData(edital.dataResultado)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Error State */}
          {error && editais.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-destructive/50 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Erro ao carregar editais</h3>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Tentar Novamente
              </Button>
            </div>
          )}

          {/* Empty State (No results from filters) */}
          {!error && editais.length > 0 && editaisFiltrados.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum edital encontrado</h3>
              <p className="text-muted-foreground mb-6">Tente ajustar os filtros ou termos de busca</p>
              <Button 
                onClick={() => {
                  setFiltroStatus('todos');
                  setFiltroTipo('todos');
                  setBusca('');
                }}
                variant="outline"
              >
                Limpar Filtros
              </Button>
            </div>
          )}

          {/* No editais in database */}
          {!error && editais.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum edital cadastrado</h3>
              <p className="text-muted-foreground mb-6">Seja o primeiro a cadastrar um edital no sistema</p>
              <Link href="/novo-edital">
                <Button>
                  Criar Primeiro Edital
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExplorarEditais;