# SSO / OIDC Integration

This document describes the OpenID Connect (OIDC) implementation for Single Sign-On (SSO) support.

## Architecture

We leverage the **`better-auth` SSO Plugin** to handle the protocol complexity, while implementing an **Adapter Pattern** to support various providers (Authentik, PocketID, Keycloak, Generic).

### The Adapter Concept

Since `better-auth` handles the raw OIDC protocol, our "Adapters" serve as **Configuration Generators**:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  OIDC Adapter   │────▶│  SsoProvider     │────▶│  Better-Auth    │
│  (Config Gen)   │     │  (Database)      │     │  (Protocol)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

An adapter (e.g., `AuthentikAdapter`) provides:
1. **Metadata**: Name, Icon, Description
2. **Input Fields**: What the admin needs to enter
3. **Endpoint Generation**: Calculates OAuth endpoints from base URL
4. **Default Mapping**: How to map provider's user response to our User model

### Supported Providers

| Provider | Adapter ID | Auto-Discovery |
|----------|-----------|----------------|
| Authentik | `authentik` | Yes (from Base URL) |
| PocketID | `pocket-id` | Yes (from Base URL) |
| Keycloak | `keycloak` | Yes (from Realm URL) |
| Generic | `generic` | Manual endpoints |

## Database Schema

```prisma
model SsoProvider {
  id             String   @id @default(cuid())
  providerId     String   @unique // e.g. "authentik-main"
  type           String   @default("oidc")

  // OIDC Endpoints
  issuer                String?
  authorizationEndpoint String?
  tokenEndpoint         String?
  userInfoEndpoint      String?
  jwksEndpoint          String?

  // Credentials (encrypted at rest)
  clientId       String?
  clientSecret   String?

  // App Configuration
  adapterId      String   // e.g. "authentik", "keycloak"
  name           String   // Display Name e.g. "Corporate Login"
  enabled        Boolean  @default(true)

  // Domain matching for auto-redirect
  domain         String?  // e.g. "company.com"

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

## User Lifecycle

### Account Linking (Existing Users)

If a user logs in via OIDC and the email matches an existing account:
1. Verify email is confirmed on both sides
2. Link the SSO identity to the existing account
3. User can now login via password OR SSO

### Auto-Provisioning (New Users)

If enabled in settings, a new user is created upon successful OIDC login:
- **Default Permissions**: New users get NO permissions (Zero-Trust)
- **Default Group**: Can be configured in System Settings
- **Email Verification**: Trusted if provider verifies emails

```typescript
// System setting
const autoProvision = await getSystemSetting('sso.autoProvisionUsers', false);
const defaultGroupId = await getSystemSetting('sso.defaultGroupId', null);
```

## Implementing an Adapter

### Adapter Interface

**Location**: `src/lib/adapters/oidc/index.ts`

```typescript
export interface OIDCAdapter {
  id: string;
  name: string;
  description: string;
  icon: string;

  // Form fields for admin configuration
  inputs: AdapterInputField[];

  // Zod schema for validation
  inputSchema: ZodSchema;

  // Generate OIDC endpoints from user input
  getEndpoints(config: Record<string, string>): OIDCEndpoints;
}

interface OIDCEndpoints {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  jwksEndpoint?: string;
}
```

### Example: Authentik Adapter

```typescript
// src/lib/adapters/oidc/authentik.ts
export const AuthentikAdapter: OIDCAdapter = {
  id: 'authentik',
  name: 'Authentik',
  description: 'Self-hosted identity provider',
  icon: '/icons/authentik.svg',

  inputs: [
    {
      name: 'baseUrl',
      label: 'Authentik URL',
      type: 'url',
      placeholder: 'https://auth.example.com',
      required: true,
    },
    {
      name: 'applicationSlug',
      label: 'Application Slug',
      type: 'text',
      placeholder: 'dbackup',
      required: true,
    },
  ],

  inputSchema: z.object({
    baseUrl: z.string().url(),
    applicationSlug: z.string().min(1),
  }),

  getEndpoints(config) {
    const base = config.baseUrl.replace(/\/$/, '');
    const slug = config.applicationSlug;

    return {
      issuer: `${base}/application/o/${slug}/`,
      authorizationEndpoint: `${base}/application/o/authorize/`,
      tokenEndpoint: `${base}/application/o/token/`,
      userInfoEndpoint: `${base}/application/o/userinfo/`,
      jwksEndpoint: `${base}/application/o/${slug}/jwks/`,
    };
  },
};
```

## Security Considerations

### HTTPS Enforcement

The OIDC client enforces HTTPS for all provider endpoints:

```typescript
if (!endpoint.startsWith('https://')) {
  throw new Error('OIDC endpoints must use HTTPS');
}
```

### Secret Storage

Client secrets are encrypted at rest using the system `ENCRYPTION_KEY`:

```typescript
// On save
const encryptedSecret = encrypt(clientSecret);

// On use
const clientSecret = decrypt(provider.clientSecret);
```

### Domain Verification

When domain-based SSO redirect is enabled, verify the user's email domain matches:

```typescript
const emailDomain = email.split('@')[1];
const provider = await findProviderByDomain(emailDomain);
```

## Testing SSO

### Local Development

1. Use a local Authentik/Keycloak instance (Docker)
2. Configure callback URL: `http://localhost:3000/api/auth/callback/oidc`
3. Use HTTP for local testing (HTTPS check is relaxed in development)

### Common Issues

| Issue | Solution |
|-------|----------|
| Redirect URI mismatch | Check callback URL in provider settings |
| Invalid client credentials | Verify client ID and secret |
| CORS errors | Configure allowed origins in provider |
| Token expired | Check server time synchronization |
