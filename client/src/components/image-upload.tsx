import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface ImageUploadProps {
  onImageUpload: (imageUrl: string) => void;
  onRemove?: () => void;
  currentImage?: string;
  label: string;
  maxSizeMB?: number;
  aspectRatio?: string;
  useDirectUpload?: boolean; // New option for direct Supabase upload
}

export default function ImageUpload({
  onImageUpload,
  onRemove,
  currentImage,
  label,
  maxSizeMB = 5,
  aspectRatio = "aspect-square",
  useDirectUpload = true
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadDirectToSupabase = async (file: File): Promise<string> => {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;

    const { data: uploadData, error } = await supabase.storage
      .from('company-images')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      throw new Error(`Erro no upload: ${error.message}`);
    }

    if (!uploadData?.path) {
      throw new Error('Upload realizado mas nenhum caminho foi retornado');
    }

    const { data: publicUrlData } = supabase.storage
      .from('company-images')
      .getPublicUrl(uploadData.path);

    return publicUrlData.publicUrl;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Apenas arquivos de imagem são permitidos.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast({
        title: "Erro",
        description: `O arquivo deve ter no máximo ${maxSizeMB}MB.`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      if (useDirectUpload && supabase) {
        // Direct upload to Supabase Storage
        const imageUrl = await uploadDirectToSupabase(file);
        onImageUpload(imageUrl);
        toast({
          title: "Sucesso",
          description: "Imagem enviada com sucesso!",
        });
      } else {
        // Fallback to base64 conversion for server processing
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          onImageUpload(base64);
          toast({
            title: "Sucesso",
            description: "Imagem carregada com sucesso!",
          });
        };
        reader.onerror = () => {
          throw new Error("Erro ao ler o arquivo");
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao processar a imagem.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveClick = () => {
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {/* Upload Button */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleUploadClick}
          disabled={isUploading}
          className="flex-1"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Carregando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Escolher Imagem
            </>
          )}
        </Button>
        
        {currentImage && onRemove && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleRemoveClick}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Preview */}
      {currentImage && (
        <div className={`${aspectRatio} bg-accent/30 rounded-lg overflow-hidden`}>
          <img 
            src={currentImage} 
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* File Size Info */}
      <p className="text-xs text-muted-foreground">
        Formatos aceitos: JPG, PNG, JPEG. Tamanho máximo: {maxSizeMB}MB
      </p>
    </div>
  );
}