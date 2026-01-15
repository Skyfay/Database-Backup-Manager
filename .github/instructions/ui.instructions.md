---
applyTo: "src/components/**/*.tsx, src/app/**/*.tsx"
---

# UI & Frontend Guidelines

<rules>
  <tech_stack>
    - **Framework**: Next.js 16 App Router. Default to Server Components; use `use client` only when interactivity is required.
    - **Styling**: Tailwind CSS (mobile-first).
    - **Component Lib**: Shadcn UI. Reuse primitives from `src/components/ui/` whenever possible.
    - **Forms**: `react-hook-form` + `zod`. Reference: [`src/components/adapter-manager.tsx`](src/components/adapter-manager.tsx).
  </tech_stack>

  <styling>
    - Avoid inline styles. Use Tailwind utility classes.
    - **Feedback**: Use `toast` (Sonner) for success/error notifications. Never use `alert()`.
  </styling>

  <formatting>
    - **Dates**:
      - ❌ Forbidden: `new Date().toLocaleDateS      - ❌ Forbidden: `new Date().toLocaleDateS      - ❌ Forbidden: `new Date().toLocaleDateS      - ❌ Forbidden: `new Date().toLocaleDateS      - ❌ Fosx).
      - This ensures user timezone preferences are respected.
  </formatting>

  <architecture>
    - **Separation**: Decouple data fetching (Server Actions) from presentation.
    - **Props**: Validate all props with strict TypeScript Interfaces.
  </architecture>
</rules>
