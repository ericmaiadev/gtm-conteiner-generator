# GTM Container Generator

Gera o container **web** do Google Tag Manager no padrão do plano de mensuração do usuário,
a partir dos IDs de um cliente. O JSON gerado é importado em
GTM → Administrador → Importar contêiner, num container novo e vazio.

Conversar com o usuário em **português**.

## Comandos

- `npm run gerar`: lê `cliente.json` e gera `output/<GTM-ID>_web.json`. Na primeira vez, cria o
  `cliente.json` a partir de `cliente.exemplo.json`.
- `npm test`: testes (node:test, sem dependências).
- `npm run build-template -- <modelo.json> <container-com-facebook.json>`: recria `templates/`
  a partir de exports reais do GTM.

Node 20+. Sem dependências npm.

## Estrutura

- `templates/web.json`: molde do container padrão (tags, acionadores, variáveis, JS, template
  Unique Event ID) com `__MARCADORES__` no lugar dos IDs.
- `templates/facebook.json`: módulo opcional (tags `003 - 🔵 Facebook Ads`, variável
  `00.02 Facebook Ads`, template Facebook Pixel). Entra só quando `pixelFacebookAds` está preenchido.
- `src/index.js`: `generateWebContainer(config)`, que preenche os marcadores e adiciona o Facebook.
- `src/validate.js`: validação do `cliente.json`, com mensagens em português.
- `src/cli.js`: comando `gerar`.
- `scripts/build-template.mjs`: gera os moldes e **falha se sobrar algum ID de cliente**.

## Regras

- **Nomenclatura idêntica ao padrão.** Nomes de tags, acionadores e variáveis (ex.:
  `002 - 🟠 Google Analytics 4 - 03 - Evento - generate_lead`, `00.01 GA4`, `01.02 🍪 fbp`) não
  podem mudar, inclusive os emojis. Ao mexer no molde, verificar regenerando o container de
  referência e comparando com o export original: deve sair idêntico.
- **Nenhum ID de cliente no repositório**: IDs de GTM/GA4/Ads/Pixel, tokens, domínios,
  URLs da Stape, nomes de clientes, accountId/containerId. Isso vale também para mensagens de
  commit, comentários e testes. Exports do GTM (`GTM-*_workspace*.json`), planilhas (`*.xlsx`) e
  `cliente.json` ficam no `.gitignore`.
- **Mostrar a proposta antes de implementar** qualquer mudança maior e esperar o OK do usuário.
  O usuário não é desenvolvedor: explicar de forma simples, passo a passo.
- Commits e PRs só quando o usuário pedir, sempre em branch separado (nunca direto na `main`).
  O `gh` não está instalado; o usuário abre o PR pelo GitHub.

## Pendências

- Testar a importação no GTM do container **com Facebook** (template do Pixel vindo de outro
  container; o tipo das tags é `cvt_0_<templateId>`).
- **Container server**: o padrão está no plano de mensuração (Cookie Monster, GA4, Facebook
  CAPI, Google Ads, Stape). Falta um export JSON de referência. `tagManagerServer` e
  `tokenFacebookAds` já são aceitos no `cliente.json`, mas ainda não são usados.
- Fora do padrão por enquanto: TikTok, YouTube, Hash 256 e o HTML de formSubmit (existem num
  container mais completo do usuário).
