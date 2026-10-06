import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(path.resolve('node_modules/.marudham-tests-'));
try {
  const entries = ['tests/regression.test.ts', 'tests/modules.ui.test.tsx'];
  const outfiles = [];
  for (const entry of entries) {
  const outfile = path.join(dir, path.basename(entry).replace(/\.tsx?$/, '.mjs'));
  outfiles.push(outfile);
  await build({ entryPoints: [entry], outfile, bundle: true, platform: 'node',
    format: 'esm', packages: 'external',
    plugins: [{ name: 'test-cloud-client', setup(builder) { builder.onResolve({ filter: /SatelliteMap$/ }, () => ({ path: path.resolve('tests/SatelliteMapMock.tsx') })); builder.onResolve({ filter: /supabaseClient$/ }, () => ({ path: path.resolve('tests/supabaseMock.ts') })); } }], alias: { '@': path.resolve('src') }, define: { 'import.meta.env': '{}' } });
  }
  const result = spawnSync(process.execPath, ['--import', pathToFileURL(path.resolve('tests/setup-dom.mjs')).href, '--test', ...outfiles], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally { await rm(dir, { recursive: true, force: true }); }
