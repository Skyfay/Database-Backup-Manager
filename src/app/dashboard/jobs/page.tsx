import { getUserPermissions } from "@/lib/access-control";
import { PERMISSIONS } from "@/lib/permissions";
import { JobsClient } from "./jobs-client";

export default async function JobsPage() {
    const permissions = await getUserPermissions();
    const canManage = permissions.includes(PERMISSIONS.JOBS.WRITE);
    const canExecute = permissions.includes(PERMISSIONS.JOBS.EXECUTE);

    return <JobsClient canManage={canManage} canExecute={canExecute} />;
}
