#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { generateWebContainer } from './index.js';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', short: 'o', default: 'output' },
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help || positionals.length !== 1) {
  console.log('Uso: gtm-gen <config-do-cliente.json> [-o pasta-de-saida]');
  process.exit(values.help ? 0 : 1);
}

try {
  const config = JSON.parse(await readFile(positionals[0], 'utf8'));
  const json = generateWebContainer(config);
  await mkdir(values.out, { recursive: true });

  const file = join(values.out, `${config.tagManagerWeb}_web.json`);
  await writeFile(file, JSON.stringify(json, null, 4) + '\n');

  const v = json.containerVersion;
  console.log(`✔ ${file}`);
  console.log(`  ${v.tag.length} tags, ${v.trigger.length} acionadores, ${v.variable.length} variáveis` +
    (config.pixelFacebookAds ? ' (com Facebook Ads)' : ' (sem Facebook Ads)'));
} catch (err) {
  console.error(`✖ ${err.message}`);
  process.exit(1);
}
