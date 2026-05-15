import { supabase } from '../supabase';

const MAX_DIMENSION = 800;
const MAX_TAILLE = 2 * 1024 * 1024;

function redimensionner(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
        resolve(file);
        return;
      }
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Échec compression')),
        'image/jpeg',
        0.8,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.src = url;
  });
}

export async function uploaderPhoto(file, ligneId) {
  if (file.size > MAX_TAILLE * 2) {
    throw new Error('Photo trop volumineuse (max 2 Mo)');
  }

  const blob = await redimensionner(file);
  const ext = 'jpg';
  const path = `gares/${ligneId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from('gares').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from('gares').getPublicUrl(path);
  return data.publicUrl;
}
