import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { createProject, createChatSession, sendMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import OnboardingLoading from "@/components/onboarding-loading";

export default function OnboardingStep0() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false); // Prevent duplicate creation
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading, signInWithGoogle } = useAuth();
  const { toast } = useToast();

  // Redirect to auth if user is not authenticated
  if (!authLoading && !isAuthenticated) {
    console.log("🔄 User not authenticated, redirecting to Google auth...");
    signInWithGoogle().catch(console.error);
    return null;
  }

  // Create project and session mutation
  const createProjectMutation = useMutation({
    mutationFn: async (initialMessage: string) => {
      // Enhanced user validation
      console.log("🔐 Validating user for project creation:", { user: !!user, userId: user?.id, isAuthenticated });
      
      if (!user || !user.id) {
        console.error("❌ User validation failed:", { user, isAuthenticated });
        throw new Error("User not found");
      }
      
      console.log("✅ User validated, creating project with initial message:", initialMessage);
      
      // Create project first - AI will generate title and description from the message
      const project = await createProject({
        name: "Novo Projeto", // This triggers AI generation when combined with a real description
        description: initialMessage, // The user's message will be used to generate metadata
        userId: user.id
      });

      console.log("Project created:", project);

      // Create chat session for the project using the AI-generated title
      const sessionResult = await createChatSession({
        title: project.name, // This will now be the AI-generated title
        userId: user.id,
        projectId: project.id // CRITICAL: Pass the existing project ID
      });

      console.log("Chat session created:", sessionResult.session);

      // Send the initial message
      console.log("Sending initial message to session:", sessionResult.session.id, "message:", initialMessage);
      const messageResult = await sendMessage(sessionResult.session.id, initialMessage);
      console.log("Initial message sent successfully:", messageResult);

      return { project, session: sessionResult.session };
    },
    onSuccess: ({ project, session }) => {
      console.log("Project creation successful, navigating to chat");
      setIsCreating(false);
      setIsLoading(false);
      
      // Invalidate projects cache to refresh lists
      queryClient.invalidateQueries({ queryKey: ['/api/projects/my'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects/community'] });
      
      // Redirect to chat with project and session IDs
      setLocation(`/criar/novo-projeto/chat?projectId=${project.id}&sessionId=${session.id}`);
    },
    onError: (error) => {
      console.error("Project creation failed:", error);
      setIsCreating(false);
      setIsLoading(false);
      
      // Check if it's an authentication error
      const isAuthError = error.message.includes('401') || error.message.includes('Authentication required');
      
      if (isAuthError) {
        toast({
          title: "Sessão Expirada",
          description: "Sua sessão expirou. Por favor, faça login novamente.",
          variant: "destructive",
        });
        
        // Redirect to Google auth after a short delay
        setTimeout(() => {
          signInWithGoogle().catch(console.error);
        }, 2000);
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível criar o projeto. Tente novamente.",
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isCreating || isLoading) return;
    
    console.log("Starting project creation with message:", message.trim());
    setIsLoading(true);
    setIsCreating(true);
    
    // Start the project creation process immediately
    createProjectMutation.mutate(message.trim());
  };

  if (isLoading || authLoading) {
    return <OnboardingLoading />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button - Same as NovoProjetoPage */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center">
            <Link href="/criar/novo-projeto">
              <Button variant="ghost" size="sm" className="text-minimal hover:text-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content - Same layout pattern */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-6">
        <div className="w-full max-w-4xl">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-normal tracking-tight text-foreground mb-4">
              Uma pergunta
            </h1>
            <p className="text-minimal text-lg">
              Que história você sonha em contar para o mundo?
            </p>
          </div>

          {/* Chat Form Container */}
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Descreva a ideia que está na sua mente..."
                  className="min-h-[120px] text-base resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                />
                <div className="flex justify-center mt-6">
                  <Button
                    type="submit"
                    disabled={!message.trim() || isCreating || isLoading}
                    className="bg-primary hover:bg-primary/90 disabled:bg-primary/20 disabled:text-muted-foreground px-8 py-3 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Enviar
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}