import { readFileSync } from 'node:fs';
import { validateConfig } from './validate.js';

export { validateConfig };

const loadTemplate = (name) =>
  JSON.parse(readFileSync(new URL(`../templates/${name}.json`, import.meta.url), 'utf8'));

const BUILT_IN_TRIGGERS = { ALL_PAGES: '2147479553', INITIALIZATION: '2147479573' };
const ACCOUNT = { accountId: '0', containerId: '0' };

// Generates the web container (GTM import format) for one client.
export function generateWebContainer(config) {
  const errors = validateConfig(config);
  if (errors.length) {
    const err = new Error(`Config inválido:\n- ${errors.join('\n- ')}`);
    err.errors = errors;
    throw err;
  }

  const web = loadTemplate('web');
  const hasFacebook = Boolean(config.pixelFacebookAds?.trim());

  if (hasFacebook) addFacebook(web, loadTemplate('facebook'));

  // Every entity gets the same neutral account/container ids.
  for (const key of ['tag', 'trigger', 'variable', 'builtInVariable', 'folder', 'customTemplate']) {
    web[key] = web[key].map((e) => ({ ...ACCOUNT, ...e }));
  }

  const containerVersion = {
    ...ACCOUNT,
    containerVersionId: '0',
    container: { ...ACCOUNT, ...web.container },
    tag: web.tag,
    trigger: web.trigger,
    variable: web.variable,
    builtInVariable: web.builtInVariable,
    ...(web.folder.length ? { folder: web.folder } : {}),
    customTemplate: web.customTemplate,
  };

  const filled = fillPlaceholders(containerVersion, {
    __GTM_WEB_NAME__: config.nome.trim(),
    __GTM_WEB_ID__: config.tagManagerWeb,
    __GA4_ID__: config.googleAnalyticsGA4,
    __GADS_ID__: String(config.googleAds).replace(/^AW-/, ''),
    __GADS_LEAD_LABEL__: config.googleAdsRotuloLead.trim(),
    __TRANSPORT_URL__: config.transportUrl.replace(/\/+$/, ''),
    __DOMAINS__: JSON.stringify(config.dominios.map((d) => d.toLowerCase().replace(/^www\./, ''))),
    __FB_PIXEL_ID__: config.pixelFacebookAds ?? '',
  });

  return {
    exportFormatVersion: 2,
    exportTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
    containerVersion: filled,
  };
}

// Adds the Facebook Pixel template, the "00.02 Facebook Ads" variable and the
// "003 - 🔵 Facebook Ads" tags, with fresh ids that don't clash with the base.
function addFacebook(web, fb) {
  const used = [...web.tag.map((t) => t.tagId), ...web.trigger.map((t) => t.triggerId),
    ...web.variable.map((v) => v.variableId), ...web.customTemplate.map((t) => t.templateId)].map(Number);
  let next = Math.max(0, ...used) + 1;
  const newId = () => String(next++);

  const templateId = newId();
  web.customTemplate.push({ ...fb.customTemplate, templateId });
  web.variable.push({ ...fb.variable, variableId: newId() });

  for (const tag of fb.tag) {
    const firingTriggerId = tag.firingTriggerId.flatMap((ref) => {
      if (BUILT_IN_TRIGGERS[ref]) return [BUILT_IN_TRIGGERS[ref]];
      if (ref.startsWith('LIKE:')) {
        const name = ref.slice(5);
        const model = web.tag.find((t) => t.name === name);
        if (!model) throw new Error(`template: tag "${name}" não existe no modelo base`);
        return model.firingTriggerId;
      }
      throw new Error(`template: referência de acionador desconhecida "${ref}"`);
    });
    web.tag.push({ ...tag, tagId: newId(), type: `cvt_${ACCOUNT.containerId}_${templateId}`, firingTriggerId });
  }
}

// Replaces __PLACEHOLDERS__ anywhere in the object (names, values, JS code).
function fillPlaceholders(obj, values) {
  let text = JSON.stringify(obj);
  for (const [key, value] of Object.entries(values)) {
    text = text.replaceAll(key, JSON.stringify(String(value)).slice(1, -1));
  }
  // Only our own markers; GTM's template code uses ___INFO___ etc. (3 underscores).
  const left = text.match(/(?<!_)__(?:GTM|GA4|GADS|TRANSPORT|DOMAINS|FB)[A-Z0-9_]*?__(?!_)/g);
  if (left) throw new Error(`placeholders não preenchidos: ${[...new Set(left)].join(', ')}`);
  return JSON.parse(text);
}
