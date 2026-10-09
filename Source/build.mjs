import { cpSync, readFileSync, rmSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url))).version;
const base = new URL('./', import.meta.url);
const output = new URL('dist/', base);
// Recreate generated output so retired scripts cannot survive an upgrade build.
rmSync(output, { recursive: true, force: true });
mkdirSync(output);
cpSync(new URL('src/', base), output, { recursive: true });
const manifest = JSON.parse(readFileSync(new URL('manifest.json', output)));
manifest.version = version;
writeFileSync(new URL('manifest.json', output), JSON.stringify(manifest, null, 2) + '\n');
copyFileSync(new URL('src/scripts/halo-background.js', base), new URL('scripts/background.js', output));
copyFileSync(new URL('LICENSE', base), new URL('LICENSE', output));
console.log(`Built Halo ${version}: static isolated content scripts, no runtime dependencies`);
