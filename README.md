# Find Your Book

Library search system with a separate backend and frontend.

## Architecture

- Frontend: Angular app in `frontend/`
- Backend: Node.js + Express API in `backend/`
- Database: Neon Postgres via Drizzle ORM
- Search engine: Redis-backed exact, prefix, and fuzzy search index

## Features

- Persist books in Postgres and index them in Redis
- Admin login to protect write operations
- Add books via API (`POST /api/books`) for authenticated admins only
- Full catalog listing (`GET /api/books`)
- Filter catalog by category (`GET /api/books?category=technology`)
- Redis-backed search with exact, prefix, and fuzzy matching (`GET /api/books?query=atomc habits`)
- Get all categories (`GET /api/categories`)

## Run Backend

1. Open a terminal in `backend/`
2. Install dependencies:
  - `npm install`
3. Start server:
  - `npm start`
4. API base URL:
  - `http://localhost:4000/api`

## Run Frontend

1. Open a terminal in `frontend/`
2. Install dependencies:
  - `npm install`
3. Start Angular dev server:
  - `npm start`
4. Open:
  - `http://localhost:4200`
5. Ensure backend is running on port 4000 for API requests

## Run With Docker

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` plus your admin secret values.
2. Start the stack:
  - `docker compose up --build`
3. Open the app:
  - Frontend: `http://localhost:4200`
  - Backend API: `http://localhost:4000/api`

Docker services:

- `frontend`: Angular SSR app, proxied to the backend through `/api`
- `backend`: Express API

Notes:

- The backend still expects a Postgres-compatible `DATABASE_URL`.
- Set `REDIS_URL` to your Redis Cloud connection string.
- Your Redis Cloud database must have RediSearch enabled.

## API Examples

### Get full catalog

`GET http://localhost:4000/api/books`

### Search with fuzzy typo

`GET http://localhost:4000/api/books?query=geroge orwel`

### Filter by category

`GET http://localhost:4000/api/books?category=science`

### Add a new book

`POST http://localhost:4000/api/books`

```json
{
  "title": "Deep Work",
  "author": "Cal Newport",
  "isbn": "9781455586691",
  "category": "productivity",
  "floor": "2",
  "section": "Personal Growth",
  "shelf": "PG-06",
  "status": "available"
}
```

### Add books via a CSV file

`POST http://localhost:4000/api/books/import/csv`

```type1.csv(with status column)
title,author,isbn,category,floor,section,shelf,status
An Introduction to Political Science,O.P. Gauba,9789388658331,Social Sciences,2,PolSci,4,available
```

```type2.csv(w/o status column)
title,author,isbn,category,floor,section,shelf
An Introduction to Political Science,O.P. Gauba,9789388658331,Social Sciences,2,PolSci,4
```


The POST book endpoints now requires an admin bearer token.

1. Login as admin:
  - `POST http://localhost:4000/api/auth/login-admin`
2. Use returned `token` in header:
  - `Authorization: Bearer <token>`


## Admin Credentials

- Default username: `admin`
- Default password: `admin123`

For production/testing, set environment variables before starting backend:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_TOKEN_SECRET`
- `ADMIN_TOKEN_TTL_SECONDS` (default `3600`)
- `DATABASE_URL`
- `REDIS_URL`

Redis requirement:

- Your Redis instance must have RediSearch enabled (Redis Stack or managed Redis with Search support).
- If RediSearch is unavailable, backend startup will fail when creating the search index.
