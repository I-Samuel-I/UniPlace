# Uniplace API

Backend REST em Django para autenticação de alunos e um marketplace de anúncios,
com catálogo, filtros, rascunhos, fotos e gerenciamento por usuário.
O padrão é SQLite; o projeto também pode usar PostgreSQL no Docker
enquanto o servidor Django roda localmente.

## Executar localmente com SQLite

No PowerShell, na pasta `backend`:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Esse modo usa SQLite se você não tiver um `.env` configurando outro banco.
Se já copiou `.env.example`, altere `DB_ENGINE` para `sqlite` antes de iniciar.

## PostgreSQL no Docker e Django local

Requer Docker Desktop instalado e em execução. No PowerShell, abra a pasta do
projeto e rode:

```powershell
Copy-Item .env.example .env
```

Se já existir um `.env`, não o substitua: acrescente ou ajuste nele as variáveis
`DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST` e `DB_PORT` conforme
os valores abaixo. O arquivo `.env` é local e não deve ser enviado ao Git.

```dotenv
DB_ENGINE=postgresql
DB_NAME=uniplace
DB_USER=uniplace
DB_PASSWORD=uniplace_dev_password
DB_HOST=127.0.0.1
DB_PORT=5432
```

Instale as dependências no ambiente virtual, se ainda não fez isso:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Suba o banco e aguarde o status `healthy`:

```powershell
docker compose up -d db
docker compose ps
```

Com o banco saudável, crie as tabelas e inicie a API:

```powershell
python manage.py migrate
python manage.py runserver
```

O Django roda no Windows e se conecta à porta `5432` exposta pelo container.
Para desligar o banco sem apagar os dados, use `docker compose down`. Os dados
persistem no volume `uniplace_postgres_data`; `docker compose down -v` apaga
esse volume e todos os dados do banco.

### Testar no Insomnia

Crie uma requisição JSON com `Content-Type: application/json` para
`http://127.0.0.1:8000/api/auth/register/`:

```json
{
  "name": "Samuel Gomes",
  "email": "samuel@ads.fiponline.edu.br",
  "password": "UmaSenha-Forte-2026!",
  "password_confirmation": "UmaSenha-Forte-2026!"
}
```

Depois faça login em `POST http://127.0.0.1:8000/api/auth/login/`:

```json
{
  "email": "samuel@ads.fiponline.edu.br",
  "password": "UmaSenha-Forte-2026!"
}
```

A resposta contém os tokens `access` e `refresh`. Para testar `/api/posts/`,
configure o Auth da requisição no Insomnia como **Bearer Token** e use o valor
de `access`. Quando o token expirar, use `/api/auth/refresh/` ou faça login novamente.

Para verificar o banco no terminal:

```powershell
docker compose logs -f db
```

Interrompa o acompanhamento dos logs com `Ctrl+C`; isso não encerra o container.

## Autenticação

As rotas usam JSON. O cadastro aceita somente e-mails cujo domínio termine em
`.fiponline.edu.br` e tenha um subdomínio de curso, por exemplo
`samuel@ads.fiponline.edu.br`. O e-mail é salvo em letras minúsculas; a senha é
validada pelos validadores do Django e armazenada com hash.

### `POST /api/auth/register/`

```json
{
  "name": "Samuel Gomes",
  "email": "samuel@ads.fiponline.edu.br",
  "password": "UmaSenha-Forte-2026!",
  "password_confirmation": "UmaSenha-Forte-2026!"
}
```

Retorna `201 Created` com `id`, `name` e `email`.

### `POST /api/auth/login/`

Envie `email` e `password`. A resposta contém tokens JWT `access` e `refresh`,
além dos dados básicos do usuário. Para rotas autenticadas, use
`Authorization: Bearer <access>`.

### `POST /api/auth/password/`

Esta rota **troca a senha de um usuário já autenticado**; não é recuperação
“esqueci minha senha”. Exige o token JWT, a senha atual, a nova senha e sua
confirmação. Recuperação de senha sem login precisa de validação por código ou
link enviado ao e-mail institucional, fluxo que não está habilitado aqui.

### `POST /api/auth/refresh/`

