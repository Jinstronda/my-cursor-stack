import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from "crypto";

let supabase: SupabaseClient | null = null;

// Initialize Supabase client lazily
function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables for server operations');
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  
  return supabase;
}

export async function saveBase64Image(base64Data: string): Promise<string> {
  // Extract file extension from base64 header
  const matches = base64Data.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid base64 image format");
  }
  
  const [, extension, data] = matches;
  const fileExtension = extension === "jpeg" ? "jpg" : extension;
  
  // Generate unique filename
  const filename = `${crypto.randomUUID()}.${fileExtension}`;
  
  // Convert base64 to buffer
  const buffer = Buffer.from(data, "base64");
  
  // Upload to Supabase Storage
  const { data: uploadData, error } = await getSupabaseClient().storage
    .from('company-images')
    .upload(filename, buffer, {
      contentType: `image/${fileExtension}`,
      upsert: false
    });
    
  if (error) {
    console.error('Error uploading to Supabase Storage:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
  
  if (!uploadData?.path) {
    throw new Error('Upload succeeded but no path was returned');
  }
  
  // Return public URL
  const { data: publicUrlData } = getSupabaseClient().storage
    .from('company-images')
    .getPublicUrl(uploadData.path);
    
  return publicUrlData.publicUrl;
}

// Alternative function for direct file upload (for future use)
export async function uploadFileToSupabase(file: File, filename?: string): Promise<string> {
  const finalFilename = filename || `${crypto.randomUUID()}.${file.name.split('.').pop()}`;
  
  const { data: uploadData, error } = await getSupabaseClient().storage
    .from('company-images')
    .upload(finalFilename, file, {
      contentType: file.type,
      upsert: false
    });
    
  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
  
  if (!uploadData?.path) {
    throw new Error('Upload succeeded but no path was returned');
  }
  
  const { data: publicUrlData } = getSupabaseClient().storage
    .from('company-images')
    .getPublicUrl(uploadData.path);
    
  return publicUrlData.publicUrl;
}