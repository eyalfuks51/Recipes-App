# Recipe Manager

## What This Is

A web application for saving and browsing Instagram recipes. Users paste an Instagram post URL; the backend scrapes the caption, extracts structured recipe data via Moonshot AI, and saves it to Supabase. A React frontend lets users submit URLs and browse the saved recipe gallery.

The project migrates an existing local n8n workflow to a standalone Node.js/Express backend deployable 24/7 on Koyeb, paired with a React/Vite frontend deployable on Vercel — built so the developer's partner can continue extending the frontend.

## Core Value

Any Instagram recipe URL becomes a browsable, structured recipe card in one click.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] POST /api/process-recipe accepts Instagram URL, scrapes caption via Apify, extracts recipe via Moonshot AI, saves to Supabase
- [ ] Frontend URL submission form sends request to Node.js backend
- [ ] Frontend recipe gallery fetches and displays recipes directly from Supabase
- [ ] Node.js server is Dockerized for Koyeb deployment
- [ ] Frontend is structured for Vercel deployment

### Out of Scope

- Auth/login — personal tool, no auth needed for v1
- Recipe editing UI — read-only gallery for v1
- Mobile app — web-first

## Context

**Migrated from:** Local n8n workflow (`Instagram Recipe Processor.json`)

**Moonshot AI system prompt (Hebrew):**
> "אתה עוזר לניתוח מתכונים. קרא את כיתוב האינסטגרם וחזור רק ב-JSON תקני בעברית עם השדות הבאים: {"title": string, "main_category": string (לדוגמה: פסטה, סלט, קינוח, מרק), "difficulty": string (אחד מ: קל, בינוני, קשה), "ingredients": [מערך של שמות מרכיבים]}. אל תוסיף טקסט מחוץ ל-JSON."

**Apify:** actor `apify~instagram-scraper`, `resultsType: "posts"`, `resultsLimit: 1`. URL must include `www.` prefix.

**Moonshot model:** `moonshot-v1-8k` (OpenAI-compatible API)

**Supabase tables:** `recipes`, `ingredients`, `recipe_ingredients`

**Supabase upsert strategy:** `Prefer: resolution=merge-duplicates` — deduplicates ingredients by name (lowercase+trimmed), deduplicates recipes by `instagram_url`

**AI response parsing:** regex-extract `{...}` block to handle markdown-wrapped JSON from model

## Constraints

- **Backend runtime:** Node.js + Express — must be a persistent server (not serverless) for Koyeb
- **Frontend:** React + Vite + SCSS — handoff-friendly for non-Claude developer
- **Database:** Supabase (existing schema, no migrations needed for v1)
- **Deployment:** Backend → Koyeb (Docker), Frontend → Vercel

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dual /client + /server monorepo | Clean separation, each deployable independently | — Pending |
| Frontend reads Supabase directly | Gallery doesn't need to proxy through backend — simpler | — Pending |
| No auth for v1 | Personal tool, complexity not justified | — Pending |

---
*Last updated: 2026-03-05 after initialization*
