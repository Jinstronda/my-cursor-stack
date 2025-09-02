import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Plus, Film, Eye, Edit, Trash2, MoreVertical } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { getChatSessionByProject, deleteProject, updateProject } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import UnifiedHeader from "@/components/unified-header";
import SecondaryNavigation from "@/components/secondary-navigation";

export default function ProjetosBeta() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Modal states
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [deletingProject, setDeletingProject] = useState<any>(null);

  // Fetch user projects
  const { data: userProjects = [], refetch: refetchProjects } = useQuery({
    queryKey: ['/api/projects/my'],
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache data (cacheTime renamed to gcTime in v5)
  });

  // Log projects when data changes (replaces onSuccess from v4)
  useEffect(() => {
    if (Array.isArray(userProjects) && userProjects.length > 0) {
      console.log('Projects loaded in Projetos Beta:', userProjects);
    }
  }, [userProjects]);

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: number; name: string; description: string }) => {
      return await updateProject(id, { name, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects/my'] });
      setEditingProject(null);
      toast({
        title: "Sucesso",
        description: "Projeto renomeado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível renomear o projeto.",
        variant: "destructive",
      });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: number) => {
      return await deleteProject(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects/my'] });
      setDeletingProject(null);
      toast({
        title: "Sucesso",
        description: "Projeto excluído com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o projeto.",
        variant: "destructive",
      });
    },
  });

  const handleEditProject = (project: any) => {
    setEditingProject(project);
    setEditedName(project.name);
    setEditedDescription(project.description || "");
  };

  const handleDeleteProject = (project: any) => {
    setDeletingProject(project);
  };

  const handleSaveEdit = () => {
    if (editingProject && editedName.trim()) {
      updateProjectMutation.mutate({
        id: editingProject.id,
        name: editedName.trim(),
        description: editedDescription.trim(),
      });
    }
  };

  const handleConfirmDelete = () => {
    if (deletingProject) {
      deleteProjectMutation.mutate(deletingProject.id);
    }
  };

  const handleOpenProject = async (project: any) => {
    try {
      // First, try to get existing chat session for this project
      try {
        const existingSession = await getChatSessionByProject(project.id);
        // Navigate to the new chat interface
        setLocation(`/criar/novo-projeto/chat?projectId=${project.id}&sessionId=${existingSession.id}`);
        return;
      } catch (error) {
        // Session doesn't exist, navigate to chat creation
        setLocation(`/criar/novo-projeto/chat?projectId=${project.id}`);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível abrir o projeto. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Helper functions
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "esboço":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      case "pré-produção":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "produção":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "pós-produção":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "finalizado":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "esboço":
        return "Esboço";
      case "pré-produção":
        return "Pré-produção";
      case "produção":
        return "Produção";
      case "pós-produção":
        return "Pós-produção";
      case "finalizado":
        return "Finalizado";
      default:
        return "Desenvolvimento";
    }
  };

  return (
    <div className="min-h-screen bg-background layout-stable">
      {/* Unified Header */}
      <UnifiedHeader />

      {/* Secondary Navigation */}
      <SecondaryNavigation type="criar" />

      {/* Page Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Projetos (BETA)</h1>
              <p className="text-muted-foreground mt-1">
                Gerencie seus projetos audiovisuais com a nova interface
              </p>
            </div>
            <Link href="/criar/novo-projeto">
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Novo Projeto
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {Array.isArray(userProjects) && userProjects.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <Film className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium text-foreground mb-2">Nenhum projeto criado ainda</h3>
              <p className="text-muted-foreground mb-6">
                Crie seu primeiro projeto e comece a desenvolver suas ideias com a IA
              </p>
              <Link href="/criar/novo-projeto">
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Projeto
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(userProjects) && userProjects.map((project: any) => (
              <Card key={project.id} className="bg-card border-border hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1" onClick={() => handleOpenProject(project)}>
                      <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                        {project.description || "Projeto criado automaticamente"}
                      </p>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(project.status || 'esboço')}`}>
                          {getStatusText(project.status || 'esboço')}
                        </span>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(project.updatedAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); handleDeleteProject(project); }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Apagar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Project Modal */}
      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Projeto</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="project-name">Título do Projeto</Label>
              <Input
                id="project-name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Nome do projeto"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-description">Descrição</Label>
              <Textarea
                id="project-description"
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Descrição do projeto"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProject(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={!editedName.trim() || updateProjectMutation.isPending}
            >
              {updateProjectMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Modal */}
      <Dialog open={!!deletingProject} onOpenChange={() => setDeletingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Projeto</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Tem certeza que deseja excluir o projeto "{deletingProject?.name}"? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingProject(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}