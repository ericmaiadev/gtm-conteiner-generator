#!/usr/bin/env node
// Builds the reusable templates in templates/ from real GTM exports,
// replacing every client-specific value with a __PLACEHOLDER__.
//
// Usage: node scripts/build-template.mjs <base-web.json> <facebook-source.json>
//   base-web.json         container used as the standard
//   facebook-source.json  container that has the "003 - 🔵 Facebook Ads" tags
//
// The source exports contain client IDs and are gitignored; only the
// scrubbed output in templates/ is committed.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const [basePath, fbPath] = process.argv.slice(2);
if (!basePath || !fbPath) {
  console.error('Usage: node scripts/build-template.mjs <base-web.json> <facebook-source.json>');
  process.exit(1);
}

const read = (p) => JSON.parse(readFileSync(p, 'utf8')).containerVersion;
const base = read(basePath);
const fbSrc = read(fbPath);

// Fields that tie an entity to a specific account/container/version.
const ACCOUNT_FIELDS = ['accountId', 'containerId', 'fingerprint', 'path', 'tagManagerUrl', 'parentFolderId'];
const strip = (obj) => {
  const out = { ...obj };
  for (const f of ACCOUNT_FIELDS) delete out[f];
  return out;
};

// Variables whose value is client-specific -> placeholder.
const CONSTANTS = {
  '00.01 GA4': '__GA4_ID__',
  '00.03 Google Ads': '__GADS_ID__',
  '00.04 transport_url': '__TRANSPORT_URL__',
  '08.01 AW Lead': '__GADS_LEAD_LABEL__',
};

const secrets = new Set(); // original values, used for the leak check at the end

const variables = base.variable.map((v) => {
  const out = strip(v);
  if (CONSTANTS[v.name]) {
    out.parameter = v.parameter.map((p) => {
      if (p.key !== 'value') return p;
      secrets.add(p.value);
      return { ...p, value: CONSTANTS[v.name] };
    });
  }
  if (v.name === '09.01 JS Domain') {
    out.parameter = v.parameter.map((p) => {
      if (p.key !== 'javascript') return p;
      const m = p.value.match(/var dominios = (\[[^\]]*\]);/);
      if (!m) throw new Error('09.01 JS Domain: could not find "var dominios = [...]"');
      for (const d of JSON.parse(m[1])) secrets.add(d);
      return { ...p, value: p.value.replace(m[1], '__DOMAINS__') };
    });
  }
  return out;
});

const web = {
  container: {
    name: '__GTM_WEB_NAME__',
    publicId: '__GTM_WEB_ID__',
    usageContext: base.container.usageContext,
    features: base.container.features,
    tagIds: ['__GTM_WEB_ID__'],
  },
  tag: base.tag.map(strip),
  trigger: base.trigger.map(strip),
  variable: variables,
  builtInVariable: base.builtInVariable.map(strip),
  folder: (base.folder ?? []).map(strip),
  customTemplate: (base.customTemplate ?? []).map(strip),
};

// ---- Facebook module ------------------------------------------------------
// Tags come from the source container; names/references lose any period
// prefix such as "Out_25 - " so they match the base naming exactly.
const PREFIX = /^[A-Za-z]{3}[_-]\d{2} - /;
const unprefix = (s) => s.replace(PREFIX, '');
const unprefixRefs = (s) => s.replace(/\{\{([^}]+)\}\}/g, (_, n) => `{{${unprefix(n)}}}`);

const fbTags = fbSrc.tag.filter((t) => /003 - 🔵 Facebook Ads - 0[12] /.test(t.name));
if (fbTags.length !== 2) throw new Error(`expected 2 Facebook tags, found ${fbTags.length}`);

const fbTemplateId = fbTags[0].type.split('_').pop();
const fbTemplate = fbSrc.customTemplate.find((t) => t.templateId === fbTemplateId);
if (!fbTemplate) throw new Error('Facebook Pixel custom template not found');

const facebook = {
  customTemplate: strip(fbTemplate),
  variable: {
    name: '00.02 Facebook Ads',
    type: 'c',
    parameter: [{ type: 'TEMPLATE', key: 'value', value: '__FB_PIXEL_ID__' }],
    formatValue: {},
  },
  tag: fbTags.map((t) => {
    const out = strip(t);
    delete out.tagId;
    out.name = unprefix(t.name);
    // "cvt_<containerId>_<templateId>" depends on the target container.
    out.type = '__FB_TEMPLATE_TYPE__';
    out.parameter = JSON.parse(unprefixRefs(JSON.stringify(t.parameter)));
    // Resolved at generation time against the base container's triggers.
    out.firingTriggerId = t.name.includes('Page View') ? ['ALL_PAGES'] : ['LIKE:002 - 🟠 Google Analytics 4 - 03 - Evento - generate_lead'];
    return out;
  }),
};

// ---- Leak check -----------------------------------------------------------
for (const id of [base.accountId, base.containerId, base.container.publicId, base.container.name,
  fbSrc.accountId, fbSrc.containerId, fbSrc.container.publicId, fbSrc.container.name]) secrets.add(id);

const text = JSON.stringify({ web, facebook });
const leaks = [...secrets].filter((s) => s && text.includes(s));
if (leaks.length) {
  console.error('✖ client values still present in template:', leaks);
  process.exit(1);
}

mkdirSync('templates', { recursive: true });
writeFileSync('templates/web.json', JSON.stringify(web, null, 2) + '\n');
writeFileSync('templates/facebook.json', JSON.stringify(facebook, null, 2) + '\n');
console.log(`✔ templates/web.json       (${web.tag.length} tags, ${web.trigger.length} triggers, ${web.variable.length} variables)`);
console.log(`✔ templates/facebook.json  (${facebook.tag.length} tags)`);
