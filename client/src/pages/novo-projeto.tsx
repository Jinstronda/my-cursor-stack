import { Link } from "wouter";
import { ArrowLeft, FileText, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NovoProjetoPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center">
            <Link href="/criar">
              <Button variant="ghost" size="sm" className="text-minimal hover:text-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-6">
        <div className="w-full max-w-4xl">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-normal tracking-tight text-foreground mb-4">
              Como você quer começar?
            </h1>
            <p className="text-minimal text-lg">
              Escolha uma das opções abaixo para criar seu novo projeto
            </p>
          </div>

          {/* Options cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Começar do zero */}
            <Link href="/criar/novo-projeto/onboarding-0">
              <Card className="bg-card border-border hover:shadow-lg transition-all duration-200 cursor-pointer group h-64">
                <CardContent className="p-8 h-full flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-medium text-foreground">
                      Começar do zero
                    </h3>
                    <p className="text-minimal leading-relaxed">
                      Crie um projeto completamente novo com a ajuda da IA para estruturar suas ideias
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Já tenho um projeto */}
            <Card className="bg-card border-border hover:shadow-lg transition-all duration-200 cursor-pointer group h-64">
              <CardContent className="p-8 h-full flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <FolderOpen className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-medium text-foreground">
                    Já tenho um projeto
                  </h3>
                  <p className="text-minimal leading-relaxed">
                    Importe informações de um projeto existente e continue desenvolvendo com a IA
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}