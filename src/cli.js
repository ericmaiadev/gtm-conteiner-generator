#!/usr/bin/env node
import { readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises';
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

if (values.help || positionals.length > 1) {
  console.log('Uso: npm run gerar                 (lê o cliente.json)');
  console.log('     npm run gerar -- outro.json   (lê outro arquivo)');
  process.exit(values.help ? 0 : 1);
}

const configPath = positionals[0] ?? 'cliente.json';

// First run: create cliente.json from the example so the user just edits it.
if (!positionals[0] && !(await access(configPath).then(() => true, () => false))) {
  await copyFile('cliente.exemplo.json', configPath);
  console.log('Criei o arquivo cliente.json com valores de exemplo.');
  console.log('Abra, preencha com os dados do cliente, salve e rode "npm run gerar" de novo.');
  process.exit(0);
}

try {
  let config;
  try {
    config = JSON.parse(await readFile(configPath, 'utf8'));
  } catch (err) {
    if (err instanceof SyntaxError) throw new Error(`${configPath} tem um erro de formatação (vírgula ou aspas?): ${err.message}`);
    throw err;
  }
  if (!positionals[0] && JSON.stringify(config) === JSON.stringify(JSON.parse(await readFile('cliente.exemplo.json', 'utf8')))) {
    throw new Error('cliente.json ainda está com os valores de exemplo. Preencha com os dados do cliente e rode de novo.');
  }
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
