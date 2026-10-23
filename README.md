# OrçaSeg — World Segurança Eletrônica

Interface Astro com orçamento como página principal, catálogo, cadastro de clientes e PDF minimalista. A API usa Cloudflare Pages Functions e o banco Cloudflare D1 `orcaseg-world`, pelo binding `DB` de `wrangler.toml`.

## Desenvolvimento

Node 25.0.0 e dependências fixadas em package-lock.json.

```sh
npm ci
npx wrangler d1 execute orcaseg-world --local --file migrations/0001_storage.sql --yes
npm run db:catalog -- --local
npm run dev:cloud
```

`npm run dev` serve somente a interface Astro. `dev:cloud` compila e inicia interface, API e D1 local. Use conta ou token fictício local, sem copiar senhas ou sessões de produção.

## Publicação

Pages conectado a alexsilva25/orcamento, branch codex/orcamento-seguranca. Build `npm run build`, saída `dist`, Node 25.0.0. Cada push publica interface e API da pasta functions/. O binding DB é configurado no wrangler.toml.

Nunca publique a pasta .local/: contém o link privado de ativação, bases de teste e possíveis backups. Não coloque credenciais em variáveis públicas.

## Banco e acesso

Tabelas: accounts, sessions, setup, rate_limits, products, clients, quotes, drafts e preferences.

Clientes e propostas são documentos JSON validados, com versão e data de atualização. Os itens ficam dentro da proposta, preservando preços e contato daquele momento. Dados da empresa são gravados em preferences ao salvar uma proposta. Rascunhos sincronizam após uma pausa na edição; a cópia temporária em sessionStorage preserva edições durante navegação e falhas de rede. O indicador informa quando o rascunho está na nuvem. Um conflito impede sobrescrever uma edição de outro dispositivo; salve sua proposta e atualize a página ou inicie um novo rascunho.

O sistema tem uma conta administrativa da empresa, sem cadastro público. Clientes, propostas, rascunhos e preferências exigem sessão. Apenas o catálogo é público.

O arquivo privado `.local/ativar-acesso.txt` contém o link inicial para o proprietário criar usuário e senha. O token fica no banco somente como hash e funciona uma vez. O fragmento do link é removido do endereço antes do formulário ser enviado.

Senhas usam PBKDF2-SHA256, sal individual e 100.000 iterações, limite Web Crypto do runtime. Sessões aleatórias de 256 bits usam cookie HttpOnly, Secure em HTTPS e SameSite=Strict, com validade de sete dias. O banco guarda o hash do token. Login, ativação e troca de senha têm limite de tentativas; mutações verificam a origem. Alterar a senha encerra outras sessões. A troca fica em Conta; recuperação administrativa depende do proprietário da conta Cloudflare.

Atualizações exigem a versão lida para evitar perda de alterações. Clientes podem ser arquivados/restaurados. A exclusão de proposta mantém uma marca no banco para impedir que importações antigas a recriem.

Após entrar, clientes e propostas antigos daquele navegador são importados de forma idempotente: IDs existentes não são sobrescritos. As cópias locais antigas são preservadas. Faça o primeiro acesso no navegador onde os cadastros antigos foram feitos e repita nos outros navegadores anteriormente usados, se necessário. Dados locais inválidos geram aviso e permanecem intactos.

O PDF é gerado a partir da proposta, sem guardar outro arquivo binário. Fotos permanecem na hospedagem; seus caminhos e fontes ficam no banco. Não há envio automático ao cliente.

## Testes e manutenção

`npm run test:database` cria um banco local isolado e verifica autenticação, sessões, CSRF, CRUD, conflitos, arquivamento/restauração, importação repetida, exclusão e catálogo. Nunca altera dados de produção.

Alterações de schema devem ficar em SQL versionado em migrations/, sem remover dados existentes por padrão. Aplique novas migrações explicitamente na conta correta antes de publicar código dependente delas.

Backup privado:

```sh
npx wrangler d1 export orcaseg-world --remote --output .local/backup.sql
```

O arquivo contém dados pessoais e hashes de acesso e deve ficar fora do Git. Confira D1 Time Travel no painel antes de restaurar versões.

## Catálogo

476 ofertas em 32 categorias, pesquisadas em 21 e 23/10/2026: câmeras, kits, gravadores, alarmes, sensores, cercas elétricas, concertinas, cabos, baterias, fontes, conectores, fechaduras, interfones, automatizadores, armazenamento, nobreaks e acessórios.

A página carrega o catálogo do D1 por /api/products. src/data/products.json é a fonte versionada de importação; fotos reais ficam em public/products/. Cada registro preserva preço, condição, fonte e data da pesquisa. A foto aparece na tela da proposta; o PDF usa tabela compacta sem fotos.

Fontes: loja oficial Intelbras, Intelbras Eletro, Detecta Company, TotalSeg, Kyoto Concertina, SEGCFTV, FuturaSeg e Zalon. A seleção não cobre todo o mercado. Preços de varejo não incluem frete, instalação ou margem e não se atualizam automaticamente. Ajuste o valor de venda na proposta; a embalagem segue o anúncio.

Para atualizar a pesquisa use scripts/import-catalog.mjs, expand-catalog.mjs e import-fence-cables.mjs. Confira JSON/fotos e execute `npm run db:catalog`, depois o build e o push. db:catalog atualiza produtos no D1 remoto sem tocar em clientes ou propostas; acrescente `-- --local` para desenvolvimento. A pesquisa não roda automaticamente no build. Consulte scripts/catalog-import-report.json para ofertas ignoradas.
