# Uniplace API

Backend REST em Django para autenticação de alunos e uma base inicial de CRUD
de posts. O padrão é SQLite; o projeto também pode usar PostgreSQL no Docker
enquanto o servidor Django roda localmente.

## Executar localmente com SQLite

No PowerShell, na pasta do projeto:

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
de `access`. O token `access` tem validade limitada; faça login novamente
quando expirar.

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

## Posts

Todas as rotas de posts exigem JWT e cada usuário só acessa os próprios posts.

- `GET /api/posts/` — listar
- `POST /api/posts/` — criar (`title`, `content`)
- `GET /api/posts/{id}/` — visualizar
- `PUT/PATCH /api/posts/{id}/` — editar
- `DELETE /api/posts/{id}/` — excluir

## Administração

O Django Admin fica em `/admin/`. Crie um administrador com
`python manage.py createsuperuser`.

Antes de publicar, defina `DJANGO_SECRET_KEY` forte, `DJANGO_DEBUG=False` e
`DJANGO_ALLOWED_HOSTS` no ambiente.
