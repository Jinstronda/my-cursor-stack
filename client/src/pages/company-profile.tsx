import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin, Star, Phone, Mail, Globe, Camera, Shield, Award, Zap, Users, Calendar, Eye, ExternalLink, Plus, X, Edit2, Save, XCircle } from "lucide-react";
import UserAvatar from "@/components/user-avatar";
import { getProductionCompany } from "@/lib/api";
import type { ProductionCompany, ProductionCompanyWithOwner } from "@shared/schema";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { updateProductionCompany } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import ImageUpload from "@/components/image-upload";
import ServicesSelector from "@/components/services-selector";

export default function CompanyProfile() {
  const params = useParams();
  const companyId = parseInt(params.id as string);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estado para modo de edição
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    location: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    services: [] as string[],
    coverImage: "",
    images: [] as string[]
  });
  
  // Estados para edição de imagens
  const [editingServices, setEditingServices] = useState(false);

  const { data: company, isLoading, error } = useQuery<ProductionCompanyWithOwner>({
    queryKey: ["/api/production-companies", companyId],
    queryFn: () => getProductionCompany(companyId),
    enabled: !isNaN(companyId),
  });

  // Effect para atualizar o formulário quando os dados chegarem
  useEffect(() => {
    if (company) {
      setEditForm({
        name: company.name || "",
        description: company.description || "",
        location: company.location || "",
        contactEmail: company.contactEmail || "",
        contactPhone: company.contactPhone || "",
        website: company.website || "",
        services: company.services || [],
        coverImage: company.coverImage || "",
        images: company.images || []
      });
    }
  }, [company]);

  // Mutation para atualizar dados
  const updateMutation = useMutation({
    mutationFn: (data: Partial<ProductionCompany>) => updateProductionCompany(companyId, data),
    onSuccess: () => {
      setIsEditing(false);
      toast({
        title: "Sucesso",
        description: "Dados da produtora atualizados com sucesso!",
      });
      // Invalidar múltiplas queries para sincronizar todas as telas
      queryClient.invalidateQueries({
        queryKey: ["/api/production-companies", companyId]
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/production-companies"]
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/production-companies/user"]
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os dados.",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    // Se não há capa definida mas há imagens, usa a primeira como capa
    const dataToSave = {
      ...editForm,
      coverImage: editForm.coverImage || (editForm.images.length > 0 ? editForm.images[0] : "")
    };
    updateMutation.mutate(dataToSave);
  };

  const handleCancel = () => {
    if (company) {
      setEditForm({
        name: company.name || "",
        description: company.description || "",
        location: company.location || "",
        contactEmail: company.contactEmail || "",
        contactPhone: company.contactPhone || "",
        website: company.website || "",
        services: company.services || [],
        coverImage: company.coverImage || "",
        images: company.images || []
      });
    }
    setIsEditing(false);
    setEditingServices(false);
  };

  // Funções para manipular imagens
  const handleAddImage = (imageUrl: string) => {
    setEditForm(prev => ({
      ...prev,
      images: [...prev.images, imageUrl]
    }));
  };

  const handleRemoveImage = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSetCoverImage = (imageUrl: string) => {
    setEditForm(prev => ({
      ...prev,
      coverImage: imageUrl
    }));
  };

  const handleRemoveCoverImage = () => {
    setEditForm(prev => ({
      ...prev,
      coverImage: ""
    }));
  };

  // Função para atualizar serviços usando o componente ServicesSelector
  const handleServicesChange = (services: string[]) => {
    setEditForm(prev => ({
      ...prev,
      services
    }));
  };

  // Verificar se o usuário é dono da produtora
  const isOwner = user && company && company.ownerId === (user as any).id;



  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "power": return "bg-gradient-to-r from-yellow-500 to-orange-500 text-white";
      case "pro": return "bg-gradient-to-r from-blue-500 to-purple-500 text-white";
      default: return "bg-secondary text-foreground";
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case "power": return <Zap className="w-3 h-3" />;
      case "pro": return <Award className="w-3 h-3" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando perfil da empresa...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-normal mb-4">Empresa não encontrada</h1>
            <p className="text-muted-foreground mb-6">A empresa que você procura não existe ou foi removida.</p>
            <Link to="/explorar">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Diretório
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="relative flex items-center h-10">
            {/* Back button - Left */}
            <div className="absolute left-0 flex items-center justify-center">
              <Link to="/explorar">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-10">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
            </div>
            
            {/* Navigation - Absolute Center */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-8">
              <Link to="/explorar">
                <Button 
                  variant="ghost" 
                  className="text-sm font-normal px-4 h-10 text-foreground"
                >
                  Explorar
                </Button>
              </Link>
              <Link to="/criar">
                <Button 
                  variant="ghost" 
                  className="text-sm font-normal px-4 h-10 text-muted-foreground hover:text-foreground"
                >
                  Criar
                </Button>
              </Link>
            </div>

            {/* User Avatar - Right */}
            <div className="absolute right-0 flex items-center justify-center">
              <Link to="/perfil">
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground">
                  <UserAvatar size={28} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Company Profile */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Section */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-3xl font-normal">{company.name}</CardTitle>
                      {company.verified && (
                        <div title="Empresa Verificada">
                          <Shield className="w-5 h-5 text-blue-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-4">
                      <MapPin className="w-4 h-4" />
                      <span>{company.location}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Rating */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < Math.floor(Number(company.rating) || 0) ? 'text-yellow-500 fill-current' : 'text-muted'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">
                          {company.rating} ({company.reviewCount} avaliações)
                        </span>
                      </div>
                      
                      {/* Plan Badge */}
                      <Badge className={`${getPlanColor(company.planType || 'free')} text-xs px-3 py-1`}>
                        {getPlanIcon(company.planType || 'free')}
                        <span className="ml-1">
                          {company.planType === 'power' ? 'Power' : company.planType === 'pro' ? 'Pro' : 'Free'}
                        </span>
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!isEditing ? (
                  <>
                    {/* Cover Photo */}
                    <div className="aspect-[4/3] bg-accent/30 rounded-lg flex items-center justify-center mb-6 overflow-hidden">
                      {company.coverImage || (company.images && company.images.length > 0) ? (
                        <img 
                          src={company.coverImage || company.images?.[0] || ""} 
                          alt={`${company.name} - Capa`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>
                    
                    {/* Description */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Sobre a Empresa</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {company.description}
                      </p>
                    </div>
                    
                    {/* Image Gallery */}
                    {company.images && company.images.length > 0 && (
                      <div className="space-y-4 mt-6">
                        <h3 className="text-lg font-medium">Galeria de Imagens</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {company.images.map((image, index) => (
                            <div key={index} className="aspect-[4/3] bg-accent/30 rounded-lg overflow-hidden">
                              <img 
                                src={image} 
                                alt={`${company.name} - Imagem ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-6">
                    {/* Nome da Empresa */}
                    <div>
                      <Label htmlFor="companyName">Nome da Empresa</Label>
                      <Input
                        id="companyName"
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        placeholder="Nome da empresa"
                      />
                    </div>
                    
                    {/* Localização */}
                    <div>
                      <Label htmlFor="location">Localização</Label>
                      <Input
                        id="location"
                        value={editForm.location}
                        onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                        placeholder="Cidade, Estado"
                      />
                    </div>
                    
                    {/* Imagem de Capa */}
                    <ImageUpload
                      label="Imagem de Capa"
                      currentImage={editForm.coverImage}
                      onImageUpload={(imageUrl) => setEditForm({...editForm, coverImage: imageUrl})}
                      onRemove={handleRemoveCoverImage}
                      aspectRatio="aspect-[4/3]"
                      maxSizeMB={5}
                    />
                    
                    {/* Galeria de Imagens */}
                    <div>
                      <Label>Galeria de Imagens</Label>
                      <div className="space-y-3">
                        <ImageUpload
                          label="Adicionar Nova Imagem"
                          onImageUpload={handleAddImage}
                          aspectRatio="aspect-[4/3]"
                          maxSizeMB={5}
                        />
                        
                        {editForm.images.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {editForm.images.map((image, index) => (
                              <div key={index} className="relative group aspect-[4/3] bg-accent/30 rounded-lg overflow-hidden">
                                <img 
                                  src={image} 
                                  alt={`Imagem ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleSetCoverImage(image)}
                                    disabled={editForm.coverImage === image}
                                  >
                                    Definir como Capa
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRemoveImage(index)}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          A primeira imagem da galeria será usada como capa se nenhuma capa for definida.
                        </p>
                      </div>
                    </div>
                    
                    {/* Descrição */}
                    <div>
                      <Label htmlFor="description">Sobre a Empresa</Label>
                      <Textarea
                        id="description"
                        value={editForm.description}
                        onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                        placeholder="Descrição da empresa, serviços oferecidos, experiência..."
                        rows={4}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Services */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-normal">Serviços Oferecidos</CardTitle>
              </CardHeader>
              <CardContent>
                {!isEditing ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {company.services?.map((service, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-sm font-medium">{service}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ServicesSelector
                    selectedServices={editForm.services}
                    onServicesChange={handleServicesChange}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-normal">Informações de Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isEditing ? (
                  <>
                    {company.contactPhone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{company.contactPhone}</span>
                      </div>
                    )}
                    
                    {company.contactEmail && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{company.contactEmail}</span>
                      </div>
                    )}
                    
                    {company.website && (
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <a 
                          href={company.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {company.website}
                        </a>
                      </div>
                    )}

                    {/* Owner Info */}
                    {company.owner && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground">Proprietário</h4>
                          <Link to={`/perfil`} className="flex items-center gap-3 hover:bg-accent/50 p-2 rounded-lg transition-colors">
                            {company.owner.profileImageUrl ? (
                              <img
                                src={company.owner.profileImageUrl}
                                alt={company.owner.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-primary">
                                  {company.owner.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium">{company.owner.name}</div>
                              <div className="text-xs text-muted-foreground">{company.owner.email}</div>
                            </div>
                          </Link>
                        </div>
                      </>
                    )}

                    <Separator />
                    
                    <div className="space-y-3">
                      <Button className="w-full bg-white text-black hover:bg-white/90">
                        <Mail className="w-4 h-4 mr-2" />
                        Enviar Mensagem
                      </Button>
                      <Button className="w-full bg-black text-white hover:bg-black/90">
                        <Phone className="w-4 h-4 mr-2" />
                        Ligar Agora
                      </Button>
                      {isOwner && (
                        <Button 
                          className="w-full bg-black text-white hover:bg-black/90"
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Editar Produtora
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={editForm.contactPhone}
                        onChange={(e) => setEditForm({...editForm, contactPhone: e.target.value})}
                        placeholder="Telefone de contato"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editForm.contactEmail}
                        onChange={(e) => setEditForm({...editForm, contactEmail: e.target.value})}
                        placeholder="Email de contato"
                      />
                    </div>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={editForm.website}
                        onChange={(e) => setEditForm({...editForm, website: e.target.value})}
                        placeholder="https://exemplo.com"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} disabled={updateMutation.isPending} className="flex-1">
                        {updateMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button variant="outline" onClick={handleCancel} className="flex-1">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-normal">Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avaliação Média</span>
                  <span className="font-medium">{company.rating}/5</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total de Avaliações</span>
                  <span className="font-medium">{company.reviewCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Serviços</span>
                  <span className="font-medium">{company.services?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Plano</span>
                  <Badge variant="secondary" className="text-xs">
                    {company.planType === 'power' ? 'Power' : company.planType === 'pro' ? 'Pro' : 'Free'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}