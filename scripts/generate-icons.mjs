import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logoPath = join(__dirname, '../public/logo.png');
const publicPath = join(__dirname, '../public');

const sizes = [
  { size: 64, name: 'pwa-64x64.png' },
  { size: 192, name: 'pwa-192x192.png' },
  { size: 512, name: 'pwa-512x512.png' },
  { size: 512, name: 'maskable-icon-512x512.png' },
];

async function generateIcons() {
  try {
    const logoBuffer = readFileSync(logoPath);
    
    for (const { size, name } of sizes) {
      await sharp(logoBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(join(publicPath, name));
      
      console.log(`✅ Generated ${name} (${size}x${size})`);
    }
    
    console.log('\n🎉 All PWA icons generated from logo.png successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();