Envie `{"refresh": "<token refresh do login>"}` para receber um novo `access`.

## Anúncios

Todas as rotas abaixo exigem JWT. O catálogo é compartilhado entre os usuários
autenticados e retorna apenas anúncios `active`. Somente o autor pode editar,
excluir, enviar/remover fotos e alterar o status. O autor pode consultar o
próprio anúncio em qualquer status; outros usuários recebem `404` para anúncios
fora do catálogo. A exclusão é lógica e registra quem excluiu e a data.

### Rotas

| Método | Rota | Função |
| --- | --- | --- |
| GET | `/api/posts/` | Catálogo de anúncios ativos |
| POST | `/api/posts/` | Criar rascunho (aceita `{}`) |
| GET | `/api/posts/{id}/` | Detalhes, fotos e dados públicos do vendedor |
| PUT/PATCH | `/api/posts/{id}/` | Editar o próprio anúncio |
| DELETE | `/api/posts/{id}/` | Excluir o próprio anúncio |
| PATCH | `/api/posts/{id}/status/` | Publicar ou mudar o status |
| POST | `/api/posts/{id}/images/` | Enviar uma foto por requisição multipart |
| PATCH | `/api/posts/{id}/images/{image_id}/` | Alterar ordem ou capa |
| DELETE | `/api/posts/{id}/images/{image_id}/` | Remover uma foto |
| GET | `/api/me/posts/` | Meus anúncios de todos os status |
| GET | `/api/me/posts/summary/` | Contadores para as abas de Meus anúncios |
| GET | `/api/posts/categories/` | Categorias principais com `children` |
| GET | `/api/posts/categories/{id}/` | Detalhe de categoria ou subcategoria |
| GET | `/api/campuses/` | Campi ativos |
| GET | `/api/campuses/{id}/` | Detalhe de campus |
| GET | `/api/pickup-locations/` | Locais de retirada ativos |
| GET | `/api/pickup-locations/{id}/` | Detalhe de local de retirada |

Anúncios, categorias, campi, locais e fotos usam **UUID** nas URLs, nos campos de
relacionamento e nas respostas. `pkid` é interno. O identificador de usuário
continua numérico, como no cadastro e login existentes.

### Fluxo de criação e publicação

1. Consulte categorias, campi e locais de retirada para obter os UUIDs.
2. Crie um rascunho com `POST /api/posts/`. Os campos podem ser preenchidos em
   etapas com `PATCH /api/posts/{id}/`.
3. Envie as fotos usando `POST /api/posts/{id}/images/`.
4. Publique usando `PATCH /api/posts/{id}/status/` com `{"status": "active"}`.

Exemplo de corpo para criar ou editar (substitua os UUIDs pelos do seu banco):

```json
{
  "title": "MacBook Air M1 8GB 256GB",
  "content": "Usado, com carregador original e em bom estado.",
  "price": "3800.00",
  "category": "<UUID da categoria ou subcategoria>",
  "kind": "product",
  "condition": "like_new",
  "campus": "<UUID do campus>",
  "pickup_location": "<UUID do local de retirada>",
  "accepts_negotiation": true,
  "accepts_trade": false,
  "attributes": {"Marca": "Apple", "Memória RAM": "8 GB", "Armazenamento": "256 GB"},
  "tags": ["Apple", "MacBook", "Notebook"]
}
```

Para publicar, são obrigatórios título, descrição (`content`), categoria,
preço não negativo, campus, local de retirada pertencente ao campus e pelo
menos uma foto. Produtos também exigem condição. Serviços (`kind=service`)
dispensam condição; ambos aceitam preço zero. Não há pagamento pela plataforma.

`attributes` aceita até 30 pares de textos (chaves de até 80 caracteres e valores
de até 500); `tags` aceita até 20 textos de até 50 caracteres. Autor, datas e
destaque são definidos pelo servidor; somente o administrador define `is_featured`.

Valores de `condition`: `new`, `like_new`, `used`.

Status e transições:

- `draft` → `active`;
- `active` → `paused`, `sold` ou `expired`;
- `paused` → `active`, `sold` ou `expired`;
- `sold` / `expired` → `active`.

