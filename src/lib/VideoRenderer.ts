// Video export utility using MediaRecorder API
export async function VideoExporter(selector: string, duration: number): Promise<void> {
  const element = document.querySelector(selector) as HTMLElement;
  
  if (!element) {
    console.error('Element not found:', selector);
    return;
  }

  // Create a canvas to capture the element
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.error('Could not get canvas context');
    return;
  }

  // Set canvas size to match element
  const rect = element.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  // Use html2canvas or similar for complex DOM capture
  // For now, we'll use the captureStream API if available
  try {
    const stream = (canvas as any).captureStream(30); // 30fps
    const recorder = new MediaRecorder(stream, { 
      mimeType: 'video/webm;codecs=vp9' 
    });

    const chunks: Blob[] = [];
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'NewAI-AD.webm';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    recorder.start();
    setTimeout(() => recorder.stop(), duration * 1000);
    
  } catch (error) {
    console.error('Video export error:', error);
  }
}

// Alternative: Simple screenshot download
export function downloadScreenshot(selector: string, filename: string = 'screenshot.png'): void {
  const element = document.querySelector(selector) as HTMLElement;
  if (!element) return;

  // This would require html2canvas library for proper DOM capture
  console.log('Screenshot capture requires html2canvas library');
}
