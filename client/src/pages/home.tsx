import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Film, Users, Calendar, TrendingUp, Clock, MessageCircle, ExternalLink, X } from "lucide-react";
import UnifiedHeader from "@/components/unified-header";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getRecentProjects } from "@/lib/api";
import { useState } from "react";

export default function Home() {
  const { user } = useAuth();
  const [showAllProjects, setShowAllProjects] = useState(false);

  // Buscar projetos recentes do usuário
  const { data: recentProjects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['/api/projects/recent', user?.id],
    queryFn: () => getRecentProjects(5),
    enabled: !!user?.id,
    staleTime: 30000, // Cache por 30 segundos
  });

  // Buscar todos os projetos quando modal está aberto
  const { data: allProjects = [], isLoading: loadingAllProjects } = useQuery({
    queryKey: ['/api/projects/recent/all', user?.id],
    queryFn: () => getRecentProjects(50), // Pegar até 50 projetos
    enabled: !!user?.id && showAllProjects,
    staleTime: 30000,
  });

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "há alguns minutos";
    if (diffInHours === 1) return "há 1 hora";
    if (diffInHours < 24) return `há ${diffInHours} horas`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "há 1 dia";
    if (diffInDays < 7) return `há ${diffInDays} dias`;
    
    return messageDate.toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'esboço': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      'pré-produção': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'produção': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'pós-produção': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'finalizado': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    };
    return colors[status as keyof typeof colors] || colors['esboço'];
  };

  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bem-vindo de volta, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            O que vamos criar hoje?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/criar/novo-projeto">
            <Card className="cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 dark:from-blue-950/50 dark:to-purple-950/50 dark:border-blue-800">
              <CardContent className="p-6 text-center">
                <Plus className="w-8 h-8 mx-auto mb-3 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Novo Projeto</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Comece um projeto audiovisual</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/explorar">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <Search className="w-8 h-8 mx-auto mb-3 text-green-600" />
                <h3 className="font-semibold">Explorar</h3>
                <p className="text-sm text-muted-foreground mt-1">Descubra profissionais</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/explorar/projetos">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <Film className="w-8 h-8 mx-auto mb-3 text-purple-600" />
                <h3 className="font-semibold">Projetos</h3>
                <p className="text-sm text-muted-foreground mt-1">Veja projetos da comunidade</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/perfil">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 mx-auto mb-3 text-orange-600" />
                <h3 className="font-semibold">Perfil</h3>
                <p className="text-sm text-muted-foreground mt-1">Gerencie sua conta</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Seus Projetos Recentes</span>
                {recentProjects.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowAllProjects(true)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver Todos
                  </Button>
                )}
              </CardTitle>
              <CardDescription>Continue trabalhando nos seus projetos</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProjects ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3 text-muted-foreground">Carregando projetos...</span>
                </div>
              ) : recentProjects.length === 0 ? (
                <div className="text-center py-8">
                  <Film className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Nenhum projeto criado ainda</p>
                  <Link href="/criar/novo-projeto">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeiro Projeto
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentProjects.map((project: any) => (
                    <Link 
                      key={project.id} 
                      href={project.session_id ? `/criar/novo-projeto/chat?projectId=${project.id}&sessionId=${project.session_id}` : `/criar/novo-projeto?projectId=${project.id}`}
                    >
                      <Card className="hover:bg-muted/50 transition-all cursor-pointer border-muted hover:border-primary/20 bg-gradient-to-r from-background to-muted/20">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-foreground truncate">
                                  {project.name}
                                </h3>
                                <Badge className={`text-xs ${getStatusColor(project.status || 'esboço')}`}>
                                  {project.status || 'Esboço'}
                                </Badge>
                              </div>
                              
                              {project.description && (
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                  {project.description}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {project.last_message_at ? (
                                  <div className="flex items-center gap-1">
                                    <MessageCircle className="w-3 h-3" />
                                    <span>Última atividade {formatTimeAgo(project.last_message_at)}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>Criado {formatTimeAgo(project.created_at)}</span>
                                  </div>
                                )}
                                
                                {project.genre && (
                                  <div className="flex items-center gap-1">
                                    <Film className="w-3 h-3" />
                                    <span>{project.genre}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                  
                  {recentProjects.length === 5 && (
                    <div className="pt-4 border-t border-border">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-center text-muted-foreground hover:text-foreground"
                        onClick={() => setShowAllProjects(true)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ver Todos os Projetos
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Explorar</CardTitle>
              <CardDescription>Descubra o ecossistema audiovisual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/explorar/profissionais">
                <Button variant="ghost" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Profissionais
                </Button>
              </Link>
              <Link href="/explorar/editais">
                <Button variant="ghost" className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  Editais
                </Button>
              </Link>
              <Link href="/explorar/filmes">
                <Button variant="ghost" className="w-full justify-start">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Filmes em Destaque
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal "Ver Todos os Projetos" */}
      <Dialog open={showAllProjects} onOpenChange={setShowAllProjects}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Todos os Seus Projetos</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllProjects(false)}
                className="p-2 h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Todos os projetos ordenados pela última atividade
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            {loadingAllProjects ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground">Carregando todos os projetos...</span>
              </div>
            ) : allProjects.length === 0 ? (
              <div className="text-center py-8">
                <Film className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">Nenhum projeto encontrado</p>
                <Link href="/criar/novo-projeto">
                  <Button onClick={() => setShowAllProjects(false)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Projeto
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allProjects.map((project: any) => (
                  <Link 
                    key={project.id} 
                    href={project.session_id ? `/criar/novo-projeto/chat?projectId=${project.id}&sessionId=${project.session_id}` : `/criar/novo-projeto?projectId=${project.id}`}
                    onClick={() => setShowAllProjects(false)}
                  >
                    <Card className="hover:bg-muted/50 transition-all cursor-pointer border-muted hover:border-primary/20 bg-gradient-to-r from-background to-muted/20 h-full">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-foreground truncate">
                                {project.name}
                              </h3>
                              <Badge className={`text-xs ${getStatusColor(project.status || 'esboço')}`}>
                                {project.status || 'Esboço'}
                              </Badge>
                            </div>
                            
                            {project.description && (
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                                {project.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {project.last_message_at ? (
                                <div className="flex items-center gap-1">
                                  <MessageCircle className="w-3 h-3" />
                                  <span>Última atividade {formatTimeAgo(project.last_message_at)}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Criado {formatTimeAgo(project.created_at)}</span>
                                </div>
                              )}
                            </div>
                            
                            {project.genre && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Film className="w-3 h-3" />
                                <span>{project.genre}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </ScrollArea>
          
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {allProjects.length} projeto{allProjects.length !== 1 ? 's' : ''} encontrado{allProjects.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <Link href="/criar/novo-projeto">
                <Button variant="outline" onClick={() => setShowAllProjects(false)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Projeto
                </Button>
              </Link>
              <Button variant="ghost" onClick={() => setShowAllProjects(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}