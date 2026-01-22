import prisma from "@/lib/prisma";

export interface CreateSsoProviderInput {
    name: string;
    adapterId: string;
    type: "oidc" | "saml";
    providerId: string;
    enabled?: boolean; // Default true
    allowProvisioning?: boolean;
    domain?: string; // Email domain for SSO matching (e.g., "example.com")

    // Credentials
    clientId: string;
    clientSecret: string;

    // OIDC Endpoints (Calculated by Adapter before saving)
    issuer?: string;
    authorizationEndpoint: string;
    tokenEndpoint: string;
    userInfoEndpoint: string;
    jwksEndpoint?: string;
    /**
     * The OIDC discovery endpoint URL.
     * Required by better-auth even when skipDiscovery=true.
     * This should come from the adapter as different providers have different paths.
     */
    discoveryEndpoint?: string;
    scope?: string;
}

export interface UpdateSsoProviderInput extends Partial<CreateSsoProviderInput> {
    id: string;
}

export class OidcProviderService {

    static async getProviders() {
        return prisma.ssoProvider.findMany({
            orderBy: { createdAt: "desc" }
        });
    }

    static async getProviderById(id: string) {
        return prisma.ssoProvider.findUnique({
            where: { id }
        });
    }

    static async getEnabledProviders() {
        return prisma.ssoProvider.findMany({
            where: { enabled: true },
            select: {
                id: true,
                providerId: true,
                name: true,
                type: true,
                adapterId: true
                // Do NOT select secrets
            }
        });
    }

    static async createProvider(data: CreateSsoProviderInput) {
        // Extract domain from issuer URL if not provided
        let domain = data.domain;
        if (!domain && data.issuer) {
            try {
                const issuerUrl = new URL(data.issuer);
                domain = issuerUrl.hostname;
            } catch {
                // If URL parsing fails, leave domain undefined
            }
        }

        // Use discoveryEndpoint from adapter if provided, otherwise fallback to standard path
        // Different OIDC providers have different discovery paths (e.g., Authentik uses /application/o/{slug}/...)
        const discoveryEndpoint = data.discoveryEndpoint ?? (
            data.issuer
                ? `${data.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`
                : undefined
        );

        const oidcConfig = data.type === "oidc" ? JSON.stringify({
            issuer: data.issuer,
            clientId: data.clientId,
            clientSecret: data.clientSecret,
            authorizationEndpoint: data.authorizationEndpoint,
            tokenEndpoint: data.tokenEndpoint,
            userInfoEndpoint: data.userInfoEndpoint,
            jwksEndpoint: data.jwksEndpoint,
            // discoveryEndpoint is required by better-auth even with skipDiscovery
            // It's called in the callback handler regardless of skipDiscovery setting
            discoveryEndpoint,
            // Skip OIDC discovery since we provide all endpoints manually
            skipDiscovery: true,
        }) : undefined;

        return prisma.ssoProvider.create({
            data: {
                name: data.name,
                adapterId: data.adapterId,
                type: data.type,
                providerId: data.providerId,
                enabled: data.enabled ?? true,
                allowProvisioning: data.allowProvisioning ?? true,
                domain, // Required by better-auth SSO plugin

                clientId: data.clientId,
                clientSecret: data.clientSecret,

                issuer: data.issuer,
                authorizationEndpoint: data.authorizationEndpoint,
                tokenEndpoint: data.tokenEndpoint,
                userInfoEndpoint: data.userInfoEndpoint,
                jwksEndpoint: data.jwksEndpoint,

                oidcConfig
            }
        });
    }

    static async updateProvider(id: string, data: Partial<CreateSsoProviderInput>) {
        // Fetch current provider to merge config if needed, or primarily we just overwrite with new data if provided.
        // For partial updates, it's safer to reconstruct.
        // However, assuming the UI sends full data or we handle it in action layer.
        // Let's implement a simple merge for oidcConfig if it's OIDC.

        let oidcConfigUpdate: string | undefined = undefined;

        if (data.clientId || data.clientSecret || data.authorizationEndpoint) {
             // If critical OIDC params are updated, we should reconstruct oidcConfig.
             // Ideally we'd need the full object, but let's assume `data` contains necessary updates
             // or we fetch existing first.
             // For simplicity, we'll try to use data properties if available.

             // A better approach: We rely on the Action to pass consistent data.
             // Constructing a partial config is tricky.
             // Let's rely on the individual fields being present in `data` OR existing in DB if not passed?
             // Actually, `updateProvider` is likely called by an Action that validates everything.
             // Let's construct it from `data` assuming `data` has the changes.

             // REALITY CHECK: If we only update 'enabled', we don't want to destroy oidcConfig.
             // So only update oidcConfig if we are updating OIDC fields.

             const isOidcUpdate = data.clientId || data.issuer || data.authorizationEndpoint;

             if (isOidcUpdate || data.type === "oidc") {
                  // We need to fetch existing to merge properly if partial
                  const existing = await prisma.ssoProvider.findUnique({ where: { id } });
                  if (existing) {
                      const newConfig = {
                          issuer: data.issuer ?? existing.issuer,
                          clientId: data.clientId ?? existing.clientId,
                          clientSecret: data.clientSecret ?? existing.clientSecret,
                          authorizationEndpoint: data.authorizationEndpoint ?? existing.authorizationEndpoint,
                          tokenEndpoint: data.tokenEndpoint ?? existing.tokenEndpoint,
                          userInfoEndpoint: data.userInfoEndpoint ?? existing.userInfoEndpoint,
                          jwksEndpoint: data.jwksEndpoint ?? existing.jwksEndpoint,
                      };
                      oidcConfigUpdate = JSON.stringify(newConfig);
                  }
             }
        }

        return prisma.ssoProvider.update({
            where: { id },
            data: {
                ...data,
                ...(oidcConfigUpdate ? { oidcConfig: oidcConfigUpdate } : {})
            }
        });
    }

    static async deleteProvider(id: string) {
        return prisma.ssoProvider.delete({
            where: { id }
        });
    }

    static async toggleProvider(id: string, enabled: boolean) {
        return prisma.ssoProvider.update({
            where: { id },
            data: { enabled }
        });
    }
}
