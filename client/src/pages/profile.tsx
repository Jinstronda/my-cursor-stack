import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserIcon, Save, LogOut, Film, Building2, ExternalLink, Edit3, X, Check } from "lucide-react";
import Logo from "../components/logo";
import { getUserProductionCompany } from "@/lib/api";
import { Link, useLocation } from "wouter";
import type { ProductionCompany, User } from "@shared/schema";
import UserAvatar from "@/components/user-avatar";

interface ProfileFormData {
  name: string;
  bio: string;
  location: string;
  website: string;
  isProducer: boolean;
}

type EditingSection = 'personal' | 'settings' | null;

export default function Profile() {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();

  // Fetch user's production company
  const { data: userCompany, isLoading: companyLoading, refetch: refetchCompany } = useQuery({
    queryKey: ["/api/production-companies/user"],
    queryFn: getUserProductionCompany,
    enabled: !!user,
    retry: false
  });
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: "",
    bio: "",
    location: "",
    website: "",
    isProducer: false,
  });
  const [originalFormData, setOriginalFormData] = useState<ProfileFormData>({
    name: "",
    bio: "",
    location: "",
    website: "",
    isProducer: false,
  });

  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      const userData = {
        name: user.name || "",
        bio: user.bio || "",
        location: user.location || "",
        website: user.website || "",
        isProducer: user.isProducer || false,
      };
      setFormData(userData);
      setOriginalFormData(userData);
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      // Use apiRequest to ensure proper authentication headers are included
      const response = await apiRequest("PATCH", "/api/users/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setEditingSection(null);
      const userData = formData;
      setOriginalFormData(userData);
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = (section: EditingSection) => {
    setFormData(originalFormData);
    setEditingSection(null);
  };

  const handleEdit = (section: EditingSection) => {
    // If already editing another section and has unsaved changes, warn user
    if (editingSection && editingSection !== section && hasUnsavedChanges()) {
      const shouldContinue = window.confirm(
        'Você tem alterações não salvas. Deseja continuar sem salvar?'
      );
      if (!shouldContinue) {
        return;
      }
      setFormData(originalFormData);
    }
    setEditingSection(section);
  };

  const hasUnsavedChanges = () => {
    return JSON.stringify(formData) !== JSON.stringify(originalFormData);
  };

  const handleLogout = async () => {
    try {
      // Use the proper signOut method from auth hook
      await signOut();
      
      // Redirect to home page immediately after logout
      window.location.href = "/";
    } catch (error) {
      console.error("Error during logout:", error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer logout. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getPlanBadgeColor = (planType: string) => {
    switch (planType) {
      case "pro":
        return "bg-blue-600 text-white";
      case "power":
        return "bg-purple-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const getPlanName = (planType: string) => {
    switch (planType) {
      case "pro":
        return "Pro";
      case "power":
        return "Power";
      default:
        return "Gratuito";
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70 text-sm">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="relative flex items-center h-10">
            {/* Logo - Left */}
            <div className="absolute left-0 flex items-center justify-center">
              <Logo size={28} />
            </div>
            
            {/* Navigation - Absolute Center */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-8">
              <Link href="/explorar">
                <Button 
                  variant="ghost" 
                  className="text-sm font-normal px-4 h-10 text-muted-foreground hover:text-foreground"
                >
                  Explorar
                </Button>
              </Link>
              <Link href="/criar">
                <Button 
                  variant="ghost" 
                  className="text-sm font-normal px-4 h-10 text-muted-foreground hover:text-foreground"
                >
                  Criar
                </Button>
              </Link>
            </div>

            {/* User Menu - Right */}
            <div className="absolute right-0 flex items-center justify-center">
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-foreground">
                <UserAvatar size={28} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Profile Header */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <UserAvatar size={80} />
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <h1 className="text-xl sm:text-2xl font-bold text-foreground">{user.name}</h1>
                      <Badge className={getPlanBadgeColor(user.planType || "free")}>
                        {getPlanName(user.planType || "free")}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{user.email}</p>
                    <p className="text-muted-foreground text-sm">
                      Membro desde {user.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 self-start sm:self-auto">
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Production Company Section */}
          <Card className="bg-card/50 border-white/10">
            <CardContent className="p-6">
              {userCompany ? (
                // User has a production company
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{userCompany.name}</h3>
                      <p className="text-sm text-muted-foreground">{userCompany.location}</p>
                    </div>
                  </div>
                  <Link to={`/empresa/${userCompany.id}`}>
                    <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Ver Perfil
                    </Button>
                  </Link>
                </div>
              ) : companyLoading ? (
                // Loading state
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-muted rounded-lg animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
                    <div className="h-3 bg-muted rounded w-24 animate-pulse"></div>
                  </div>
                </div>
              ) : (
                // No production company - show CTA
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Crie sua Produtora</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Apareça no diretório e seja encontrado por novos clientes
                  </p>
                  <Link to="/cadastrar-produtora">
                    <Button 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                      onClick={() => refetchCompany()}
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Cadastrar Produtora
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Details */}
          <div className="flex flex-col gap-8">
            {/* Account Settings */}
            <Card className={`bg-card border-border transition-all duration-200 ${
              editingSection === 'settings' ? 'ring-2 ring-blue-500/50 bg-blue-50/5' : ''
            }`}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-foreground">Configurações da Conta</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Preferências e configurações do seu perfil
                    </CardDescription>
                  </div>
                  {editingSection !== 'settings' ? (
                    <Button
                      onClick={() => handleEdit('settings')}
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 self-start sm:self-auto"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex gap-2 self-start sm:self-auto">
                      <Button
                        onClick={handleSave}
                        disabled={updateProfileMutation.isPending}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {updateProfileMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button
                        onClick={() => handleCancel('settings')}
                        variant="outline"
                        size="sm"
                        className="border-border text-foreground hover:bg-accent"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Sou Produtor</Label>
                    <p className="text-sm text-muted-foreground">
                      Marque se você trabalha como produtor audiovisual
                    </p>
                  </div>
                  <Switch
                    checked={formData.isProducer}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, isProducer: checked })
                    }
                    disabled={editingSection !== 'settings'}
                  />
                </div>

                <Separator className="border-border" />

                <div style={{ display: 'none' }}>
                  <h4 className="text-foreground font-medium mb-2">Plano Atual</h4>
                  <div className="flex items-center justify-between">
                    <Badge className={getPlanBadgeColor(user.planType || "free")}>
                      {getPlanName(user.planType || "free")}
                    </Badge>
                    {(user.planType === "free" || !user.planType) && (
                      <Link href="/precos">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Fazer Upgrade
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                <Separator className="border-border" />

                <div>
                  <h4 className="text-foreground font-medium mb-2">Informações da Conta</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">E-mail:</span>
                      <span className="text-foreground">{user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Username:</span>
                      <span className="text-foreground">{user.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID:</span>
                      <span className="text-muted-foreground">#{user.id}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card className={`bg-card border-border transition-all duration-200 ${
              editingSection === 'personal' ? 'ring-2 ring-blue-500/50 bg-blue-50/5' : ''
            }`}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-foreground">Informações Pessoais</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Suas informações básicas de perfil
                    </CardDescription>
                  </div>
                  {editingSection !== 'personal' ? (
                    <Button
                      onClick={() => handleEdit('personal')}
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 self-start sm:self-auto"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex gap-2 self-start sm:self-auto">
                      <Button
                        onClick={handleSave}
                        disabled={updateProfileMutation.isPending}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {updateProfileMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button
                        onClick={() => handleCancel('personal')}
                        variant="outline"
                        size="sm"
                        className="border-border text-foreground hover:bg-accent"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-foreground">
                    Nome Completo
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={editingSection !== 'personal'}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="bio" className="text-foreground">
                    Biografia
                  </Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    disabled={editingSection !== 'personal'}
                    placeholder="Conte um pouco sobre você..."
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground resize-none"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="location" className="text-foreground">
                    Localização
                  </Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    disabled={editingSection !== 'personal'}
                    placeholder="Cidade, Estado"
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="website" className="text-foreground">
                    Website
                  </Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    disabled={editingSection !== 'personal'}
                    placeholder="https://seusite.com"
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}