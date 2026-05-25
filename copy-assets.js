import fs from 'fs';
import path from 'path';

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`Copied file: ${src} -> ${dest}`);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied asset: ${srcPath} -> ${destPath}`);
    }
  }
}

try {
  copyFile('manifest.json', 'dist/manifest.json');
  if (fs.existsSync('icons')) {
    copyDir('icons', 'dist/icons');
  }
  console.log('✅ Assets successfully copied to dist/');
} catch (err) {
  console.error('❌ Error copying assets:', err.message);
  process.exit(1);
}
