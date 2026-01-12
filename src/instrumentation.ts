export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        console.log("Registering Application Instrumentation...");
        const { scheduler } = await import('@/lib/scheduler');
        await scheduler.init();

        const { ensureAdminUser } = await import('@/lib/auth-seeder');
        await ensureAdminUser();
    }
}
