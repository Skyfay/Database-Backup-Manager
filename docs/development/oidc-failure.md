# OIDC/SSO Integration - Problem Documentation

## Summary

Integration von PocketID (OIDC Provider) mit better-auth v1.4.17 hatte mehrere Probleme, die nacheinander gelöst werden mussten.

---

## Problem 1: `Cannot read properties of undefined (reading 'startsWith')`

### Symptom
```
TypeError: Cannot read properties of undefined (reading 'startsWith')
```
HTTP 500 beim SSO Callback.

### Ursache
In `@better-auth/sso` wird in Zeile 1710 **immer** `betterFetch(config.discoveryEndpoint)` aufgerufen - auch wenn `skipDiscovery: true` gesetzt ist. Wenn `discoveryEndpoint` `undefined` ist, crasht der interne URL-Parser.

### Lösung
`discoveryEndpoint` muss IMMER in der `oidcConfig` gesetzt werden:

```typescript
// src/services/oidc-provider-service.ts
const discoveryEndpoint = data.issuer
    ? `${data.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`
    : undefined;

const oidcConfig = {
    // ... andere Felder
    discoveryEndpoint,  // REQUIRED - auch bei skipDiscovery!
    skipDiscovery: true,
};
```

---

## Problem 2: `account not linked` Error

### Symptom
```
location: 'http://localhost:3000/api/auth/error/error?error=account not linked'
```
HTTP 302 Redirect zu Error-Seite nach erfolgreicher IdP-Authentifizierung.

### Ursache
Better-auth's Account-Linking-Logik in `handleOAuthUserInfo` (Zeile 21 in `link-account.mjs`):

```javascript
if (
    (!isTrustedProvider && !userInfo.emailVerified) ||
    c.context.options.account?.accountLinking?.enabled === false
) {
    return { error: "account not linked", data: null };
}
```

**Bedingungen für erfolgreiches Linking:**
1. `accountLinking.enabled !== false` (Standard: true) ✅
2. ENTWEDER `isTrustedProvider === true` ODER `userInfo.emailVerified === true`

**Wie wird `isTrustedProvider` bestimmt? (OIDC - Zeile 1766):**
```javascript
const isTrustedProvider =
    "domainVerified" in provider &&
    provider.domainVerified === true &&
    validateEmailDomain(userInfo.email, provider.domain);
```

Das bedeutet:
- Provider muss `domainVerified: true` haben
- **UND** die Email-Domain des Users muss mit `provider.domain` übereinstimmen!

### Warum es fehlschlug

| Szenario | Email | Provider Domain | domainVerified | emailVerified (IdP) | Ergebnis |
|----------|-------|-----------------|----------------|---------------------|----------|
| Lokal erstellter User | skyfay@skymail.one | skyauth.ch | true | false | ❌ Domain mismatch |
| Lokal erstellter User | skyfay@skymail.one | skymail.one | true | false | ❌ IdP sendet emailVerified=false |
| Kein User existiert | skyfay@skymail.one | skymail.one | true | false | ✅ Neuer User wird erstellt |

### Die eigentliche Lösung

**Das Problem war nicht das Linking selbst, sondern dass:**
1. Ein lokaler User mit `emailVerified: false` existierte
2. Der IdP (PocketID) `emailVerified: false` sendete
3. Die Domain-Konfiguration nicht zur Email passte

**Lösung: Kein existierender User → OAuth erstellt neuen User direkt**

Wenn KEIN User mit der Email existiert, erstellt better-auth einen neuen User ohne Linking-Checks.

---

## Problem 3: Lokale User + SSO Kompatibilität

### Das Kernproblem

Wenn ein Admin einen User im Dashboard erstellt:
- User hat `emailVerified: false`
- Kein SSO-Account ist verknüpft

Wenn dieser User sich per SSO einloggt:
- Better-auth findet existierenden User
- Versucht Account-Linking
- **Schlägt fehl** weil weder `isTrustedProvider` noch `emailVerified`

### Unterschied: OAuth-erstellter vs. Dashboard-erstellter User

| Eigenschaft | OAuth-erstellter User | Dashboard-erstellter User |
|-------------|----------------------|---------------------------|
| emailVerified | `true` (wenn IdP bestätigt) | `false` |
| SSO Account | Automatisch verknüpft | Nicht vorhanden |
| Kann sich per SSO einloggen | ✅ Ja | ❌ Nein (ohne Fix) |

---

## Implementierte Lösungen

### 1. `discoveryEndpoint` automatisch generieren
Siehe `src/services/oidc-provider-service.ts`

### 2. `trustEmailVerified: true` im SSO Plugin
```typescript
sso({
    trustEmailVerified: true,
})
```

### 3. `accountLinking.allowDifferentEmails: true`
```typescript
account: {
    accountLinking: {
        enabled: true,
        allowDifferentEmails: true,
    }
}
```

### 4. `trustedProviders` dynamisch aus DB laden
```typescript
// src/lib/auth.ts
let trustedProvidersCache: string[] = [];

async function loadTrustedProviders(): Promise<void> {
    const providers = await prisma.ssoProvider.findMany({
        where: { enabled: true },
        select: { providerId: true }
    });
    trustedProvidersCache = providers.map(p => p.providerId);
}

// Bei Modulstart laden
loadTrustedProviders();

// In der Auth-Config verwenden
account: {
    accountLinking: {
        enabled: true,
        allowDifferentEmails: true,
        trustedProviders: getTrustedProviders(), // Cached array
    }
}
```

> ⚠️ **WICHTIG:** Nach dem Hinzufügen eines neuen SSO-Providers muss der Server neu gestartet werden!
> Die `trustedProviders` Liste wird beim Serverstart aus der Datenbank geladen und gecached.
> Neue Provider werden erst nach einem Neustart als "trusted" erkannt.

---

## Offene Verbesserungen

### TODO: User-Erstellung mit emailVerified=true
Wenn ein Admin einen User erstellt, sollte `emailVerified: true` gesetzt werden, damit SSO-Linking funktioniert.

### TODO: Automatisches Account-Linking für trusted Providers
Provider-ID dynamisch in `trustedProviders` Array laden, damit Linking ohne Domain-Matching funktioniert.

---

## Referenzen

- Better-Auth SSO Plugin: `node_modules/@better-auth/sso/dist/index.mjs`
- Account Linking Logic: `node_modules/better-auth/dist/oauth2/link-account.mjs`
- `validateEmailDomain` Funktion: Zeile 946 in SSO Plugin
