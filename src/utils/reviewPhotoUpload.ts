import { supabase } from '../lib/supabase';

export const uploadReviewPhoto = async (file: File, userId: string): Promise<string | null> => {
  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Upload file to review-photos bucket
    const { error } = await supabase.storage
      .from('review-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading review photo:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('review-photos')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading review photo:', error);
    return null;
  }
};

export const deleteReviewPhoto = async (url: string): Promise<boolean> => {
  try {
    // Extract file path from URL
    const urlParts = url.split('/');
    const bucketIndex = urlParts.findIndex(part => part === 'review-photos');
    if (bucketIndex === -1) return false;
    
    const filePath = urlParts.slice(bucketIndex + 1).join('/');

    const { error } = await supabase.storage
      .from('review-photos')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting review photo:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting review photo:', error);
    return false;
  }
};
