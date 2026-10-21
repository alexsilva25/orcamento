# OrçaSeg

Site estático em Astro para criar orçamentos de equipamentos e serviços de segurança. Inclui cadastro do cliente, itens, desconto, despesas adicionais, condições, armazenamento no navegador e impressão em PDF.

## Desenvolvimento

Requer Node.js 22.23.4 ou superior e npm.

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
- Versão do Node: 22.23.4 (variável de build `NODE_VERSION`)
- Escolha a branch que contém o código.

O Astro gera HTML estático; não precisa de adaptador, banco de dados ou variáveis secretas. Cada push na branch conectada inicia uma publicação.

## Dados

Os orçamentos são salvos somente no localStorage do navegador e não sincronizam entre computadores. Limpar os dados do site remove os orçamentos. Use “Imprimir / Salvar PDF” para guardar uma cópia. Não há envio ao cliente ou autenticação nesta versão.
