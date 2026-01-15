---
applyTo: "src/lib/**/*.ts, src/app/api/**/*.ts, src/utils/**/*.ts"
---

# Backend & Logic Guidelines

<rules>
  <db>
    - **ORM**: Use Prisma Client for all database interactions.
    - **No Raw SQL**: Avoid raw queries unless strictly necessary for performance.
    - **Schema**: All schema changes must be defined in `prisma/schema.prisma`.
  </db>
  
  <api>
    - **Response Format**: Always return structured JSON: `{ success: boolean, message?: string, data?: any }`.
    - **Validation**: Use `zod` to strictly validate all incoming request bodies.
    - **Typing**: Use `NextResponse` from `next/server`.
    - **Security**: All API routes (except `scan`) must implement Session Checks via `auth.api.getSession`.
  </api>

  <error_handling>
    - Use `try/catch` blocks.
    - Log full errors to server console (`console.error`).
    - Return sanitized, user-friendly error messages to the client on production.
  </error_handling>

  <datetime>
    - **Storage**: Always store dates as UTC (ISO 8601).
    - **Library**: Use `date-fns` or `date-fns-tz` for manipulation.
    - **Server Time**: Do not rely on local system time; strictly use UTC.
  </datetime>
</rules>