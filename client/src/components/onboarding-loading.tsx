import { useState, useEffect } from "react";
import { Film, Camera, Clapperboard, Star, Award, Palette } from "lucide-react";

const loadingPhrases = [
  "Refletindo sobre o universo da sua história...",
  "Explorando as possibilidades narrativas...",
  "Analisando os elementos do seu projeto...",
  "Descobrindo a essência da sua visão...",
  "Mergulhando na alma do seu filme...",
  "Contemplando os personagens únicos...",
  "Investigando a magia por trás da ideia...",
  "Desvendando os segredos da narrativa...",
  "Refletindo sobre o impacto emocional...",
  "Explorando as camadas da sua criação...",
  "Analisando o potencial cinematográfico...",
  "Descobrindo conexões entre as ideias...",
  "Mergulhando no mundo que você imagina...",
  "Contemplando a jornada dos protagonistas...",
  "Investigando temas profundos da história...",
  "Desvendando o coração do seu roteiro...",
  "Refletindo sobre a estética visual...",
  "Explorando as emoções em cada cena...",
  "Analisando a mensagem que transmite...",
  "Descobrindo o ritmo perfeito da narrativa...",
  "Mergulhando nas inspirações criativas...",
  "Contemplando o impacto na audiência...",
  "Investigando referências cinematográficas...",
  "Desvendando o estilo único do projeto..."
];

const icons = [Film, Camera, Clapperboard, Star, Award, Palette];

export default function OnboardingLoading() {
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [currentIcon, setCurrentIcon] = useState(0);

  useEffect(() => {
    const phraseInterval = setInterval(() => {
      setCurrentPhrase((prev) => (prev + 1) % loadingPhrases.length);
    }, 2500); // Aumentado de 1200ms para 2500ms

    const iconInterval = setInterval(() => {
      setCurrentIcon((prev) => (prev + 1) % icons.length);
    }, 2000); // Aumentado de 800ms para 2000ms

    return () => {
      clearInterval(phraseInterval);
      clearInterval(iconInterval);
    };
  }, []);

  const CurrentIcon = icons[currentIcon];

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center w-full max-w-lg px-6">
        {/* Animated Icon - Container fixo */}
        <div className="mb-8 flex justify-center">
          <div className="w-16 h-16 relative">
            <div className="absolute inset-0 border-2 border-white/20 rounded-full animate-spin"></div>
            <div className="absolute inset-2 bg-white/5 rounded-full flex items-center justify-center">
              <CurrentIcon className="w-6 h-6 text-white animate-pulse" />
            </div>
          </div>
        </div>

        {/* Loading Phrase - Container fixo para evitar movimento */}
        <div className="mb-8 min-h-[60px] flex items-center justify-center">
          <p 
            key={currentPhrase}
            className="text-lg text-white/80 animate-fade-in leading-relaxed text-center"
          >
            {loadingPhrases[currentPhrase]}
          </p>
        </div>

        {/* Progress Dots - Container fixo */}
        <div className="flex justify-center space-x-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full bg-white/30 animate-pulse`}
              style={{
                animationDelay: `${i * 0.3}s`,
                animationDuration: '1.5s'
              }}
            />
          ))}
        </div>

        {/* Subtle subtitle - Altura fixa */}
        <div className="h-6 flex items-center justify-center">
          <p className="text-white/40 text-sm">
            Preparando sua experiência criativa
          </p>
        </div>
      </div>
    </div>
  );
}