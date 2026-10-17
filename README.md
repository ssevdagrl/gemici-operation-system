# Bus Operations Management System

A full-stack operations dashboard for managing bus departures, staff shifts, vehicles and trip information.

> **Portfolio edition:** This repository is a sanitized, standalone code snapshot. Proprietary data, backups and the external data-provider bridge have been excluded. The project is not connected to a live transport operator. Some live-data features require an alternative data source or sample data.

## Features

- Staff login and role-based access control (employee / manager)
- Shift start and end workflows
- Ride listing, filtering, status monitoring and vehicle details
- Passenger information models and ride notes
- Office notes, ride markers and administrative user management
- Dashboard indicators for stale or missing trip data

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | NestJS 11, TypeScript, JWT authentication, class-validator |
| Data | PostgreSQL 17, Prisma 7 |
| Local infrastructure | Docker Compose, Redis |

## Project layout

```text
backend/             NestJS REST API, Prisma schema and application modules
frontend/            Next.js user interface
docker-compose.yml   PostgreSQL and Redis development services
```

## Build locally

**Prerequisites:** Node.js, npm and Docker Desktop (or another PostgreSQL instance).

```bash
# Start supporting services
docker compose up -d

# API (in a separate terminal)
cd backend
npm install
npx prisma generate
npm run build

# UI (in a separate terminal)
cd frontend
npm install
npm run build
```

Application startup also requires appropriate local environment variables (for example, database connection and JWT settings), database schema setup and a user account. No production credentials or real operational data are provided in this repository. The build commands above are not a guarantee of end-to-end functionality.

## Privacy and scope

- No production `.env` files, actual passenger exports or database backups are included.
- External-provider integration and browser extension code have been omitted.
- The original operational Git history has not been published in this portfolio repository.
- The source illustrates software architecture and user workflows; it is not a live, deploy-ready transport operations service.

## Development note

The frontend and backend were successfully built during preparation of this portfolio edition. Some data-dependent workflows need demo data and additional configuration to run independently.
