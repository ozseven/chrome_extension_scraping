import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const createScriptConfig = (name, entryPath) => {
  return {
    configFile: false, // Prevent loading vite.config.ts if it exists
    esbuild: {
      drop: ['console', 'debugger'],
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: path.resolve(__dirname, entryPath),
        name: name,
        formats: ['iife'],
        fileName: () => `${name}.js`,
      },
      sourcemap: false,
      minify: 'esbuild',
    }
  };
};

const scripts = [
  { name: 'background', path: 'src/background/background.ts' },
  { name: 'content', path: 'src/content/content.ts' },
  { name: 'inject', path: 'src/inject/inject.ts' }
];

async function run() {
  for (const script of scripts) {
    console.log(`Building script: ${script.name}...`);
    await build(createScriptConfig(script.name, script.path));
  }
  console.log('✅ All scripts built successfully!');
}

run().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
