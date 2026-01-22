import { getUsers } from "@/app/actions/user";
import { getGroups } from "@/app/actions/group";
import { getSsoProviders } from "@/app/actions/oidc";
import { UserTable } from "./user-table";
import { GroupTable } from "./group-table";
import { AddSsoProviderDialog } from "@/components/oidc/add-sso-provider-dialog";
import { SsoProviderList } from "@/components/oidc/sso-provider-list";
import { CreateUserDialog } from "./create-user-dialog";
import { CreateGroupDialog } from "./create-group-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUserPermissions } from "@/lib/access-control";
import { PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function UsersPage() {
    const permissions = await getUserPermissions();

    const hasReadUsers = permissions.includes(PERMISSIONS.USERS.READ);
    const hasReadGroups = permissions.includes(PERMISSIONS.GROUPS.READ);

    if (!hasReadUsers && !hasReadGroups) {
        redirect("/dashboard");
    }

    const canManageUsers = permissions.includes(PERMISSIONS.USERS.WRITE);
    const canManageGroups = permissions.includes(PERMISSIONS.GROUPS.WRITE);
    const hasReadSettings = permissions.includes(PERMISSIONS.SETTINGS.READ);
    const hasWriteSettings = permissions.includes(PERMISSIONS.SETTINGS.WRITE);

    // Fetch data only if permission is granted, otherwise provide empty array to avoid server action errors
    const users = hasReadUsers ? await getUsers() : [];
    const groups = hasReadGroups ? await getGroups() : [];
    const ssoProviders = hasReadSettings ? await getSsoProviders() : [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Access Management</h2>
                    <p className="text-muted-foreground">
                        Manage users, groups and their permissions.
                    </p>
                </div>
            </div>

            <Tabs defaultValue={hasReadUsers ? "users" : "groups"} className="space-y-4">
                <TabsList>
                    {hasReadUsers && <TabsTrigger value="users">Users</TabsTrigger>}
                    {hasReadGroups && <TabsTrigger value="groups">Groups</TabsTrigger>}
                    {hasReadSettings && <TabsTrigger value="sso">SSO / OIDC</TabsTrigger>}
                </TabsList>
                {hasReadUsers && (
                    <TabsContent value="users" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>Users</CardTitle>
                                        <CardDescription>Manage system users and their assignments.</CardDescription>
                                    </div>
                                    {canManageUsers && <CreateUserDialog />}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <UserTable data={users} groups={groups} canManage={canManageUsers} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
                {hasReadGroups && (
                    <TabsContent value="groups" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>Groups</CardTitle>
                                        <CardDescription>Manage permission groups.</CardDescription>
                                    </div>
                                    {canManageGroups && <CreateGroupDialog />}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <GroupTable data={groups} canManage={canManageGroups} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
                {hasReadSettings && (
                    <TabsContent value="sso" className="space-y-4">
                        <Card>
                             <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>Single Sign-On</CardTitle>
                                        <CardDescription>Manage OpenID Connect providers.</CardDescription>
                                    </div>
                                    {hasWriteSettings && <AddSsoProviderDialog />}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <SsoProviderList providers={ssoProviders} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
