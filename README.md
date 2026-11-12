# gtm-conteiner-generator

Gera o container **web** do Google Tag Manager no padrão do plano de mensuração
(mesma nomenclatura de tags, acionadores e variáveis), a partir dos IDs de um cliente.
O JSON gerado é importado em **GTM → Administrador → Importar contêiner**.

## Uso

1. Copie `examples/config.example.json` e preencha com os dados do cliente:

| Campo | Planilha ("Ferramentas") | Vira no GTM |
| --- | --- | --- |
| `nome` | Tag Manager (Web) – Nome | nome do container |
| `tagManagerWeb` | Tag Manager (Web) – Id | ID do container |
| `tagManagerServer` | Tag Manager (Server) – Id | *(reservado para o container server)* |
| `googleAnalyticsGA4` | Google Analytics GA4 | `00.01 GA4` |
| `googleAds` | Tag Google Ads | `00.03 Google Ads` |
| `googleAdsRotuloLead` | — | `08.01 AW Lead` |
| `pixelFacebookAds` | Pixel Facebook Ads | `00.02 Facebook Ads` + tags `003 - 🔵 Facebook Ads` *(opcional: vazio = sem Facebook)* |
| `tokenFacebookAds` | Token Facebook Ads | *(reservado para o container server)* |
| `transportUrl` | — | `00.04 transport_url` |
| `dominios` | — | lista em `09.01 JS Domain` |

2. Gere o container:

```bash
npm run generate -- clientes/meu-cliente.json
```

Saída: `output/<GTM-ID>_web.json`.

## Modelo (templates/)

`templates/web.json` e `templates/facebook.json` são o padrão, com `__MARCADORES__`
no lugar dos IDs de cliente. Para atualizar o padrão a partir de um container exportado:

```bash
npm run build-template -- <container-modelo.json> <container-com-facebook.json>
```

O script remove IDs de conta/container e falha se algum valor de cliente sobrar no modelo.
Os exports originais (`GTM-*_workspace*.json`) e planilhas (`*.xlsx`) ficam fora do git.

## Testes

```bash
npm test
```

## Licença

MIT
