# ROSC MEDIA OS - System Architecture

## 1. Overview
ROSC MEDIA OS is an enterprise-grade cloud platform designed for church media ministries. It unifies project management, professional-grade media creation tools, AI-assisted workflows, and distribution into a single platform.

## 2. Core Philosophy
- **Modular Monolith (Monorepo)**: Modules are logically separated in a pnpm workspace for consistency and shared typing.
- **API-First**: Frontend communicates with the NestJS API via REST/GraphQL.
- **Scalability**: Designed for high-resolution media and high concurrency.
- **Security**: JWT-based Auth, RBAC, 2FA, and Audit Logging.

## 3. Tech Stack
- **Monorepo**: `pnpm` workspaces.
- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Radix UI.
- **Backend**: NestJS (Node.js), TypeScript.
- **Database**: PostgreSQL with Prisma ORM.
- **State Management**: React Query (Server), Zustand (Client).
- **Real-time**: WebSockets (Socket.io).
- **Storage**: AWS S3 / Cloudflare R2.

## 4. Repository Structure
- `apps/web`: Next.js frontend (@rosc/web).
- `apps/api`: NestJS backend (@rosc/api).
- `packages/database`: Prisma schema and client (@rosc/database).
- `packages/ui`: Shared UI components (@rosc/ui).
- `packages/types`: Shared TypeScript types (@rosc/types).

## 5. Deployment
- **Containerization**: Docker.
- **CI/CD**: GitHub Actions.
- **Cloud**: Vercel (Frontend), AWS ECS/Fargate (Backend).
