# Find Your Book

Library search system with a separate backend and frontend.

## Architecture

- Frontend: static web app in `frontend/`
- Backend: Node.js + Express API in `backend/`
- Database: SQLite (`backend/library.db`)
- Search engine: Inverted index + fuzzy matching (Levenshtein similarity)

## Features

- Persist books in a database
- Admin login to protect write operations
- Add books via API (`POST /api/books`) for authenticated admins only
- Full catalog listing (`GET /api/books`)
- Filter catalog by category (`GET /api/books?category=technology`)
- Inverted index search with fuzzy logic for typos (`GET /api/books?query=atomc habits`)
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

1. Open `frontend/index.html` in a browser
2. Ensure backend is running on port 4000
3. Search books and filter by category

## API Examples

### Get full catalog

`GET http://localhost:4000/api/books`

### Search with fuzzy typo

`GET http://localhost:4000/api/books?query=geroge orwel`

### Filter by category

`GET http://localhost:4000/api/books?category=science`

### Add a new book

`POST http://localhost:4000/api/books`

This endpoint now requires an admin bearer token.

1. Login as admin:
  - `POST http://localhost:4000/api/auth/login-admin`
2. Use returned `token` in header:
  - `Authorization: Bearer <token>`

```json
{
  "title": "Deep Work",
  "author": "Cal Newport",
  "isbn": "9781455586691",
  "category": "productivity",
  "floor": "2",
  "section": "Personal Growth",
  "shelf": "PG-06",
  "callNumber": "153.3 NEW",
  "status": "available"
}
```

## Admin Credentials

- Default username: `admin`
- Default password: `admin123`

For production/testing, set environment variables before starting backend:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_TOKEN_SECRET`
- `ADMIN_TOKEN_TTL_SECONDS` (default `3600`)
