# UniPlace — Frontend

Interface em React, TypeScript e Vite baseada nas referências das telas inicial, exploração de anúncios, detalhes do produto, Meus Anúncios e chat.

## Executar

Requer Node.js 20.19+ ou 22.12+ e npm.

```powershell
cd frontend
npm install
npm run dev
```

Abra o endereço exibido pelo Vite, normalmente `http://127.0.0.1:5173`.

O front depende da API Django. Em outro terminal, na pasta `backend`, com
`DJANGO_DEBUG=True` no `.env` (necessário para o Django servir as fotos):

```powershell
python manage.py migrate
python manage.py seed_reference_data
python manage.py runserver
```

O Vite repassa `/api` e `/media` para `http://127.0.0.1:8000` (veja
`vite.config.ts`), então não é preciso configurar CORS em desenvolvimento.

```powershell
npm run check
npm run build
npm run preview
```

O build verifica os tipos TypeScript e gera os arquivos de produção em `dist/`.
O comando `check` (`scripts/check-render.mjs`) foi escrito para os dados de
demonstração e **está desatualizado**: agora o app exige login e carrega os
anúncios da API, então as verificações precisam ser refeitas com a API simulada.
O servidor de produção deve direcionar as rotas do front para `index.html`.

## Telas e comportamento

- `/`: início, com carrossel, categorias e anúncios em destaque. O menu marca **Início** como ativo.
- `/explorar`: catálogo com busca, categorias, faixa de preço, condições, retirada, fotos, negociação, troca, ordenação e visualização em grade ou lista. O menu marca **Explorar Anúncios** como ativo.
- `/explorar?q=notebook`: busca por título, categoria e descrição, ignorando diferenças de acentuação.
- `/explorar?categoria=eletronicos`: categoria selecionada a partir da Home.
- `/favoritos`: anúncios salvos no navegador em `localStorage`.
- `/anuncios/:id`: página completa de produto, com galeria, informações, vendedor, localização e mais anúncios do mesmo vendedor. O menu mantém **Explorar Anúncios** ativo.
- `/anuncios/macbook-air-m1-8gb-256gb`: produto de exemplo da nova referência.
- `/explorar?vendedor=matheus-fontes`: ofertas ativas do vendedor.
- `/meus-anuncios` e `/perfil`: painel pessoal com busca, filtros por status e categoria, ordenação e ações de criar, editar, excluir, pausar, reativar e marcar como vendido.
- `/chat`: lista com busca e filtros de conversas não lidas ou favoritas, acompanhada do estado inicial de seleção.
- `/chat/matheus-freitas`: conversa de exemplo com histórico, compositor de mensagens e painel de contato/produto.

Os cards abrem a página do produto, com URL que pode ser copiada ou aberta em outra aba. A navegação funciona com os botões voltar/avançar do navegador. O menu lateral e os filtros se adaptam a telas menores.
O anúncio vendido da referência aparece identificado na Home e fica fora do catálogo de ofertas ativas.

A galeria permite selecionar miniaturas e ampliar as fotos; na ampliação, as setas do teclado também trocam a imagem. Compartilhar usa o compartilhamento nativo ou copia o link; quando o navegador não permite esses recursos, exibe o endereço para cópia manual. O perfil abre os dados do vendedor e o mapa abre uma busca em outra aba. Anúncios vendidos não permitem iniciar conversa.

O menu do avatar abre o painel pessoal. Meus Anúncios começa com seis exemplos: cinco ativos e um expirado. Alterar título, preço, foto ou status também atualiza o catálogo e os detalhes. A exclusão exige confirmação e retira o item do catálogo e dos favoritos; o histórico de conversa permanece, identificando o anúncio como indisponível. Fotos locais aceitam JPEG, PNG e WebP até 2 MB, com validação de formato e decodificação.

O botão de conversar no produto abre o chat correspondente; nos próprios anúncios, abre uma conversa existente com um comprador. Conversas próprias sem interessados não criam um chat consigo mesmo. O chat permite mensagens locais, anexos JPEG/PNG/WebP/PDF de até 2 MB, favoritos e leitura de mensagens. Enter salva uma mensagem; Shift+Enter insere uma quebra de linha. Não há respostas automáticas nem confirmação real de entrega/leitura.

## Integração com a API

- **Acesso:** sem sessão, o app mostra a tela de login e cadastro
  (`src/pages/AuthPage.tsx`). Os tokens JWT ficam em `localStorage`; o token de
  acesso é renovado automaticamente e, se a renovação falhar, o usuário volta ao login.
- **Cliente HTTP:** `src/lib/api.ts` (requisições, renovação do token e mensagens
  de erro) e `src/data/session.ts` (entrar, cadastrar, sair).
- **Anúncios:** `src/data/marketplace.ts` carrega o catálogo de anúncios ativos
  (`/api/posts/`), os anúncios do usuário (`/api/me/posts/`), categorias, campi e
  locais de retirada, e converte as respostas para o formato usado pelas telas.
  A busca e os filtros continuam sendo aplicados no navegador sobre até 500
  anúncios; os filtros equivalentes da API podem substituí-los quando o volume crescer.
- **Meus Anúncios:** criar, editar, publicar, pausar, reativar, marcar como
  vendido e excluir chamam a API. Publicar cria o rascunho, envia a foto e ativa o
  anúncio; se uma etapa falhar, o anúncio fica salvo como rascunho. O formulário
  envia uma foto por vez (a nova vira a capa); a API aceita até 12 por anúncio.
- **Categorias:** as telas agrupam os anúncios pelo `slug` da categoria principal.
  Os atalhos da Home e os grupos de Explorar (`src/data/catalog.ts`) esperam os
  slugs criados por `seed_reference_data` (`eletronicos`, `livros`, `moveis`...).

## O que ainda é local

- **Chat:** as conversas continuam de exemplo e salvas só neste navegador
  (`src/data/chat.ts`). Nenhuma mensagem chega a outra pessoa.
- **Favoritos:** salvos em `localStorage`, sem sincronização com a conta.
- **Notificações, denúncias, configurações e suporte:** exibem avisos fixos.
- **Avaliações e presença do vendedor:** não existem na API e por isso não
  aparecem nos anúncios reais.
- **Perfil:** `/perfil` abre Meus Anúncios; ainda não há edição de dados pessoais.

Os produtos de `src/data/catalog.ts` e os detalhes de `src/data/productDetails.ts`
são dados de demonstração usados apenas pelas conversas de exemplo.