Repetir o status atual é permitido. Publicar ou reativar sempre valida os dados.
A primeira publicação define `published_at`; reativar preserva essa data.
O status `expired` é manual nesta etapa, sem expiração automática por prazo.
Alterações de status usam exclusivamente `/status/`; novos anúncios sempre são
rascunhos. Editar um anúncio ativo também preserva os requisitos de publicação.

### Fotos

No Insomnia, selecione **Multipart Form**, com `image` do tipo arquivo e,
opcionalmente, `position` (inteiro não negativo) e `is_cover` (booleano).
São permitidas até **12 fotos**, cada uma de até **5 MB**, em JPEG, PNG ou WebP.
O conteúdo do arquivo é validado, não apenas a extensão.

A primeira foto é a capa. Para trocar, faça PATCH na foto desejada com
`{"is_cover": true}`. `{"position": 0}` altera a ordem na galeria. Ao excluir
a capa, a próxima foto na ordem assume seu lugar. A última foto de um anúncio
ativo não pode ser removida: pause o anúncio primeiro. As respostas de anúncios
incluem `images` e `cover`, com URLs dos arquivos.

Os arquivos são gravados em `backend/media/`, ignorado pelo Git. Em desenvolvimento,
use `DJANGO_DEBUG=True` para o Django servir `/media/`; em produção configure o
servidor de mídia. URLs de mídia devem ser tratadas como acessíveis a quem as possui;
a autenticação das APIs não protege o download direto desses arquivos.
A remoção explícita de uma foto remove seu arquivo após o commit; a exclusão
lógica do anúncio preserva as fotos junto ao registro.

### Busca, filtros e paginação

`/api/posts/` e `/api/me/posts/` aceitam:

| Parâmetro | Exemplo / comportamento |
| --- | --- |
| `search` | Busca por título, descrição, categoria ou tags |
| `category` | UUID; categoria principal inclui suas subcategorias |
| `price_min`, `price_max` | Valores decimais não negativos |
| `kind` | `product` ou `service` |
| `condition` | `new`, `like_new`, `used`; repita para múltiplos valores |
| `campus`, `pickup_location` | UUIDs; repita para múltiplos locais |
| `accepts_negotiation`, `accepts_trade` | `true` ou `false` |
| `has_photos` | Presença de fotos; não certifica autenticidade das imagens |
| `featured` | Filtra pelo destaque definido pelo administrador |
| `seller` | ID numérico do vendedor; útil para “Mais anúncios do vendedor” |
| `status` | Apenas em `/api/me/posts/`; omita para todos os status |
| `ordering` | `price`, `-price`, `created_at`, `-created_at`, `published_at`, `-published_at`, `title`, `-title` |
| `page`, `page_size` | Padrão de 20 itens; máximo de 100 por página |

Exemplo:

```text
/api/posts/?search=notebook&price_max=3000&condition=new&condition=like_new&ordering=-created_at&page=1
```

As listagens de anúncios retornam `{"count": 42, "next": "...", "previous": null, "results": [...]}`.
O padrão de ordenação é mais recentes primeiro. Filtros inválidos retornam `400`.
Detalhes e mutações não dependem dos filtros da listagem.

`/api/me/posts/summary/` retorna, por exemplo:

```json
{"total": 6, "draft": 0, "active": 5, "paused": 0, "sold": 0, "expired": 1}
```

Os contadores respeitam busca e filtros, mas ignoram `status` e paginação para
que todas as abas mostrem suas quantidades. Anúncios excluídos não são contados.

As listas de referência retornam arrays sem paginação. Use
`/api/posts/categories/?parent=<UUID>` para listar subcategorias e
`/api/pickup-locations/?campus=<UUID>` para os locais do campus.

### Respostas e erros

O anúncio retorna os campos do exemplo, `id`, `author` (nome), `seller`
(`id`, `name`, `member_since`, sem e-mail), `category_name`, `campus_name`,
`pickup_location_name`, `status`, `is_featured`, `images`, `cover`, `published_at`,
`created_at` e `updated_at`. Preços são strings decimais, como `"3800.00"`.

- `201`: rascunho ou foto criado;
- `200`: consulta, edição ou mudança de status;
- `204`: exclusão;
- `400`: campos ou filtros inválidos, publicação incompleta ou transição proibida;
- `401`: JWT ausente, inválido ou expirado;
- `404`: registro inexistente ou indisponível para o usuário.

Os erros de publicação são associados aos campos, por exemplo:

```json
{"price": ["Este campo é obrigatório para publicar."], "images": ["Adicione pelo menos uma foto antes de publicar."]}
```

### Atualização de instalações existentes

Instale novamente `requirements.txt` (inclui Pillow para fotos) e execute
`python manage.py migrate`. A migração `0005_marketplace` preserva os posts
existentes como rascunhos; complete os dados e fotos antes de publicá-los.
Integrações antigas precisam trocar chaves numéricas de posts/categorias por UUID
e ler `results` na listagem paginada. “Meus anúncios” passa a usar `/api/me/posts/`.

### Escopo desta etapa

Implementados catálogo, detalhes, filtros, home via anúncios recentes/destaques,
rascunhos, publicação, fotos, categorias/subcategorias, localização e Meus anúncios.
Chat, favoritos, denúncias, avaliações, presença online e notificações ficam para
a próxima etapa. Contadores de visualizações e mensagens não são simulados.

