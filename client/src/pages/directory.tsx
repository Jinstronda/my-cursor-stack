import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Star, Phone, Mail, Globe, Camera, Film, Mic, Music, Calendar, Award, Zap, Settings } from "lucide-react";
import UnifiedHeader from "@/components/unified-header";
import SecondaryNavigation from "@/components/secondary-navigation";
import { getProductionCompanies, getUserProductionCompany } from "@/lib/api";
import type { ProductionCompany } from "@shared/schema";

export default function Directory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [location] = useLocation();
  const { user } = useAuth();

  // Fetch production companies from database
  const { data: companies, isLoading, error } = useQuery({
    queryKey: ["/api/production-companies"],
    queryFn: getProductionCompanies,
  });

  // Fetch user's production company to check if they already have one
  const { data: userCompany } = useQuery({
    queryKey: ["/api/production-companies/user"],
    queryFn: getUserProductionCompany,
    enabled: !!user,
    retry: false
  });

  // Categorias de serviços audiovisuais
  const categories = [
    "Produção Cinematográfica",
    "Produção de Vídeo",
    "Direção",
    "Fotografia",
    "Edição e Pós-Produção",
    "Som e Áudio",
    "Roteiro",
    "Produção Executiva",
    "Casting",
    "Locações"
  ];

  // Principais cidades
  const locations = [
    "Rio de Janeiro",
    "São Paulo"
  ];

  // Filter companies based on search criteria
  const filteredCompanies = companies?.filter((company: ProductionCompany) => {
    const matchesSearch = !searchTerm || 
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Check if company location contains the selected city
    const matchesLocation = !selectedLocation || 
      company.location?.toLowerCase().includes(selectedLocation.toLowerCase());
    
    // For category filtering, check if any of the company's services match the selected category
    const matchesCategory = !selectedCategory || 
      company.services?.some(service => 
        service.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        selectedCategory.toLowerCase().includes(service.toLowerCase())
      );
    
    return matchesSearch && matchesLocation && matchesCategory;
  }) || [];

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "Power": return "bg-gradient-to-r from-yellow-500 to-orange-500 text-white";
      case "Pro": return "bg-gradient-to-r from-blue-500 to-purple-500 text-white";
      default: return "bg-secondary text-foreground";
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case "Power": return <Zap className="w-3 h-3" />;
      case "Pro": return <Award className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background layout-stable">
      {/* Unified Header */}
      <UnifiedHeader />

      {/* Secondary Navigation */}
      <SecondaryNavigation type="explorar" />

      {/* Minimal Hero Section */}
      <section className="section-spacing">
        <div className="max-w-4xl mx-auto text-center content-spacing">
          <div className="space-y-6">
            <h1 className="text-3xl font-normal tracking-tight text-foreground">
              Encontre Produtoras de Cinema Confiáveis
            </h1>
            <p className="text-minimal max-w-2xl mx-auto">
              Conecte-se com os melhores profissionais de produção audiovisual do Brasil
            </p>
          </div>
          
          {/* Minimal Search Bar */}
          <div className="card-minimal p-8 max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Buscar serviços..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-minimal h-10 border-0 bg-accent/50"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-10 md:w-44 border-0 bg-accent/50">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="h-10 md:w-36 border-0 bg-accent/50">
                  <SelectValue placeholder="Local" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="btn-minimal h-10 px-6 bg-foreground text-background hover:bg-foreground/90">
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Companies */}
      <section className="section-spacing">
        <div className="max-w-6xl mx-auto content-spacing">
          <h2 className="text-2xl font-normal tracking-tight text-center">Empresas em Destaque</h2>
          
          {isLoading ? (
            <div className="col-span-full text-center py-8">
              <p className="text-muted-foreground">Carregando empresas...</p>
            </div>
          ) : error ? (
            <div className="col-span-full text-center py-8">
              <p className="text-red-500">Erro ao carregar empresas</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCompanies.map((company: ProductionCompany) => (
                <div key={company.id} className="card-minimal p-6 hover:shadow-md transition-all duration-300">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="heading-minimal text-base mb-1">
                          {company.name}
                        </h3>
                        <div className="flex items-center gap-1 text-minimal">
                          <MapPin className="w-3 h-3" />
                          {company.location}
                        </div>
                      </div>
                      <Badge className={`${getPlanColor(company.planType || 'free')} text-xs px-2 py-1 h-6`}>
                        {company.planType === 'power' ? 'Power' : company.planType === 'pro' ? 'Pro' : 'Free'}
                      </Badge>
                    </div>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3 h-3 ${i < Math.floor(Number(company.rating) || 0) ? 'text-yellow-500 fill-current' : 'text-muted'}`} 
                          />
                        ))}
                      </div>
                      <span className="text-minimal text-xs">
                        {company.rating} ({company.reviewCount})
                      </span>
                    </div>
                    
                    {/* Cover Image */}
                    <div className="aspect-[4/3] bg-accent/30 rounded-lg flex items-center justify-center overflow-hidden">
                      {company.coverImage || (company.images && company.images.length > 0) ? (
                        <img 
                          src={company.coverImage || company.images?.[0] || ""} 
                          alt={`${company.name} - Capa`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    
                    {/* Description */}
                    <p className="text-minimal text-sm leading-relaxed line-clamp-3">
                      {company.description}
                    </p>
                    
                    {/* Services */}
                    <div className="flex flex-wrap gap-1">
                      {company.services?.slice(0, 2).map((service, index) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-accent/50 text-muted-foreground">
                          {service}
                        </Badge>
                      ))}
                      {(company.services?.length || 0) > 2 && (
                        <Badge variant="secondary" className="text-xs bg-accent/50 text-muted-foreground">
                          +{(company.services?.length || 0) - 2}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Contact Info */}
                    <div className="space-y-1">
                      {company.contactPhone && (
                        <div className="flex items-center gap-2 text-minimal text-xs">
                          <Phone className="w-3 h-3" />
                          <span>{company.contactPhone}</span>
                        </div>
                      )}
                      {company.contactEmail && (
                        <div className="flex items-center gap-2 text-minimal text-xs">
                          <Mail className="w-3 h-3" />
                          <span>{company.contactEmail}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Action */}
                    <div className="mt-6">
                      <Link to={`/empresa/${company.id}`}>
                        <Button className="btn-minimal w-full bg-foreground text-background hover:bg-foreground/90 h-9">
                          Ver Perfil
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Categories Grid */}
          <div className="border-t border-border pt-16">
            <h3 className="text-2xl font-normal tracking-tight text-center mb-12">Explore por Categoria</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {categories.map((category, index) => {
                const icons = [Film, Camera, Mic, Music, Calendar, Globe, Award, Zap, Star, MapPin];
                const Icon = icons[index] || Film;
                
                return (
                  <div key={category} className="card-minimal p-6 text-center hover:shadow-md transition-all duration-300 cursor-pointer group">
                    <Icon className="w-6 h-6 mx-auto mb-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <h4 className="font-normal text-sm text-foreground">{category}</h4>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Business CTA - Only show if user doesn't have a company */}
          {user && !userCompany && (
            <div className="card-minimal p-12 text-center mt-16">
              <h3 className="text-2xl font-normal tracking-tight text-foreground mb-4">
                Adicione Seu Negócio ao Diretório
              </h3>
              <p className="text-minimal mb-8 max-w-2xl mx-auto">
                Conecte-se com clientes em todo o Brasil. Cadastre sua empresa no maior diretório 
                de produção audiovisual do país e expanda seus negócios.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/cadastrar-produtora">
                  <Button className="btn-minimal bg-foreground text-background hover:bg-foreground/90">
                    Cadastrar Gratuitamente
                  </Button>
                </Link>
                <Button variant="outline" className="btn-minimal" style={{ display: 'none' }}>
                  Ver Planos Pagos
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}