/**
 * Vision Analysis Worker
 * Handles heavy pixel calculations off the main thread.
 */

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  if (type === 'analyze') {
    const { 
      currentImageData, 
      lastImageData, 
      threshold, 
      width, 
      height 
    } = payload;

    const signature = generateVisualSignature(currentImageData);
    let motionScore = 0;
    let hasMotion = false;

    if (lastImageData) {
      motionScore = calculateMotionScore(lastImageData, currentImageData, width, height);
      if (motionScore > threshold) {
        hasMotion = true;
      }
    }

    self.postMessage({
      type: 'analysis_result',
      payload: {
        signature,
        motionScore,
        hasMotion
      }
    });
  }
};

function generateVisualSignature(imgData: ImageData): string {
  const data = imgData.data;
  const grid = 8;
  const stepX = Math.floor(imgData.width / grid);
  const stepY = Math.floor(imgData.height / grid);
  let signature = "";

  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      let sum = 0;
      let sumSq = 0;
      let count = 0;
      
      for (let py = 0; py < stepY; py += 4) {
        for (let px = 0; px < stepX; px += 4) {
          const offset = ((y * stepY + py) * imgData.width + (x * stepX + px)) * 4;
          const lum = 0.299 * data[offset] + 0.587 * data[offset+1] + 0.114 * data[offset+2];
          sum += lum;
          sumSq += lum * lum;
          count++;
        }
      }
      
      const avg = sum / count;
      const variance = (sumSq / count) - (avg * avg);
      
      signature += Math.floor(avg / 32).toString(16);
      signature += Math.floor(Math.min(variance, 1000) / 100).toString(16);
    }
  }
  return signature;
}

function calculateMotionScore(last: ImageData, current: ImageData, width: number, height: number): number {
  const data1 = last.data;
  const data2 = current.data;
  let weightedChangedPixels = 0;
  let totalWeight = 0;
  
  const step = 4 * 16; 

  for (let i = 0; i < data1.length; i += step) {
    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    
    const centerX = width / 2;
    const centerY = height / 2;
    const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    const maxDist = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
    const weight = 1 + (2 * (1 - dist / maxDist));
    
    const lum1 = 0.299 * data1[i] + 0.587 * data1[i+1] + 0.114 * data1[i+2];
    const lum2 = 0.299 * data2[i] + 0.587 * data2[i+1] + 0.114 * data2[i+2];
    
    if (Math.abs(lum1 - lum2) > 40) {
      weightedChangedPixels += weight;
    }
    totalWeight += weight;
  }

  return weightedChangedPixels / totalWeight;
}
