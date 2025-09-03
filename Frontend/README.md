# Flight Tracker Frontend

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Set backend URL

Create a `.env` file in the project root:

```bash
VITE_API_URL=http://localhost:4000
```

3. Run the app

```bash
npm run dev
```

## API integration

Requests go through `src/shared/lib/http.ts`, which reads `VITE_API_URL`.
`src/services/flightService.ts` calls:
- GET `/flights`
- GET `/flights/:id`
- GET `/restricted-zones`
- GET `/alerts`
- DELETE `/alerts/:id`

Ensure your backend exposes these routes under `VITE_API_URL`.

## Suggested structure (for growth)

```
src/
  app/
    App.tsx
  features/
    flights/
      components/...
      hooks/useFlights.ts
      services/flightService.ts
      types/flight.ts
  shared/
    components/...
    lib/http.ts
  main.tsx
  index.css
```
