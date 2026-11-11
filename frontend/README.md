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

```powershell
npm run check
npm run build
npm run preview
```

O build verifica os tipos TypeScript e gera os arquivos de produção em `dist/`.
O comando `check` verifica a renderização das telas, o item ativo da navegação,
a busca, a categoria inicial, favoritos, detalhes de produtos, anúncios vendidos,
ofertas do vendedor, Meus Anúncios, chat, alterações persistidas e URLs inválidas.
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

## Dados desta etapa

O catálogo em `src/data/catalog.ts` é **demonstrativo**. As imagens ilustrativas e a fonte são locais; as fontes das fotos estão em `public/images/SOURCES.md`. Os favoritos são locais ao navegador, sem sincronização com uma conta. A conta demonstrativa de Matheus Fontes, os anúncios pessoais, métricas e conversas estão em `src/data/account.ts` e `src/data/chat.ts`; os contadores de visualizações e mensagens dos cards pessoais são exemplos.

Especificações, galerias, perfis, avaliações e disponibilidade dos vendedores em `src/data/productDetails.ts` também são demonstrativos. As recomendações exibem apenas os produtos ativos vinculados ao mesmo vendedor e excluem o produto atual. O desenho do mapa é ilustrativo.

Esta etapa implementa as novas telas do front. **Ainda não há integração com a API Django, autenticação ou comunicação em tempo real**. As operações de anúncios e chat funcionam apenas neste navegador. Nenhuma mensagem é enviada a outra pessoa e nenhum anúncio é publicado no backend. As três notificações exibidas são orientações de boas-vindas.

Denúncias, configurações e suporte continuam com avisos de indisponibilidade. Não são enviadas denúncias.

Os anúncios e conversas são salvos em chaves versionadas de `localStorage`, com validação na recuperação e avisos de falta de espaço. Dados corrompidos não são sobrescritos até uma alteração do usuário. Há limites locais de 500 anúncios, 500 conversas e 2.000 mensagens por conversa. Ao limpar os dados do navegador, os exemplos iniciais são restaurados.

O backend existente documenta as rotas autenticadas, os filtros e a paginação em `../backend/README.md`. Ao integrar, substitua os dados demonstrativos pelos resultados da API, mapeando os campos de catálogo e preservando os estados de carregamento, erro e autenticação.
