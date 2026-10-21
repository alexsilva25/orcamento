# OrçaSeg

Site estático em Astro para criar orçamentos de equipamentos e serviços de segurança. Inclui cadastro do cliente, itens, desconto, despesas adicionais, condições, armazenamento no navegador e impressão em PDF.

## Desenvolvimento

Configurado e validado com Node.js 25.0.0 e npm.

```sh
npm install
npm run dev
npm run build
npm run preview
```

## Cloudflare Pages

No painel Cloudflare, crie um projeto Pages e conecte o repositório `alexsilva25/orcamento`.

- Comando de build: `npm run build`
- Diretório de saída: `dist`
- Versão do Node: 25.0.0 (variável de build `NODE_VERSION`)
- Escolha a branch que contém o código.

O Astro gera HTML estático; não precisa de adaptador, banco de dados ou variáveis secretas. Cada push na branch conectada inicia uma publicação.

## Dados

O catálogo inicial contém 234 produtos pesquisados em 21/10/2026: câmeras, gravadores, sensores, cercas, fechaduras, interfones, automatizadores, armazenamento, nobreaks, redes e acessórios. Fotografias reais ficam em `public/products/`; preços, condição de pagamento, URL da oferta, origem da imagem e data da consulta ficam em `src/data/products.json`.

Fontes: loja oficial Intelbras, revenda Intelbras Eletro e Detecta Company. É uma seleção das ofertas com foto e preço públicos encontrados nessas fontes, não a totalidade dos produtos de segurança do mercado. Os preços são referências de varejo, sem frete, instalação ou margem de revenda; não são atualizados automaticamente. O preço no orçamento pode ser editado.

Para refazer a pesquisa manualmente, execute `node scripts/import-catalog.mjs`, confira o JSON e as imagens, rode o build e envie as alterações. Esse comando faz consultas públicas e baixa as fotografias; ele não é executado no build da Cloudflare. As fontes podem mudar preços, disponibilidade ou estrutura de página.

Os orçamentos são salvos somente no localStorage do navegador e não sincronizam entre computadores. Limpar os dados do site remove os orçamentos. Use “Imprimir / Salvar PDF” para guardar uma cópia. Não há envio ao cliente ou autenticação nesta versão.
