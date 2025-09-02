import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createProductionCompany } from "@/lib/api";
import { insertProductionCompanySchema } from "@shared/schema";
import type { InsertProductionCompany } from "@shared/schema";

const serviceOptions = [
  "Produção de Cinema",
  "Documentários", 
  "Direção",
  "Roteiro",
  "Captação de Recursos",
  "Distribuição",
  "Gravação de Áudio",
  "Mixagem",
  "Masterização", 
  "Dublagem",
  "Trilha Sonora",
  "Sound Design",
  "Aluguel de Equipamentos",
  "Câmeras Profissionais",
  "Iluminação",
  "Som Direto",
  "Gruas e Dollies",
  "Suporte Técnico",
  "Pós-produção",
  "Edição",
  "Colorização",
  "Publicidade",
  "Eventos Corporativos"
];

export default function RegisterCompany() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertProductionCompany>({
    resolver: zodResolver(insertProductionCompanySchema),
    defaultValues: {
      name: "",
      description: "",
      services: [],
      location: "",
      contactPhone: "",
      contactEmail: "",
      website: "",
      planType: "free"
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: createProductionCompany,
    onSuccess: (company) => {
      toast({
        title: "Produtora cadastrada com sucesso!",
        description: "Sua produtora foi adicionada ao diretório.",
      });
      // Invalidate multiple queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/production-companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production-companies/user"] });
      
      // Navigate back to profile page to see the new company
      navigate("/perfil");
    },
    onError: (error: any) => {
      console.error("Error creating company:", error);
      toast({
        title: "Erro ao cadastrar produtora",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  const [selectedServices, setSelectedServices] = React.useState<string[]>([]);

  const handleServiceToggle = (service: string) => {
    const newServices = selectedServices.includes(service)
      ? selectedServices.filter(s => s !== service)
      : [...selectedServices, service];
    
    setSelectedServices(newServices);
    form.setValue("services", newServices);
  };

  const onSubmit = (data: InsertProductionCompany) => {
    // Validate services
    if (!data.services || data.services.length === 0) {
      toast({
        title: "Erro de validação",
        description: "Selecione pelo menos um serviço.",
        variant: "destructive",
      });
      return;
    }
    
    createCompanyMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-6 h-6 bg-foreground rounded flex items-center justify-center">
                <span className="text-background text-xs font-bold">N</span>
              </div>
              <h1 className="text-lg font-normal tracking-tight">NOCI</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Cadastrar Produtora</CardTitle>
            <CardDescription>
              Preencha as informações da sua produtora para aparecer no diretório
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Produtora *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Cine Rio Produtora" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva sua produtora, experiência e especialidades..."
                          className="min-h-[120px]"
                          {...field}
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormLabel>Serviços Oferecidos *</FormLabel>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-3 border rounded-md">
                    {serviceOptions.map((service) => (
                      <button
                        key={service}
                        type="button"
                        onClick={() => handleServiceToggle(service)}
                        className={`text-left p-2 rounded-md text-sm transition-colors ${
                          selectedServices.includes(service)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                  {selectedServices.length === 0 && (
                    <p className="text-sm text-muted-foreground">Selecione pelo menos um serviço</p>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Localização *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Rio de Janeiro, RJ" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email de Contato *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contato@suaprodutora.com.br" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://suaprodutora.com.br" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="planType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plano *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um plano" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="free">Gratuito (R$ 0)</SelectItem>
                          <SelectItem value="pro">Pro (R$ 97/mês)</SelectItem>
                          <SelectItem value="power">Power (R$ 397/mês)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate("/explorar")}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createCompanyMutation.isPending}
                    className="flex-1"
                  >
                    {createCompanyMutation.isPending ? "Cadastrando..." : "Cadastrar Produtora"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}