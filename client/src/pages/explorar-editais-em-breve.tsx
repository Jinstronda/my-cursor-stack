import { FileText, Target, CheckCircle, Zap, FileCheck, Brain } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/user-avatar";
import SecondaryNavigation from "@/components/secondary-navigation";
import Logo from "@/components/logo";

const ExplorarEditaisEmBreve = () => {
  const [location] = useLocation();

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
      <div className="flex-1 bg-background flex items-start justify-center px-6">
        <div className="text-center max-w-4xl w-full pt-20">
          {/* Icon */}
          <div className="mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-foreground">
            Em Breve
          </h1>

          {/* Description */}
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-8 sm:mb-12 max-w-2xl mx-auto">
            Em breve, você poderá descobrir editais e chamadas públicas compatíveis com seus projetos, 
            com análise inteligente de requisitos e suporte para otimizar suas inscrições.
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {/* Card 1 */}
            <div className="group bg-card/50 border border-border/50 rounded-xl p-6 hover:bg-card/80 hover:border-border transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium text-foreground text-sm">
                  Análise automática de compatibilidade
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sistema inteligente que compara seu projeto com critérios dos editais
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="group bg-card/50 border border-border/50 rounded-xl p-6 hover:bg-card/80 hover:border-border transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <FileCheck className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium text-foreground text-sm">
                  Resumos otimizados para inscrição
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Documentos gerados automaticamente prontos para submissão
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="group bg-card/50 border border-border/50 rounded-xl p-6 hover:bg-card/80 hover:border-border transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 sm:col-span-2 lg:col-span-1">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium text-foreground text-sm">
                  Recomendações baseadas em IA
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sugestões personalizadas para maximizar suas chances de aprovação
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplorarEditaisEmBreve;