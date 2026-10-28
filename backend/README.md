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
docker compose up -d
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

O Django Admin fica em `/admin/`. Crie um administrador com
`python manage.py createsuperuser`.

Cadastre categorias/subcategorias, campi e locais de retirada pelo painel antes
de testar a publicação. Esses dados dependem da instituição; nenhum campus fictício
é criado automaticamente. Anúncios novos no painel também começam como rascunho;
envie fotos pela API antes de ativá-los. Destaques podem ser definidos no painel.

Antes de publicar, defina `DJANGO_SECRET_KEY` forte, `DJANGO_DEBUG=False` e
`DJANGO_ALLOWED_HOSTS` no ambiente.
