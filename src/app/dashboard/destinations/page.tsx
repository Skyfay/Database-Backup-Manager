import { AdapterManager } from "@/components/adapter/adapter-manager";
import { getUserPermissions } from "@/lib/access-control";
import { PERMISSIONS } from "@/lib/permissions";

export default async function DestinationsPage() {
    const permissions = await getUserPermissions();
    const canManage = permissions.includes(PERMISSIONS.DESTINATIONS.WRITE);

    return (
         <AdapterManager
            type="storage"
            title="Destinations"
            description="Configure where your backups should be stored."
            canManage={canManage}
        />
    )
}
