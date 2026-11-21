# WonderCode

*Imagine it. Build it. Understand it.*

An AI-powered coding and learning platform for children aged 8–12. Children describe an idea, get a working HTML/CSS/JavaScript app, explore the code, and learn how it works with an AI Teacher (English, Hindi, Hinglish).

## Status

Foundation phase. Prompts 02 (`apps/web`) and 03 (`apps/api`) are implemented; Prompt 04 adds the Supabase client and setup docs; no schema yet.

## Documentation

- [Product and technical blueprint](WonderCode_Product_and_Technical_Blueprint_README.md): requirements, API, schema, roadmap (source of truth)
- [Architecture](docs/architecture/overview.md)
- [Development guide](docs/development.md)
- [Supabase setup](docs/supabase-setup.md)
- [Architecture decisions](docs/decisions/)

## Planned layout

```
apps/web/        React + Vite + Tailwind (Prompt 02, done)
apps/api/        Node.js + Express API (Prompt 03, done)
supabase/        Migrations and seed (Prompts 04, 06)
docs/            Architecture, guides, decisions (ADRs)
```

Work proceeds one roadmap prompt at a time; each is reviewed before the next begins.

## Run the web app

```
npm install
cp apps/web/.env.example apps/web/.env   # optional; defaults work locally
npm run dev:web      # http://localhost:5173
cp apps/api/.env.example apps/api/.env   # optional; defaults work locally
npm run dev:api      # http://localhost:3000/api/v1/health
npm test
npm run build:web
```
