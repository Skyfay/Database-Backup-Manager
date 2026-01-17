import { getUsers } from "@/app/actions/user";
import { UserTable } from "./user-table";
import { CreateUserDialog } from "./create-user-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function UsersPage() {
    const users = await getUsers();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Access Management</h2>
                    <p className="text-muted-foreground">
                        Manage users, groups and their permissions.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="users" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="groups">Groups</TabsTrigger>
                </TabsList>
                <TabsContent value="users" className="space-y-4">
                    <div className="flex justify-end">
                        <CreateUserDialog />
                    </div>
                    <UserTable data={users} />
                </TabsContent>
                <TabsContent value="groups" className="space-y-4">
                    {/* Groups content will be implemented in the next step */}
                    <div className="flex items-center justify-center p-8 border border-dashed rounded-lg">
                        <p className="text-muted-foreground">Groups management coming soon...</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
