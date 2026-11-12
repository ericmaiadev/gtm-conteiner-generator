// Validates the client config (same fields as the "Ferramentas" block of the
// measurement plan) and returns a list of error messages (empty = OK).

const GTM_ID = /^GTM-[A-Z0-9]+$/;

export function validateConfig(c) {
  if (!c || typeof c !== 'object') return ['o config precisa ser um objeto JSON'];

  const errors = [];
  const need = (ok, msg) => { if (!ok) errors.push(msg); };
  const filled = (v) => typeof v === 'string' && v.trim() !== '';

  need(filled(c.nome), '"nome" é obrigatório (ex.: "[WEB] - Nome do Cliente")');
  need(GTM_ID.test(c.tagManagerWeb ?? ''), '"tagManagerWeb" deve ser um ID tipo GTM-XXXXXXX');
  if (filled(c.tagManagerServer)) need(GTM_ID.test(c.tagManagerServer), '"tagManagerServer" deve ser um ID tipo GTM-XXXXXXX');
  need(/^G-[A-Z0-9]+$/.test(c.googleAnalyticsGA4 ?? ''), '"googleAnalyticsGA4" deve ser um ID tipo G-XXXXXXXXXX');
  need(/^(AW-)?\d+$/.test(String(c.googleAds ?? '')), '"googleAds" deve ser o ID de conversão (ex.: 17595030532 ou AW-17595030532)');
  need(filled(c.googleAdsRotuloLead), '"googleAdsRotuloLead" é obrigatório (rótulo da conversão de Lead)');
  if (filled(c.pixelFacebookAds)) need(/^\d+$/.test(c.pixelFacebookAds), '"pixelFacebookAds" deve conter só números');
  need(/^https:\/\/[^\s/]+/.test(c.transportUrl ?? ''), '"transportUrl" deve ser uma URL https (ex.: https://xyz.stape.io)');
  need(
    Array.isArray(c.dominios) && c.dominios.length > 0 && c.dominios.every((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(d)),
    '"dominios" deve ser uma lista de domínios sem https:// (ex.: ["cliente.com.br"])',
  );

  return errors;
}
