import { useState } from 'react';
import { pipeline, env } from '@huggingface/transformers';
import { toast } from 'sonner';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = false;

const MAX_IMAGE_DIMENSION = 1024;

function resizeImageIfNeeded(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
      height = MAX_IMAGE_DIMENSION;
    }
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);
  return { width, height };
}

function createSquareWithWhiteBackground(
  sourceCanvas: HTMLCanvasElement,
  maskData: Uint8Array | Uint8ClampedArray | Float32Array
): HTMLCanvasElement {
  const size = Math.max(sourceCanvas.width, sourceCanvas.height);
  const squareCanvas = document.createElement('canvas');
  squareCanvas.width = size;
  squareCanvas.height = size;
  const ctx = squareCanvas.getContext('2d');

  if (!ctx) throw new Error('Could not get canvas context');

  // Fill with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, size, size);

  // Create temporary canvas for masked image
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sourceCanvas.width;
  tempCanvas.height = sourceCanvas.height;
  const tempCtx = tempCanvas.getContext('2d');

  if (!tempCtx) throw new Error('Could not get temp canvas context');

  // Draw original image
  tempCtx.drawImage(sourceCanvas, 0, 0);

  // Apply mask
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;

  for (let i = 0; i < maskData.length; i++) {
    const alpha = Math.round((1 - maskData[i]) * 255);
    data[i * 4 + 3] = alpha;
  }

  tempCtx.putImageData(imageData, 0, 0);

  // Center the masked image on white background
  const offsetX = (size - sourceCanvas.width) / 2;
  const offsetY = (size - sourceCanvas.height) / 2;
  ctx.drawImage(tempCanvas, offsetX, offsetY);

  return squareCanvas;
}

export function useBackgroundRemoval() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const removeBackgroundAndAddWhite = async (imageUrl: string): Promise<string> => {
    try {
      setIsProcessing(true);
      setProgress(10);

      console.log('Loading image from URL...');
      const img = await loadImage(imageUrl);
      setProgress(20);

      console.log('Initializing segmentation model...');
      
      // Try WebGPU first, fallback to WASM if not available
      let segmenter;
      try {
        segmenter = await pipeline(
          'image-segmentation',
          'Xenova/segformer-b0-finetuned-ade-512-512',
          { device: 'webgpu' }
        );
        console.log('Using WebGPU for segmentation');
      } catch (gpuError) {
        console.log('WebGPU not available, falling back to WASM');
        segmenter = await pipeline(
          'image-segmentation',
          'Xenova/segformer-b0-finetuned-ade-512-512'
        );
      }
      setProgress(40);

      // Convert image to canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Could not get canvas context');

      resizeImageIfNeeded(canvas, ctx, img);
      setProgress(50);

      // Get image data as base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      console.log('Processing with segmentation model...');
      const result = await segmenter(imageData);
      setProgress(70);

      if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
        throw new Error('Invalid segmentation result');
      }

      console.log('Creating square image with white background...');
      const squareCanvas = createSquareWithWhiteBackground(canvas, result[0].mask.data);
      setProgress(90);

      // Convert to base64
      const finalImage = squareCanvas.toDataURL('image/png', 1.0);
      setProgress(100);

      console.log('Background removal completed successfully');
      return finalImage;

    } catch (error) {
      console.error('Error removing background:', error);
      toast.error('Erreur lors du traitement de l\'image');
      throw error;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return {
    removeBackgroundAndAddWhite,
    isProcessing,
    progress,
  };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}
