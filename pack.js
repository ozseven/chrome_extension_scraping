import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, 'dist');
const keyPath = path.resolve(__dirname, 'dist.pem');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

console.log('📦 Starting packaging process...');

try {
  // Package as CRX using Chrome CLI
  if (fs.existsSync(chromePath)) {
    console.log('Creating CRX archive using Chrome...');
    
    // Chrome creates .crx next to the packaged directory (parent directory of dist)
    // with the same name as the directory + .crx (e.g. dist.crx)
    execSync(`"${chromePath}" --pack-extension="${distDir}" --pack-extension-key="${keyPath}"`);
    console.log('✅ CRX package generated successfully: dist.crx');
  } else {
    console.warn('⚠️ Chrome executable not found at default path. Skipping CRX packaging.');
  }

  // Package as ZIP using PowerShell Compress-Archive
  console.log('Creating ZIP archive...');
  execSync(`powershell -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath 'otonom-scrapy-ajani.zip' -Force"`);
  console.log('✅ ZIP package generated successfully: otonom-scrapy-ajani.zip');
} catch (error) {
  console.error('❌ Packaging failed:', error.message);
  process.exit(1);
}
