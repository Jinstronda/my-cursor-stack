import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { 
  Film, 
  Video, 
  Camera, 
  Clapperboard, 
  Search, 
  PlusCircle,
  ArrowLeft
} from "lucide-react";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/explorar');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className={`max-w-2xl w-full text-center transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        

        {/* Main content */}
        <Card className="bg-card border border-border">
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Error code */}
              <h1 className="text-8xl font-normal tracking-tight text-primary mb-2">
                404
              </h1>

              {/* Creative messages */}
              <div className="space-y-4">
                <h2 className="text-3xl font-normal tracking-tight text-foreground">
                  Esta cena não foi encontrada
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
                  Parece que esta página saiu de cartaz ou ainda não foi produzida. 
                  Que tal explorar outros projetos incríveis?
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
                <Button 
                  onClick={handleGoBack}
                  variant="outline" 
                  className="gap-2 min-w-40"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
                
                <Button 
                  onClick={() => setLocation('/explorar')}
                  className="gap-2 min-w-40"
                >
                  <Search className="h-4 w-4" />
                  Explorar
                </Button>
                
                <Button 
                  onClick={() => setLocation('/criar')}
                  variant="outline"
                  className="gap-2 min-w-40"
                >
                  <PlusCircle className="h-4 w-4" />
                  Criar Projeto
                </Button>
              </div>

              {/* Quick navigation suggestions */}
              <div className="pt-8 border-t border-border">
                <p className="text-sm text-muted-foreground mb-4">
                  Ou continue sua jornada audiovisual:
                </p>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation('/explorar/filmes')}
                    className="h-auto py-3 flex-col gap-2"
                  >
                    <Film className="h-5 w-5" />
                    <span className="text-xs">Filmes</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation('/explorar/profissionais')}
                    className="h-auto py-3 flex-col gap-2"
                  >
                    <Camera className="h-5 w-5" />
                    <span className="text-xs">Profissionais</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation('/explorar/projetos')}
                    className="h-auto py-3 flex-col gap-2"
                  >
                    <Video className="h-5 w-5" />
                    <span className="text-xs">Projetos</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation('/explorar/editais')}
                    className="h-auto py-3 flex-col gap-2"
                  >
                    <Clapperboard className="h-5 w-5" />
                    <span className="text-xs">Editais</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
