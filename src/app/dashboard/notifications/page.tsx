export default function NotificationsPage() {
    return (
         <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
            </div>
             <div className="rounded-md border p-8 text-center text-muted-foreground">
                No notification channels configured.
            </div>
        </div>
    )
}
