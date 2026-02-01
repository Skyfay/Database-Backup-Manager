# SSO / OIDC

Configure Single Sign-On with OpenID Connect providers.

## Overview

DBackup supports SSO authentication via OIDC (OpenID Connect):
- Centralized authentication
- Enterprise identity providers
- Automatic user provisioning
- Domain-based routing

## Supported Providers

| Provider | Type | Adapter |
| :--- | :--- | :--- |
| **Authentik** | Self-hosted | Pre-configured |
| **Keycloak** | Self-hosted | Pre-configured |
| **PocketID** | Self-hosted | Pre-configured |
| **Generic** | Any OIDC | Manual configuration |

Pre-configured adapters automatically generate endpoints from a base URL or discovery.

## Adding an SSO Provider

### Step 1: Configure Your Identity Provider

Create an OIDC application in your identity provider:

**Required settings**:
- Redirect URI: `https://your-dbackup-url/api/auth/callback/{provider-id}`
- Grant type: Authorization Code
- Scopes: `openid`, `profile`, `email`

**Obtain**:
- Client ID
- Client Secret

### Step 2: Add Provider in DBackup

1. Go to **Settings** → **SSO Providers**
2. Click **Add Provider**
3. Select adapter type (Authentik, PocketID, Keycloak or Generic)
4. Fill in configuration
5. Click **Test** to verify
6. Save

## Provider Configuration

### Authentik

