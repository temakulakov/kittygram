# Kittygram

Учебный проект: сервис для владельцев котиков на Django REST Framework с фронтендом на React.

Кроме котиков и достижений, добавлены встречи с ограниченным числом мест. Если мест нет, запись попадает в лист ожидания, а при отказе участника место получает первый из очереди.

Стек: Python 3.12, Django 5.1, DRF, Djoser, PostgreSQL, Gunicorn, Nginx, Docker Compose.

Зависимости бэкенда — `backend/requirements.txt` (Django, djangorestframework, djoser, djangorestframework-simplejwt, django-filter, drf-spectacular, Pillow, psycopg2-binary, gunicorn), фронтенда — `frontend/package.json` (React 17, react-router-dom 5).

В интерфейсе есть лента котиков с поиском и фильтром по цвету, страница котика, форма с загрузкой фото, список встреч, страница встречи с записью, листом ожидания и отменой записи, раздел «Мои записи».

## Запуск

```bash
git clone https://github.com/temakulakov/kittygram.git
cd kittygram
cp .env.example .env
docker compose up -d --build
```

Проект откроется на http://localhost:9000, документация API — на `/api/docs/` (Swagger) и `/api/redoc/`.

Тестовые данные и администратор:

```bash
docker compose exec backend python manage.py load_demo_data
docker compose exec backend python manage.py createsuperuser
```

`load_demo_data` создаёт пользователей `anna`, `boris`, `vera`, `gleb` с паролем `KittyPass2026`.

Без Docker (SQLite):

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
DJANGO_DEBUG=True python manage.py migrate
DJANGO_DEBUG=True python manage.py runserver
```

## Переменные окружения

Пример — `.env.example`.

| Переменная | Назначение |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | БД; без `POSTGRES_DB` используется SQLite |
| `DB_HOST`, `DB_PORT` | адрес БД |
| `DJANGO_SECRET_KEY`, `DJANGO_DEBUG` | настройки Django |
| `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS` | разрешённые хосты |
| `GATEWAY_PORT` | порт Nginx, по умолчанию 9000 |

## API

Авторизация: `Authorization: Token <токен>` (`/api/token/login/`) или `Bearer <JWT>` (`/api/jwt/create/`).

| URL | Методы | Доступ |
|---|---|---|
| `/api/users/`, `/api/users/me/` | POST, GET | регистрация — все |
| `/api/cats/`, `/api/cats/{id}/` | CRUD | изменение — только хозяин |
| `/api/achievements/` | GET, POST | авторизованные |
| `/api/events/`, `/api/events/{id}/` | CRUD | чтение — все, изменение — организатор |
| `/api/events/{id}/join/`, `leave/` | POST, `{"cat": id}` | авторизованные, только свой котик |
| `/api/events/{id}/cancel/` | POST | организатор |
| `/api/events/{id}/participants/`, `waitlist/` | GET | все |
| `/api/events/my/`, `/api/registrations/` | GET | авторизованные |

Фильтры встреч: `city`, `date_from`, `date_to`, `organizer`, `has_free_places`, `search`, `ordering`, `page`.

Основные проверки: встреча только в будущем, окончание позже начала, мест не меньше числа участников, котик записывается один раз и только хозяином, лимит котиков от одного хозяина.

## Тесты

```bash
docker compose exec backend python manage.py test
```

Коллекция Postman — в папке `postman/`, запускать целиком на тестовых данных. При пуше в `main` тесты, flake8 и сборка фронтенда запускаются в GitHub Actions.

## Деплой без Docker

Конфиги для Gunicorn (systemd) и Nginx — в `infra/`.

```bash
sudo apt install -y python3-venv nginx postgresql git
sudo git clone https://github.com/temakulakov/kittygram.git /opt/kittygram
cd /opt/kittygram && sudo cp .env.example .env    # DB_HOST=localhost, свои пароли
sudo python3 -m venv venv && sudo venv/bin/pip install -r backend/requirements.txt
set -a; . ./.env; set +a
cd backend && sudo -E ../venv/bin/python manage.py migrate && sudo -E ../venv/bin/python manage.py collectstatic --noinput
sudo cp ../infra/gunicorn_kittygram.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now gunicorn_kittygram
sudo cp ../infra/nginx_kittygram.conf /etc/nginx/sites-enabled/kittygram
sudo nginx -t && sudo systemctl reload nginx
```

Фронтенд собирается в `frontend/build` (`npm ci && npm run build`).

Кулаков Артем, 15.07В-ПИ2у/23б
