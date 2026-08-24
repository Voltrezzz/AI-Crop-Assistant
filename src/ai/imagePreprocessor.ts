export interface ImageQualityReport {
  isValid: boolean;
  messages: string[];
}

export async function validateImage(file: File): Promise<boolean> {
  if (!file.type.startsWith('image/')) {
    return false;
  }
  // Check size < 10MB
  if (file.size > 10 * 1024 * 1024) {
    return false;
  }
  return true;
}

export async function checkImageQuality(imageData: string): Promise<ImageQualityReport> {
  // Mock implementation for prototype
  // In a real scenario, we would use TF.js or canvas to check blur/brightness
  const messages: string[] = [];
  let isValid = true;

  // Basic mock logic based on string length (just for demo variation)
  if (imageData.length < 1000) {
    isValid = false;
    messages.push('Image resolution is too low.');
  }
  
  if (imageData.length % 7 === 0) {
    messages.push('Image appears slightly blurry. Prediction may be less accurate.');
  }
  
  if (messages.length === 0) {
    messages.push('Image quality is good.');
  }

  return { isValid, messages };
}
