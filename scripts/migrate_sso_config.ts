
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Migrating existing SSO providers to have oidcConfig...");
  const providers = await prisma.ssoProvider.findMany();

  for (const p of providers) {
    if (p.type === 'oidc') {
      console.log(`Updating provider ${p.name} (${p.providerId})...`);
      const config = {
        issuer: p.issuer,
        clientId: p.clientId,
        clientSecret: p.clientSecret,
        authorizationEndpoint: p.authorizationEndpoint,
        tokenEndpoint: p.tokenEndpoint,
        userInfoEndpoint: p.userInfoEndpoint,
        jwksEndpoint: p.jwksEndpoint,
      };

      await prisma.ssoProvider.update({
        where: { id: p.id },
        data: {
          oidcConfig: JSON.stringify(config)
        }
      });
      console.log(`Updated ${p.name}.`);
    } else {
        console.log(`Skipping non-oidc provider ${p.name}`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
