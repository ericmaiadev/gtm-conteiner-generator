import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateWebContainer, validateConfig } from '../src/index.js';

const example = JSON.parse(readFileSync(new URL('../examples/config.example.json', import.meta.url), 'utf8'));
const withFb = { ...example, pixelFacebookAds: '1234567890' };
const BUILT_IN = new Set(['2147479553', '2147479573']);

const names = (v) => v.tag.map((t) => t.name).sort();
const variable = (v, name) => v.variable.find((x) => x.name === name);
const value = (x, key = 'value') => x.parameter.find((p) => p.key === key).value;

test('example config is valid', () => {
  assert.deepEqual(validateConfig(example), []);
});

test('fills the client values into the standard variables', () => {
  const v = generateWebContainer(example).containerVersion;
  assert.equal(v.container.publicId, 'GTM-ABC1234');
  assert.equal(v.container.name, '[WEB] - Nome do Cliente');
  assert.equal(value(variable(v, '00.01 GA4')), 'G-ABCDEF1234');
  assert.equal(value(variable(v, '00.03 Google Ads')), '123456789');
  assert.equal(value(variable(v, '00.04 transport_url')), 'https://exemplo.sab.stape.io');
  assert.equal(value(variable(v, '08.01 AW Lead')), 'AbCdEfGhIjKlMn');
  assert.match(value(variable(v, '09.01 JS Domain'), 'javascript'), /var dominios = \["cliente\.com\.br"\];/);
});

test('keeps the standard naming and has no Facebook tags without a pixel', () => {
  const v = generateWebContainer(example).containerVersion;
  assert.ok(names(v).includes('002 - 🟠 Google Analytics 4 - 03 - Evento - generate_lead'));
  assert.ok(names(v).includes('004 - 🟢 Google Ads - 03 - Evento - generate_lead'));
  assert.ok(!names(v).some((n) => n.includes('Facebook')));
  assert.equal(variable(v, '00.02 Facebook Ads'), undefined);
});

test('adds Facebook tags, variable and template when a pixel is given', () => {
  const v = generateWebContainer(withFb).containerVersion;
  const fb = v.tag.filter((t) => t.name.includes('Facebook'));
  assert.deepEqual(fb.map((t) => t.name).sort(), [
    '003 - 🔵 Facebook Ads - 01 - Tag - Page View',
    '003 - 🔵 Facebook Ads - 02 - Evento - generate_lead',
  ]);
  assert.equal(value(variable(v, '00.02 Facebook Ads')), '1234567890');

  const tpl = v.customTemplate.find((t) => t.name === 'Facebook Pixel');
  for (const t of fb) assert.equal(t.type, `cvt_0_${tpl.templateId}`);

  const ga4Lead = v.tag.find((t) => t.name === '002 - 🟠 Google Analytics 4 - 03 - Evento - generate_lead');
  const fbLead = fb.find((t) => t.name.includes('generate_lead'));
  assert.deepEqual(fbLead.firingTriggerId, ga4Lead.firingTriggerId);
});

test('every {{variable}} reference exists in the container', () => {
  const v = generateWebContainer(withFb).containerVersion;
  const known = new Set([...v.variable, ...v.builtInVariable].map((x) => x.name));
  known.add('_event');
  const refs = JSON.stringify([v.tag, v.trigger, v.variable]).match(/\{\{[^}]+\}\}/g);
  for (const ref of new Set(refs)) assert.ok(known.has(ref.slice(2, -2)), `missing variable ${ref}`);
});

test('every firing trigger exists and ids are unique', () => {
  const v = generateWebContainer(withFb).containerVersion;
  const triggers = new Set(v.trigger.map((t) => t.triggerId));
  for (const t of v.tag) for (const id of t.firingTriggerId) assert.ok(triggers.has(id) || BUILT_IN.has(id), `${t.name} -> ${id}`);

  for (const [list, key] of [[v.tag, 'tagId'], [v.variable, 'variableId'], [v.customTemplate, 'templateId']]) {
    const ids = list.map((x) => x[key]);
    assert.equal(new Set(ids).size, ids.length, `duplicate ${key}`);
  }
});

test('invalid config lists every problem', () => {
  assert.throws(
    () => generateWebContainer({ nome: 'x', tagManagerWeb: 'abc', dominios: [] }),
    (err) => err.errors.length >= 5,
  );
});
