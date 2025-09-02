import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap, Award, Calendar, Users, TrendingUp, Phone, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import UserAvatar from "@/components/user-avatar";
import { useAuth } from "@/hooks/useAuth";

export default function Pricing() {
  const { user } = useAuth();
  const [location] = useLocation();
  const plans = [
    {
      name: "Anúncio Grátis",
      subtitle: "Plano Básico",
      price: "R$ 0",
      period: "/mês",
      description: "Ideal para começar e testar a plataforma",
      icon: <Star className="w-6 h-6" />,
      color: "border-border",
      features: [
        "Listado em 1 categoria",
        "Informações de contato exibidas",
        "Visitantes podem deixar avaliações",
        "Aparece em páginas de bairros relevantes",
        "Perfil reivindicável e editável"
      ],
      cta: "Começar Gratuitamente",
      popular: false
    },
    {
      name: "Anúncio Pro",
      subtitle: "Para Profissionais",
      price: "R$ 97",
      period: "/mês",
      description: "Destaque-se da concorrência com recursos avançados",
      icon: <Award className="w-6 h-6" />,
      color: "border-blue-500",
      features: [
        "Todos os recursos do plano Grátis",
        "Destaque na Homepage (Spotlight)",
        "Topo das páginas de categoria",
        "Múltiplas categorias de serviço",
        "Links de mídias sociais",
        "Galeria de imagens",
        "Suporte prioritário"
      ],
      cta: "Upgrade para Pro",
      popular: true
    },
    {
      name: "Anúncio Power",
      subtitle: "Máximo Resultado",
      price: "R$ 397",
      period: "/mês",
      description: "Solução completa para empresas sérias sobre crescimento",
      icon: <Zap className="w-6 h-6" />,
      color: "border-yellow-500",
      features: [
        "Todos os recursos do plano Pro",
        "Chamada de consulta 1:1 para geração de leads",
        "Perfil otimizado para SEO, escrito para você",
        "Sistema de acompanhamento automatizado",
        "Integração com Google Review Booster",
        "2 blogs personalizados/mês no diretório",
        "Calendário de agendamentos integrado",
        "Emblema VIP no anúncio",
        "Aparece acima dos anúncios Pro"
      ],
      cta: "Upgrade para Power",
      popular: false
    }
  ];

  const testimonials = [
    {
      name: "Carlos Silva",
      company: "Cine Rio Produtora",
      text: "O plano Power transformou nosso negócio. Aumentamos nossos leads em 300% nos primeiros 3 meses.",
      plan: "Power"
    },
    {
      name: "Ana Oliveira",
      company: "Audio Master Studio",
      text: "O destaque na homepage do plano Pro trouxe muito mais visibilidade para nosso estúdio.",
      plan: "Pro"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Same as Explorar page */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="relative flex items-center h-10">
            {/* Logo */}
            <div className="absolute left-0 flex items-center space-x-4">
              <div className="w-6 h-6 bg-foreground rounded flex items-center justify-center">
                <Star className="w-3 h-3 text-background" />
              </div>
              <h1 className="text-lg font-normal tracking-tight">NOCI</h1>
            </div>
            
            {/* Navigation */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-8">
              <Link href="/explorar">
                <Button 
                  variant="ghost" 
                  className={`h-10 text-sm font-normal px-4 ${location === '/explorar' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Explorar
                </Button>
              </Link>
              <Link href="/criar">
                <Button 
                  variant="ghost" 
                  className={`h-10 text-sm font-normal px-4 ${location === '/criar' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Criar
                </Button>
              </Link>
            </div>

            {/* User Menu */}
            <div className="absolute right-0 flex items-center space-x-2">
              <Link href="/perfil">
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground">
                  <UserAvatar size={28} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Minimal Hero Section */}
      <section className="section-spacing">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-normal tracking-tight text-foreground mb-6">
            Planos para Todos os Tamanhos de Negócio
          </h1>
          <p className="text-minimal max-w-2xl mx-auto">
            Escolha o plano ideal para expandir sua presença no mercado audiovisual
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="section-spacing">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {plans.map((plan, index) => (
              <div 
                key={index} 
                className={`card-minimal p-8 ${plan.popular ? 'ring-1 ring-foreground' : ''} hover:shadow-md transition-all duration-300 relative`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-foreground text-background px-3 py-1 rounded-full text-xs font-normal">
                    Mais Popular
                  </div>
                )}
                
                <div className="text-center space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-center mb-4">
                      <div className={`p-3 rounded-full ${plan.popular ? 'bg-foreground text-background' : 'bg-accent text-foreground'}`}>
                        {plan.icon}
                      </div>
                    </div>
                    <h3 className="heading-minimal text-xl">{plan.name}</h3>
                    <p className="text-minimal text-sm">{plan.subtitle}</p>
                    <div className="py-4">
                      <span className="text-3xl font-light">{plan.price}</span>
                      <span className="text-minimal">{plan.period}</span>
                    </div>
                    <p className="text-minimal text-sm max-w-xs mx-auto">{plan.description}</p>
                  </div>

                  <div className="space-y-4 text-left">
                    <ul className="space-y-3">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-3">
                          <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-minimal text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className={`w-full mt-6 btn-minimal ${plan.popular ? 'bg-foreground text-background hover:bg-foreground/90' : 'border-border hover:bg-accent'}`}
                    >
                      {plan.cta}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Feature Comparison */}
          <div className="bg-secondary/50 p-8 rounded-lg mb-16">
            <h3 className="text-2xl font-bold text-center mb-8">Por que Escolher Nossos Planos?</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h4 className="font-semibold mb-2">Aumento de Visibilidade</h4>
                <p className="text-sm text-muted-foreground">
                  Apareça no topo dos resultados e seja encontrado por mais clientes
                </p>
              </div>
              <div className="text-center">
                <Users className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h4 className="font-semibold mb-2">Mais Leads Qualificados</h4>
                <p className="text-sm text-muted-foreground">
                  Conecte-se com clientes que realmente precisam dos seus serviços
                </p>
              </div>
              <div className="text-center">
                <Phone className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                <h4 className="font-semibold mb-2">Suporte Especializado</h4>
                <p className="text-sm text-muted-foreground">
                  Nossa equipe te ajuda a otimizar seu perfil para máximos resultados
                </p>
              </div>
            </div>
          </div>

          {/* Testimonials */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold text-center mb-8">O que Nossos Clientes Dizem</h3>
            <div className="grid md:grid-cols-2 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="p-6">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-2 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 italic">"{testimonial.text}"</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.company}</p>
                      </div>
                      <Badge variant="outline">{testimonial.plan}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-secondary/30 p-8 rounded-lg">
            <h3 className="text-2xl font-bold text-center mb-8">Perguntas Frequentes</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold mb-2">Posso cancelar a qualquer momento?</h4>
                <p className="text-sm text-muted-foreground">
                  Sim, você pode cancelar seu plano a qualquer momento. Não há contratos de longo prazo.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Como funciona o trial gratuito?</h4>
                <p className="text-sm text-muted-foreground">
                  O plano gratuito é permanente. Você pode fazer upgrade a qualquer momento.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Que formas de pagamento vocês aceitam?</h4>
                <p className="text-sm text-muted-foreground">
                  Aceitamos cartão de crédito, PIX e boleto bancário.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Há garantia de satisfação?</h4>
                <p className="text-sm text-muted-foreground">
                  Oferecemos garantia de 30 dias. Se não ficar satisfeito, devolvemos seu dinheiro.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}