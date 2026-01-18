
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { ADAPTER_DEFINITIONS, AdapterDefinition } from "@/lib/adapters/definitions";

import { AdapterManagerProps, AdapterConfig } from "./types";
import { AdapterCard } from "./adapter-card";
import { AdapterForm } from "./adapter-form";

export function AdapterManager({ type, title, description, canManage = true }: AdapterManagerProps) {
    const [configs, setConfigs] = useState<AdapterConfig[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [availableAdapters, setAvailableAdapters] = useState<AdapterDefinition[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        // Filter definitions by type
        setAvailableAdapters(ADAPTER_DEFINITIONS.filter(d => d.type === type));
        fetchConfigs();
    }, [type]);

    const fetchConfigs = async () => {
        try {
            const res = await fetch(`/api/adapters?type=${type}`);
            if (res.ok) {
                const data = await res.json();
                setConfigs(data);
            } else {
                 const data = await res.json();
                 toast.error(data.error || "Failed to load configurations");
            }
        } catch (error) {
            toast.error("Failed to load configurations");
        }
    };

    const handleDelete = (id: string) => {
        setDeletingId(id);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;
        const id = deletingId;

        try {
            const res = await fetch(`/api/adapters/${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (res.ok && data.success) {
                toast.success("Configuration deleted");
                setConfigs(configs.filter(c => c.id !== id));
            } else {
                toast.error(data.error || "Failed to delete");
            }
        } catch (error) {
             toast.error("Error deleting configuration");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
                    <p className="text-muted-foreground">{description}</p>
                </div>
                {canManage && (
                    <Button onClick={() => { setEditingId(null); setIsDialogOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Add New
                    </Button>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {configs.map((config) => (
                    <AdapterCard
                        key={config.id}
                        config={config}
                        definition={ADAPTER_DEFINITIONS.find(d => d.id === config.adapterId)!}
                        onDelete={() => handleDelete(config.id)}
                        onEdit={() => { setEditingId(config.id); setIsDialogOpen(true); }}
                        canManage={canManage}
                    />
                ))}
            </div>

            {configs.length === 0 && (
                 <div className="rounded-md border p-8 text-center text-muted-foreground bg-muted/10">
                    {canManage
                        ? (type === 'notification' ? 'No notifications found. Click "Add New" to get started.' : 'No configurations found. Click "Add New" to get started.')
                        : 'No configurations found.'}
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Edit Configuration" : (type === 'notification' ? "Add New Notification" : (type === 'database' ? "Add New Source" : (type === 'storage' ? "Add New Destination" : "Add New Configuration")))}</DialogTitle>
                    </DialogHeader>
                    {isDialogOpen && (
                        <AdapterForm
                            type={type}
                            adapters={availableAdapters}
                            onSuccess={() => { setIsDialogOpen(false); fetchConfigs(); }}
                            initialData={editingId ? configs.find(c => c.id === editingId) : undefined}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this configuration.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
