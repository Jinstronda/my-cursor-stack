import { Film, UserIcon, Video, Clock, Library, Info, Filter } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import UnifiedHeader from "@/components/unified-header";
import SecondaryNavigation from "@/components/secondary-navigation";

const ExplorarFilmes = () => {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col layout-stable">
      {/* Unified Header */}
      <UnifiedHeader />

      {/* Secondary Navigation */}
      <SecondaryNavigation type="explorar" />

      {/* Content */}
      <div className="flex-1 bg-background flex items-start justify-center px-6">
        <div className="text-center max-w-4xl w-full pt-20">
          {/* Icon */}
          <div className="mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Video className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-foreground">
            Em Breve
          </h1>

          {/* Description */}
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-8 sm:mb-12 max-w-2xl mx-auto">
            Em breve, você poderá descobrir e explorar uma vasta biblioteca de filmes nacionais e internacionais, 
            com informações detalhadas sobre elenco, direção, produção e muito mais.
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {/* Card 1 */}
            <div className="group bg-card/50 border border-border/50 rounded-xl p-6 hover:bg-card/80 hover:border-border transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <Library className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium text-foreground text-sm">
                  Catálogo completo de filmes
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Acesse uma vasta biblioteca de filmes nacionais e internacionais
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="group bg-card/50 border border-border/50 rounded-xl p-6 hover:bg-card/80 hover:border-border transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <Info className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium text-foreground text-sm">
                  Informações de produção
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Detalhes completos sobre elenco, direção, equipe técnica e produção
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="group bg-card/50 border border-border/50 rounded-xl p-6 hover:bg-card/80 hover:border-border transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 sm:col-span-2 lg:col-span-1">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <Filter className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium text-foreground text-sm">
                  Filtros avançados de busca
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Encontre filmes por gênero, diretor, ano, duração e muitos outros critérios
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplorarFilmes;