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

## Navegação

A página inicial `/` abre o orçamento. O catálogo fica em `/produtos/`, com seleção de vários produtos e retorno ao orçamento. Os dados em edição ficam no sessionStorage da aba para preservar cliente, itens, valores e condições ao navegar entre as páginas. Os produtos selecionados são recebidos uma única vez, inclusive após recarregar. “Salvar orçamento” continua gravando a proposta no localStorage. Rascunhos da sessão não substituem o salvamento definitivo.

O layout usa navegação superior compacta, tons neutros com azul da marca e painéis recolhíveis para empresa e condições. Links antigos com `/#product-catalog` encaminham ao catálogo.

## Clientes

A página `/clientes/` cadastra nome/razão social, telefone, e-mail, endereço e observações no localStorage (`orcaseg-clients-v1`). Inclui busca, edição, arquivamento recuperável e restauração. Os cadastros ficam apenas no navegador, sem sincronização entre dispositivos.

“Usar no orçamento” e o seletor “Cliente cadastrado” preenchem os dados de contato mantendo itens, valores e demais campos do rascunho. O e-mail é incluído na impressão/PDF quando informado; observações internas do cadastro não são copiadas à proposta. Os orçamentos guardam os dados do cliente no momento do salvamento: editar ou arquivar um cadastro não altera propostas anteriores.

## Dados

O catálogo contém 473 itens/ofertas em 31 categorias, com consultas em 21 e 23/10/2026: câmeras, kits, gravadores, centrais de alarme, sensores de presença, abertura e barreira, sirenes, cercas elétricas, concertinas, baterias, cabos, fontes, conectores, fechaduras, interfones, automatizadores, armazenamento, nobreaks e acessórios. Fotografias reais ficam em `public/products/`; preços, condição de pagamento, URL da oferta, origem da imagem e data da consulta ficam em `src/data/products.json`. A foto acompanha o produto adicionado ao orçamento e à impressão/PDF.

Fontes: loja oficial Intelbras, revenda Intelbras Eletro, Detecta Company, TotalSeg e Kyoto Concertina. É uma seleção das ofertas com foto e preço públicos encontrados nessas fontes, não a totalidade dos produtos de segurança do mercado. Ofertas sem preço público ou fotografia verificável não foram cadastradas; a última ampliação registra os itens ignorados em `scripts/catalog-import-report.json`. Os preços são referências de varejo, sem frete, instalação ou margem de revenda; não são atualizados automaticamente. Cada cartão mostra a data da sua consulta. O preço no orçamento pode ser editado, e a embalagem segue a descrição da oferta (unidade, par, rolo ou kit).

Para refazer a pesquisa manualmente, execute `node scripts/import-catalog.mjs` e depois `node scripts/expand-catalog.mjs`, confira o JSON e as imagens, rode o build e envie as alterações. Para atualizar apenas as fontes da ampliação, execute somente o segundo comando. Esses comandos fazem consultas públicas e baixam as fotografias; não são executados no build da Cloudflare. As fontes podem mudar preços, disponibilidade ou estrutura de página. A busca aceita múltiplas palavras e desconsidera acentos; filtros por categoria e marca podem ser combinados.

Os orçamentos são salvos somente no localStorage do navegador e não sincronizam entre computadores. Limpar os dados do site remove os orçamentos. Use “Imprimir / Salvar PDF” para guardar uma cópia. Não há envio ao cliente ou autenticação nesta versão.
