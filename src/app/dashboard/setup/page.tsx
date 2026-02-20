import { getUserPermissions } from "@/lib/access-control";
import { PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { SetupWizard } from "@/components/dashboard/setup/setup-wizard";

export default async function SetupPage() {
    const permissions = await getUserPermissions();

    // Require at minimum source + destination + job write permissions
    const canSetup =
        permissions.includes(PERMISSIONS.SOURCES.WRITE) &&
        permissions.includes(PERMISSIONS.DESTINATIONS.WRITE) &&
        permissions.includes(PERMISSIONS.JOBS.WRITE);

    if (!canSetup) {
        redirect("/dashboard");
    }

    // Check optional permissions
    const canCreateVault = permissions.includes(PERMISSIONS.VAULT.WRITE);
    const canCreateNotification = permissions.includes(PERMISSIONS.NOTIFICATIONS.WRITE);

    // Only pass serializable props — Zod schemas cannot cross the Server→Client boundary
    return (
        <SetupWizard
            canCreateVault={canCreateVault}
            canCreateNotification={canCreateNotification}
        />
    );
}
