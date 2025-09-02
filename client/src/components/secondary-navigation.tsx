import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useUnifiedScroll } from "@/hooks/use-scroll";
import { useNavigationCoordinator } from "@/hooks/use-navigation-coordinator";

interface SecondaryNavigationProps {
  type: 'explorar' | 'criar';
}

const SCROLL_THRESHOLD = 60; // px to hide navigation

const SecondaryNavigation = ({ type }: SecondaryNavigationProps) => {
  const [location] = useLocation();
  const { getPreciseTransform } = useUnifiedScroll();
  const { isStable } = useNavigationCoordinator();

  const explorarTabs = [
    { label: 'Filmes', path: '/explorar/filmes' },
    { label: 'Produtoras', path: '/explorar' },
    { label: 'Profissionais', path: '/explorar/profissionais' },
    { label: 'Projetos', path: '/explorar/projetos' },
    { label: 'Editais', path: '/explorar/editais' }
  ];

  const criarTabs = [
    { label: 'Projetos', path: '/criar' },
    { label: 'Portfólio', path: '/criar/portfolio' }
  ];

  const tabs = type === 'explorar' ? explorarTabs : criarTabs;

  // Get precise transform with navigation awareness
  const transform = isStable ? getPreciseTransform(SCROLL_THRESHOLD) : 'translate3d(0, 0, 0)';

  return (
    <div 
      className="border-b border-border bg-background/95 backdrop-blur-sm nav-transition navigation-isolate"
      style={{
        transform,
        backfaceVisibility: 'hidden',
        perspective: 1000,
        height: '60px', // Fixed height to prevent layout shifts
        contain: 'layout style paint size',
        isolation: 'isolate'
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div 
          className="flex items-center justify-center space-x-8"
          style={{ 
            height: '60px',
            padding: '10px 0' // Replaces py-3 with fixed padding
          }}
        >
          {tabs.map((tab) => (
            <Link 
              key={tab.path} 
              href={tab.path}
              style={{ display: 'flex', alignItems: 'center' }} // Ensure Link alignment
            >
              <Button
                variant="ghost"
                className={`text-sm font-normal px-4 h-10 leading-none text-center nav-button-stable ${
                  location === tab.path
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                style={{ 
                  minHeight: '40px',
                  maxHeight: '40px',
                  lineHeight: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {tab.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SecondaryNavigation;