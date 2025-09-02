import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

interface ServicesSelectorProps {
  selectedServices: string[];
  onServicesChange: (services: string[]) => void;
}

export default function ServicesSelector({ selectedServices, onServicesChange }: ServicesSelectorProps) {
  const [selectedService, setSelectedService] = useState("");

  // Lista de serviços disponíveis baseada na tela Explorar
  const availableServices = [
    "Produção de Cinema",
    "Produção de Vídeo",
    "Estúdio de Gravação",
    "Equipamentos Audiovisuais",
    "Edição e Pós-Produção",
    "Locações para Filmagem",
    "Casting e Talentos",
    "Trilha Sonora e Áudio",
    "Streaming e Transmissão",
    "Fotografia Profissional",
    "Direção de Arte",
    "Produção Executiva",
    "Animação e Motion Graphics",
    "Documentários",
    "Publicidade e Comerciais",
    "Filmes Corporativos",
    "Eventos e Transmissões ao Vivo",
    "Roteiro e Desenvolvimento",
    "Produção Musical",
    "Sonorização",
    "Cenografia",
    "Figurino",
    "Maquiagem e Caracterização",
    "Efeitos Visuais (VFX)",
    "Colorização",
    "Finalização de Áudio"
  ];

  const handleAddService = () => {
    if (selectedService && !selectedServices.includes(selectedService)) {
      onServicesChange([...selectedServices, selectedService]);
      setSelectedService("");
    }
  };

  const handleRemoveService = (serviceToRemove: string) => {
    onServicesChange(selectedServices.filter(service => service !== serviceToRemove));
  };

  // Filtrar serviços já selecionados
  const filteredServices = availableServices.filter(service => !selectedServices.includes(service));

  return (
    <div className="space-y-4">
      {/* Add new service */}
      <div className="flex gap-2">
        <Select value={selectedService} onValueChange={setSelectedService}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Selecione um serviço para adicionar" />
          </SelectTrigger>
          <SelectContent>
            {filteredServices.map((service) => (
              <SelectItem key={service} value={service}>
                {service}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          onClick={handleAddService}
          disabled={!selectedService}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Selected services */}
      {selectedServices.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {selectedServices.map((service) => (
              <Badge
                key={service}
                variant="secondary"
                className="flex items-center gap-1 px-3 py-1"
              >
                <span>{service}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveService(service)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {selectedServices.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum serviço selecionado. Use o dropdown acima para adicionar serviços.
        </p>
      )}
    </div>
  );
}