[Authentik](https://goauthentik.io/) is a popular self-hosted identity provider.

**Configuration**:
| Field | Description | Example |
| :--- | :--- | :--- |
| **Name** | Display name | "Corporate Login" |
| **Base URL** | Authentik instance URL | `https://auth.example.com` |
| **Client ID** | From Authentik app | `dbackup-client` |
| **Client Secret** | From Authentik app | `secret-key` |

Endpoints are auto-generated:
```
Authorization: {baseUrl}/application/o/authorize/
Token: {baseUrl}/application/o/token/
UserInfo: {baseUrl}/application/o/userinfo/
```

### Keycloak

[Keycloak](https://www.keycloak.org/) is an enterprise-grade open-source identity and access management solution.

**Configuration**:
| Field | Description | Example |
| :--- | :--- | :--- |
| **Name** | Display name | "Company SSO" |
| **Keycloak URL** | Keycloak instance base URL | `https://auth.company.com` |
| **Realm Name** | Authentication realm | `master` |
| **Client ID** | From Keycloak client | `dbackup-client` |
| **Client Secret** | From Keycloak client | `secret-key` |

**Notes**:
- Endpoints discovered via OIDC Discovery (`.well-known/openid-configuration`)
- Supports both modern (Quarkus) and legacy versions
- For Keycloak < 18: Include `/auth` in base URL (e.g., `https://auth.company.com/auth`)

### PocketID

[PocketID](https://github.com/pocket-id/pocket-id) is a lightweight OIDC provider.

**Configuration**:
| Field | Description | Example |
| :--- | :--- | :--- |
| **Name** | Display name | "PocketID" |
| **Base URL** | PocketID instance URL | `https://pocketid.example.com` |
| **Client ID** | From PocketID | `client-id` |
| **Client Secret** | From PocketID | `secret` |

### Generic OIDC

For any OIDC-compliant provider (Keycloak, Okta, Azure AD, etc.).

**Configuration**:
| Field | Description |
| :--- | :--- |
| **Name** | Display name |
| **Issuer** | OIDC issuer URL |
| **Authorization URL** | OAuth authorize endpoint |
| **Token URL** | OAuth token endpoint |
| **UserInfo URL** | OIDC userinfo endpoint |
| **Client ID** | Application client ID |
| **Client Secret** | Application client secret |

## User Flow

### New Users (Auto-Provisioning)

When SSO user first logs in:
1. Redirect to identity provider
2. User authenticates
3. Returns to DBackup with tokens
4. New user account created
5. **No permissions by default** (must be assigned to group)

### Existing Users (Account Linking)

If email matches existing account:
1. Accounts are linked
2. User can login via SSO or password
3. Permissions are preserved

## Domain Mapping

Route users to specific SSO provider by email domain:

1. Edit SSO provider
2. Set **Email Domain**: `company.com`
3. Users with `@company.com` email see this provider

Multiple domains: separate with commas
```
company.com, subsidiary.com
```

## Login Page Behavior

When SSO providers are configured:
- "Sign in with [Provider]" buttons appear
- Users can choose SSO or password login
- Domain-matched users may auto-redirect

## Security Considerations

### Token Storage

- Access tokens stored in session
- Refresh handled automatically
- No tokens stored in database

### Permissions

SSO users follow same permission model:
- Assigned to groups
- Inherit group permissions
- No special SSO permissions

### Credential Encryption

Client secrets are encrypted:
- Stored encrypted in database
- Uses `ENCRYPTION_KEY`
- Never exposed in logs

## Best Practices

### Provider Setup

1. **Use dedicated OAuth app** for DBackup
2. **Limit scopes** to minimum needed
3. **Set appropriate token lifetimes**
4. **Configure redirect URIs** exactly

### User Management

1. **Default group** for new SSO users
2. **Regular access reviews**
3. **Disable unused providers**
4. **Document domain mappings**

### High Availability

1. **Provider availability** affects login
2. **Keep password fallback** for admins
3. **Monitor SSO health**

## Troubleshooting

### Login Fails with "Invalid Callback"

**Cause**: Redirect URI mismatch

**Solution**:
1. Check redirect URI in identity provider
2. Must exactly match: `https://your-domain/api/auth/callback/{provider-id}`
3. Include trailing slash if configured

### "User Not Found" After SSO

**Cause**: Auto-provisioning issue

**Check**:
1. Email claim is returned
2. User created in database
3. Group assignment

### Token Expired Errors

**Cause**: Session or refresh token expired

**Solution**:
1. Re-authenticate
2. Check token lifetimes in IdP
3. Verify clock sync

### Can't Connect to Provider

**Check**:
1. Network connectivity
2. DNS resolution
3. Firewall rules
4. SSL certificates

## Provider-Specific Guides

### Keycloak Setup (Pre-configured Adapter)

If using the **Keycloak adapter** (recommended):

1. In Keycloak admin console, select your realm
2. Go to **Clients** → **Create client**
3. Configure:
   - Client type: OpenID Connect
   - Client ID: `dbackup`
   - Client authentication: On
4. Set **Valid redirect URIs**: `https://dbackup.example.com/*`
5. Save and go to **Credentials** tab
6. Copy **Client secret**
7. In DBackup:
   - Select **Keycloak** adapter
   - Base URL: `https://auth.company.com` (or `https://auth.company.com/auth` for legacy versions)
   - Realm: Your realm name (e.g., `master`)
   - Client ID & Secret from Keycloak

### Keycloak Setup (Generic Adapter)

If you prefer manual configuration:

1. Create realm or use existing
2. Create client:
   - Client type: OpenID Connect
   - Client authentication: On
   - Valid redirect URIs: `https://dbackup.example.com/*`
3. Note client ID and secret
4. Use Generic adapter with:
   ```
   Issuer: https://keycloak.example.com/realms/your-realm
   Auth URL: {issuer}/protocol/openid-connect/auth
   Token URL: {issuer}/protocol/openid-connect/token
   UserInfo: {issuer}/protocol/openid-connect/userinfo
   ```

### Azure AD Setup

1. Register application in Azure Portal
2. Configure:
   - Redirect URI: `https://dbackup.example.com/api/auth/callback/azure`
   - Implicit grant: ID tokens
3. Create client secret
4. Use Generic adapter with:
   ```
   Issuer: https://login.microsoftonline.com/{tenant-id}/v2.0
   ```

### Google Workspace

1. Create OAuth 2.0 credentials in Google Cloud
2. Configure consent screen
3. Add redirect URI
4. Use Generic adapter

## Next Steps

- [User Management](/user-guide/admin/users) - Manage user accounts
- [Groups & Permissions](/user-guide/admin/permissions) - Configure access
