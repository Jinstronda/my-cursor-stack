import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuthContext } from "@/components/AuthProvider";
import { runStartupAuthTest } from "@/lib/auth-startup-test";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Directory from "@/pages/directory";
import CompanyProfile from "@/pages/company-profile";
import Pricing from "@/pages/pricing";
import Profile from "@/pages/profile";
import RegisterCompany from "@/pages/register-company";
import NotFound from "@/pages/not-found";
import ExplorarFilmes from "@/pages/explorar-filmes";
import ExplorarProfissionais from "@/pages/explorar-profissionais";
import ExplorarProjetos from "@/pages/explorar-projetos";
import ExplorarEditais from "@/pages/explorar-editais";
import EditalDetalhes from "@/pages/edital-detalhes";
import NovoEdital from "@/pages/novo-edital";
import CriarPortfolio from "@/pages/criar-portfolio";
import ProjetosBeta from "@/pages/projetos-beta";
import NovoProjetoPage from "@/pages/novo-projeto";
import OnboardingStep0 from "@/pages/onboarding-step0";
import OnboardingPlaceholder from "@/pages/onboarding-placeholder";
import ProjectChat from "@/pages/project-chat";
import AuthCallbackSimple from "@/pages/auth-callback-simple";

function Router() {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="route-container">
      <Switch>        
        <Route path="/auth-callback" component={AuthCallbackSimple} />
        {!isAuthenticated ? (
          <>
            <Route path="/" component={Landing} />
            <Route path="/empresa/:id" component={CompanyProfile} />
            <Route path="/@:id" component={CompanyProfile} />
          </>
        ) : (
          <>
            <Route path="/" component={Home} />
            <Route path="/explorar/filmes" component={ExplorarFilmes} />
            <Route path="/explorar/profissionais" component={ExplorarProfissionais} />
            <Route path="/explorar/projetos" component={ExplorarProjetos} />
            <Route path="/explorar/editais" component={ExplorarEditais} />
            <Route path="/edital/:id" component={EditalDetalhes} />
            <Route path="/novo-edital" component={NovoEdital} />
            <Route path="/explorar" component={Directory} />
            <Route path="/criar/portfolio" component={CriarPortfolio} />
            <Route path="/criar/novo-projeto/onboarding-0" component={OnboardingStep0} />
            <Route path="/criar/novo-projeto/placeholder" component={OnboardingPlaceholder} />
            <Route path="/criar/novo-projeto/chat" component={ProjectChat} />
            <Route path="/criar/novo-projeto" component={NovoProjetoPage} />
            <Route path="/criar" component={ProjetosBeta} />
            <Route path="/cadastrar-produtora" component={RegisterCompany} />
            <Route path="/precos" component={Pricing} />
            <Route path="/perfil" component={Profile} />
            <Route path="/empresa/:id" component={CompanyProfile} />
            <Route path="/@:id" component={CompanyProfile} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  // Run startup authentication test
  runStartupAuthTest();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="dark">
            <Toaster />
            <Router />
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
