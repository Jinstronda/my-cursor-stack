import { Button } from "@/components/ui/button";
import nociLogo from "@/../../assets/noci-white.png";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

export default function Landing() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center space-y-8 -mt-28">
        <div className="space-y-0">
          <div className="flex justify-center">
            <img src={nociLogo} alt="NOCI Logo" className="w-80 h-80 object-contain -mb-20" />
          </div>
          <p className="text-white/70 text-lg max-w-md mx-auto">Crie. Colabore. Seja Visto.
</p>
        </div>
        <Button
          onClick={handleLogin}
          disabled={loading}
          className="bg-white text-black hover:bg-white/90 font-medium px-8 py-3 rounded-lg text-lg disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar com Google"}
        </Button>
      </div>
    </div>
  );
}