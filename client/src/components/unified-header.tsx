import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import Logo from "@/components/logo";
import UserAvatar from "@/components/user-avatar";

interface UnifiedHeaderProps {
  className?: string;
}

export default function UnifiedHeader({ className = "" }: UnifiedHeaderProps) {
  const [location] = useLocation();

  return (
    <header className={`border-b border-border bg-background/95 header-isolate layout-stable ${className}`}>
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
                className={`text-sm font-normal px-4 h-10 ${
                  location.startsWith('/explorar') 
                    ? 'text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Explorar
              </Button>
            </Link>
            <Link href="/criar">
              <Button 
                variant="ghost" 
                className={`text-sm font-normal px-4 h-10 ${
                  location.startsWith('/criar') 
                    ? 'text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Criar
              </Button>
            </Link>
          </div>

          {/* User Menu - Right */}
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
  );
}