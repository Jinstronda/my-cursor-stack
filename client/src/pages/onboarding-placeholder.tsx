import { Link } from "wouter";
import { ArrowLeft, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OnboardingPlaceholder() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        {/* Icon */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center">
            <Wrench className="w-10 h-10 text-white/60" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-4">
          Em Desenvolvimento
        </h1>

        {/* Description */}
        <p className="text-white/70 text-lg leading-relaxed mb-8">
          Esta funcionalidade está sendo construída com muito carinho para você. 
          Em breve, você poderá criar projetos incríveis de forma ainda mais intuitiva.
        </p>

        {/* Back Button */}
        <Link href="/criar">
          <Button className="bg-white text-black hover:bg-white/90 px-6 py-3 flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Criar
          </Button>
        </Link>
      </div>
    </div>
  );
}