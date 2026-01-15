---
applyTo: "**/*.test.ts, **/*.spec.ts, **/*.test.tsx"
---

# Testing Guidelines

<rules>
  <infra>
    - **Integration**: Refer to [`docker-compose.test.yml`](docker-compose.test.yml) for service definitions.
    - **Isolation**: Tests must not leave persistent data in the local dev database. Use transactions or transient containers.
  </infra>

  <patterns>
    - **Unit Tests**: Mock strictly all external calls (API, File System).
    - **Integration Tests**: Test against real services (MySQL, Postgres, Mongo) where possible.
    - **Structure**: Use clear `describe` and `it` blocks explaining the business case.
  </patterns>

  <mocking>
    - **Network**: When mocking `fetch`, ensure the response structure matches the API convention (e.g., `{ success: true, ... }`).
  </mocking>
</rules>
