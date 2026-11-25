# UniPlace — Frontend

React, TypeScript e Vite integrados à API Django. O catálogo, os anúncios pessoais,
favoritos, conversas, notificações, perfil e chamados são persistidos no backend.
Não há contas nem conversas de demonstração na interface autenticada.

## Ambiente completo com Docker

Na pasta `backend`, com o `.env` configurado:

```bash
docker compose up -d --build --wait
```

- Frontend: http://localhost:5173
- API e saúde: http://localhost:8000/api/health/
- Administração de chamados e cadastros: http://localhost:8000/admin/

Crie sua conta em **Cadastre-se**, com e-mail de um curso, como
`nome@ads.fiponline.edu.br`. A administração exige uma conta de administrador.
Os containers usam recarregamento automático do código. PostgreSQL usa volume
persistente; fotos ficam em `backend/media`, compartilhada com o container.

```bash
cd backend
docker compose ps
docker compose logs -f backend frontend
docker compose restart backend frontend
```

Não use `docker compose down -v` se quiser manter o banco.

## Desenvolvimento sem containers para o código

Node.js 20.19+ ou 22.12+, Python 3.12 e dependências de `../backend/requirements.txt`:

```bash
cd frontend
npm install
npm run dev
```

Em outro terminal:

```bash
cd backend
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_reference_data
.venv/bin/python manage.py runserver
```

O Vite encaminha `/api` e `/media` para o Django em `127.0.0.1:8000`.
No Docker, `API_TARGET=http://backend:8000` faz a mesma integração.

## Recursos

- `/`: anúncios ativos, novidades e categorias.
- `/explorar`: busca, filtros, ordenação e ofertas por vendedor.
- `/anuncios/:uuid`: fotos, dados do produto, vendedor, favoritos, conversa e denúncia.
- `/meus-anuncios`: criação com foto, edição, pausa, reativação, venda e exclusão.
  Publicações só são confirmadas após a API aceitar a mudança de status.
  Uma falha no envio da foto ou na publicação mantém o rascunho para retomar.
- `/favoritos`: favoritos privados por conta, preservados entre navegadores.
- `/chat` e `/chat/:uuid`: conversas privadas entre comprador e vendedor,
  histórico persistente, leitura, favoritos da conversa e anexos JPG/PNG/WebP/PDF.
  As mensagens atualizam a cada cinco segundos e quando a janela recebe foco.
  A presença online não é monitorada.
- `/perfil` e `/configuracoes`: nome da conta e alteração de senha.
- Essas duas rotas também oferecem foto de perfil, e-mail institucional somente
  para leitura, download dos próprios dados em JSON, encerramento de outras
  sessões e exclusão com confirmação de senha e a palavra `EXCLUIR`.
- `/termos-de-uso` e `/politica-de-privacidade`: documentos públicos de exemplo
  para apresentação acadêmica, acessíveis pelas configurações e pelo login.
  Os textos editáveis ficam em `src/data/legal.ts`.
- `/suporte`: categorias e motivos prontos para dúvidas, problemas e denúncias,
  além de outros assuntos com descrição livre. Mostra uma prévia e abre o WhatsApp
  do suporte em `(83) 9 9606-7677` com a mensagem preenchida; o usuário confirma o
  envio no WhatsApp. Os contatos iniciados por essa página são acompanhados por lá.
  Chamados e denúncias registrados dentro da plataforma continuam disponíveis
  na seção de solicitações anteriores, com respostas da equipe pelo Django Admin.
- `/notificacoes`: histórico paginado por conta com filtros de leitura e categoria,
  leitura individual ou em lote e exclusão de avisos. O sino mostra os cinco avisos
  mais recentes e abre o anúncio, conversa ou suporte correspondente. Marcar uma
  conversa como lida também atualiza os avisos e o contador do sino.

Fotos de anúncio: até 5 MB, validadas também no servidor. Anexos de chat: até 2 MB,
validados por conteúdo e acessíveis somente aos participantes pela API autenticada.
Os filtros opcionais só são enviados/aplicados quando escolhidos. O catálogo lê
as páginas da API sem o limite silencioso anterior de 500 itens e se atualiza ao
receber foco e a cada 30 segundos. Notificações e favoritos sincronizam a cada 10 segundos.

Tokens JWT ficam no navegador e são renovados automaticamente. Os dados pessoais
não são compartilhados entre contas. Favoritos e mensagens não dependem de localStorage.

A rodinha do mouse usa rolagem suave com inércia e desaceleração gradual. O movimento
cede ao teclado, ao toque e à navegação; áreas com rolagem própria mantêm o controle
nativo. A preferência do dispositivo por movimento reduzido também é respeitada.

URLs que não correspondem a uma rota exibem uma página 404 pública, com atalhos
para o início, anúncios e suporte. Ela também funciona sem sessão ou acesso à API.

## Verificações

```bash
npm run check
npm run build
```

`check` renderiza os componentes reais com fixtures exclusivas de testes e verifica
rotas, filtros, anúncios, autenticação, erros e concorrência na renovação de sessão.
`build` verifica os tipos e gera `dist`. Em hospedagem estática, as rotas do frontend
precisam retornar `index.html`; a API e a mídia precisam continuar encaminhadas ao Django.