## Verificação

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test
```

Os testes usam banco isolado e diretórios temporários para os uploads.

## Administração

### Configurações da conta

`GET/PATCH /api/me/` consulta o perfil e altera somente o nome. E-mail, foto,
permissões e versão de sessão não podem ser alterados por esse PATCH.
`PUT /api/me/avatar/` recebe multipart com `avatar` (JPG, PNG ou WebP, até 5 MB
e 16 megapixels). A imagem é normalizada em WebP de até 512 px, sem metadados;
`DELETE` nessa rota remove a foto. URLs da foto são públicas e retornadas no
perfil, login, vendedor e contato do chat.

`GET /api/me/export/` exporta os dados da própria conta em JSON, sem senhas ou
tokens. `POST /api/me/sessions/revoke/` exige `current_password`, invalida os
tokens anteriores e retorna um novo par para o navegador atual. A troca de
senha também invalida as sessões anteriores e retorna os novos tokens.

`DELETE /api/me/` exige `current_password` e `confirmation: "EXCLUIR"`.
Remove os arquivos, mensagens enviadas, favoritos, notificações e chamados do
usuário; apaga os dados identificadores do perfil e dos anúncios, desativa o
acesso e invalida suas sessões. Referências sem nome, foto ou e-mail são
mantidas para preservar as mensagens dos demais participantes. Conversas com
uma conta excluída permanecem legíveis para os outros participantes e não
aceitam novas mensagens. Os testes de exclusão usam banco e mídia isolados.

O Django Admin fica em `/admin/`. Crie um administrador com
`python manage.py createsuperuser`.

Para começar com um conjunto inicial de categorias, campi e locais de retirada,
rode `python manage.py seed_reference_data`. O comando pode ser repetido sem
duplicar registros; os campi e locais são nomes de exemplo, ajuste-os no painel.
Os slugs das categorias principais são os usados pelos filtros do frontend.

Cadastre categorias/subcategorias, campi e locais de retirada pelo painel antes
de testar a publicação. Esses dados dependem da instituição; nenhum campus fictício
é criado automaticamente. Anúncios novos no painel também começam como rascunho;
envie fotos pela API antes de ativá-los. Destaques podem ser definidos no painel.

Antes de publicar, defina `DJANGO_SECRET_KEY` forte, `DJANGO_DEBUG=False` e
`DJANGO_ALLOWED_HOSTS` no ambiente.


## Integração completa e Docker (Windows e Linux)

O Compose também inicia o backend Django e o frontend Vite com recarregamento
no desenvolvimento. Crie `.env` a partir de `.env.example` sem substituir um
arquivo local existente.

No Docker Desktop com o projeto salvo no Windows, configure
`CHOKIDAR_USEPOLLING=true` no `.env` para detectar alterações no frontend.
`CHOKIDAR_INTERVAL=300` define o intervalo da verificação em milissegundos.

Execute na pasta `backend`:

```bash
docker compose up -d --build --wait
docker compose ps
docker compose logs -f backend frontend
```

O banco é persistente no volume já existente, as fotos ficam em `backend/media`
e as migrações/dados de referência rodam ao iniciar o backend. O frontend abre
em http://localhost:5173 e `/api/health/` verifica a conexão com o banco.
O Compose usa PostgreSQL 17 na porta local `5432` por padrão; `DB_PORT` no `.env`
altera somente a porta publicada no Windows/Linux. Dentro do Docker, o backend
acessa `db:5432`. Nunca troque a versão principal de um volume PostgreSQL
existente sem migrar seus dados.

Opcionalmente, `.docker-wheels/` pode conter wheels das dependências testadas
para Python 3.12/Linux: o Dockerfile os instala sem rede quando presentes.
Esse cache é local e ignorado pelo Git; sem ele, a imagem instala `requirements.txt`.

### APIs da conta e comunidade

Todas exigem autenticação JWT, exceto a verificação de saúde.

| Método | Rota | Função |
| --- | --- | --- |
| GET | `/api/health/` | Saúde do backend e do banco |
| GET/PATCH | `/api/me/` | Consultar perfil e atualizar nome; e-mail não é alterado |
| GET | `/api/me/favorites/` | UUIDs de favoritos acessíveis da conta |
| PUT/DELETE | `/api/me/favorites/{post_uuid}/` | Adicionar/remover favorito de forma idempotente |
| GET/POST | `/api/conversations/` | Listar conversas próprias/iniciar conversa por `post_id` |
| POST | `/api/conversations/{uuid}/messages/` | Enviar texto e/ou anexo privado |
| POST | `/api/conversations/{uuid}/read/` | Confirmar leitura das mensagens recebidas |
| PATCH | `/api/conversations/{uuid}/favorite/` | Atualizar `favorite` da conta |
| GET/POST | `/api/me/notifications/` | Listar notificações/marcar todas como lidas |
| PATCH/DELETE | `/api/me/notifications/{uuid}/` | Alterar leitura com `{"read": true/false}` ou excluir um aviso próprio |
| GET/POST | `/api/me/tickets/` | Acompanhar/criar chamado ou denúncia |

A listagem de notificações aceita `status=all|unread|read`,
`kind=all|message|post|support|system`, `page` e `page_size` (1–100, padrão 20).
Retorna `results`, `count` filtrado, `page`, `page_size`, `has_next`,
`total`, `unread` e contagens por categoria em `kinds` da conta inteira.
O POST marca todas as categorias/páginas como lidas; o PATCH altera somente o
aviso indicado. Excluir uma notificação preserva a conversa, anúncio ou chamado.
Mensagens recebidas, publicação de anúncios e respostas/status de chamados no
Admin geram avisos automaticamente. A página fica em `/notificacoes`; o sino
mostra os cinco avisos mais recentes. O frontend consulta atualizações a cada
10 segundos enquanto a aba está visível e ao voltar para a janela.

Mensagens aceitam `text` até 5.000 caracteres e `attachment` opcional com
`name`, `type` e `url` no formato data URL base64. Anexos têm limite de 2 MB e
conteúdo JPEG/PNG/WebP/PDF validado no servidor. Não são expostos em URLs públicas.
Somente comprador e vendedor acessam a conversa. O mesmo comprador/anúncio
reutiliza a mesma conversa. O histórico continua disponível após pausar ou
excluir logicamente o anúncio; novas conversas exigem anúncio ativo.

Chamados aceitam `kind` (`support` ou `report`), `subject` e `message`, além de
`post_id` ou `conversation_id` opcionais. Referências privadas só são aceitas
para quem já tem acesso. Status e resposta são editados pela equipe no Admin;
o usuário só acessa seus próprios chamados e recebe notificação das atualizações.
Para criar o administrador local:

```bash
docker compose exec backend python manage.py createsuperuser
```

Os filtros booleanos de anúncios ausentes significam **sem filtro**, inclusive
`has_photos`. `?has_photos=false` é uma escolha explícita de anúncios sem foto.
Isso evita ocultar os anúncios com foto imediatamente após a publicação.
