import { AppearanceForm } from "@/components/settings/appearance-form";
import { AccountForm } from "@/components/settings/account-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/auth";

export default async function SettingsPage() {
    const session = await auth();
    const user = session?.user || {};

    return (
         <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
            </div>
             <Tabs defaultValue="account" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="account">Account</TabsTrigger>
                    <TabsTrigger value="appearance">Appearance</TabsTrigger>
                </TabsList>
                <TabsContent value="account" className="space-y-4">
                    <AccountForm user={user} />
                </TabsContent>
                <TabsContent value="appearance" className="space-y-4">
                     <AppearanceForm />
                </TabsContent>
            </Tabs>
        </div>
    )
}
