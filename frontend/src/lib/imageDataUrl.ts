/** Redimensiona y exporta una imagen como data URL (JPEG por defecto). */
export function compressImageFileToDataUrl(
  file: File,
  options?: { maxWidth?: number; quality?: number; outputType?: 'image/jpeg' | 'image/png' | 'image/webp' }
): Promise<string> {
  const maxWidth = options?.maxWidth ?? 1600;
  const quality = options?.quality ?? 0.82;
  const outputType = options?.outputType ?? 'image/jpeg';

  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo procesar la imagen'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL(outputType, quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen'));
    };
    img.src = url;
  });
}
