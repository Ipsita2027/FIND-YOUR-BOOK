# Find Your Book Frontend (Angular)

Angular frontend for the Find Your Book project.

## What This Frontend Supports

- Full catalog listing from `GET /api/books`
- Search by query (`title`, `author`, `isbn`, fuzzy typo support via backend)
- Category filtering from `GET /api/categories`
- Admin login via `POST /api/auth/login-admin`
- Add new books via `POST /api/books` with Bearer token

## Requirements

- Backend running on `http://localhost:4000`
- Node.js and npm installed

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start Angular dev server:

```bash
npm start
```

3. Open:

`http://localhost:4200`

The app uses backend base URL `http://localhost:4000/api`.

## Admin Access

Default backend admin credentials:

- Username: `admin`
- Password: `admin123`

## Build

```bash
npm run build
```

## Test

```bash
npm test
```
