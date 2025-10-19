# TalentFlow - Mini Hiring Platform

A comprehensive front-end hiring management platform built with React, TypeScript, and modern web technologies.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Visit `http://localhost:5173/`

## 📋 Assignment Implementation Status

### ✅ Completed Infrastructure (100%)
- React + TypeScript + Vite setup
- Tailwind CSS + shadcn/ui components
- IndexedDB (Dexie) for local persistence
- MSW for API simulation (200-1200ms latency, 5-10% errors)
- Seed data: 25 jobs, 1000 candidates, 3+ assessments
- React Query for state management
- React Router with deep linking
- Dashboard with statistics

### 🚧 In Progress (Core Pages Need Implementation)
- Jobs CRUD interface
- Candidates virtualized list  
- Kanban board
- Assessment builder

All infrastructure is ready. The hard parts (database, API mocking, types, routing) are done. Just need to build the UI pages.

## 🛠 Tech Stack
- React 18 + TypeScript
- Vite 5
- Tailwind CSS v3
- shadcn/ui (New York style)
- Dexie (IndexedDB)
- MSW (API mocking)
- TanStack Query
- React Router v6

## 📁 Structure
```
src/
├── components/ui/      # shadcn components
├── lib/db.ts           # Database setup
├── mocks/              # MSW + seed data
├── types/              # TypeScript types
├── pages/              # Route pages
└── App.tsx             # Main app
```

## 🔧 Key Files
- `src/lib/db.ts` - Complete database schema & helpers
- `src/mocks/handlers.ts` - All API endpoints
- `src/mocks/seed.ts` - Data generation
- `src/types/index.ts` - Type definitions

