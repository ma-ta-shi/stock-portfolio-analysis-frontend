# Frontend — React + Vite + TypeScript + Tailwind CSS

## Stack
- React 18+ with TypeScript strict mode
- Vite for bundling and dev server
- Tailwind CSS for styling (no custom CSS unless necessary)
- shadcn/ui for component library
- TanStack Query for server state management
- Recharts for data visualization (stock charts, allocation charts)
- React Router for navigation

## Conventions
- Functional components with hooks only (no class components)
- Components: PascalCase files in src/components/
- Pages: in src/pages/ (one file per route)
- Hooks: use-prefixed files in src/hooks/
- TypeScript types in src/types/ — must match backend Pydantic schemas exactly
- TypeScript strict mode — no `any` without justification
- During frontend-first dev: fetch from /mock-data/ JSON files
- When backend ready: swap to real API at http://localhost:8000/api/

## Component Patterns
- Prefer explicit props typing over React.FC
- Extract custom hooks for reusable data-fetching or business logic
- Use Tailwind utility classes — avoid @apply except in base styles
- Chart components: consistent pattern in src/components/charts/

## Data Fetching
- TanStack Query (useQuery, useMutation) for ALL server state
- No useEffect for data fetching — use TanStack Query
- Optimistic updates for watchlist and portfolio mutations
- Mock data: frontend/mock-data/ with JSON matching every API response shape

## Pages (from Notion Front End Design spec)
- Home: morning briefing (what changed), market overview, watchlist summary
- Watchlist: table with signal strength, last analysis date, confidence, disagreement score
- Analysis: trigger form + real-time progress + CIO narrative + agent breakdown (Pass 1 → Pass 2 → CIO)
- Portfolio: holdings table, allocation charts (sector/account/geography donut charts)
- Feedback: accuracy dashboard, prediction history, walk-forward equity curve
- Settings: user profile, financial profile (accounts, risk tolerance, goals), profile switcher
