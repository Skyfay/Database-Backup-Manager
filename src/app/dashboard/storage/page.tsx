
"use client";

import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Database, Search } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { createColumns, FileInfo } from "./columns";

interface AdapterConfig {
    id: string;
    originalId: string;
    name: string;
    type: string;
    adapterId: string;
}

export default function StoragePage() {
    const [destinations, setDestinations] = useState<AdapterConfig[]>([]);
    const [sources, setSources] = useState<AdapterConfig[]>([]);
    const [selectedDestination, setSelectedDestination] = useState<string>("");

    const [files, setFiles] = useState<FileInfo[]>([]);
    const [loading, setLoading] = useState(false);

    // Delete Confirmation State
    const [fileToDelete, setFileToDelete] = useState<FileInfo | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Restore Modal State
    const [restoreFile, setRestoreFile] = useState<FileInfo | null>(null);
    const [targetSource, setTargetSource] = useState<string>("");
    const [targetDbName, setTargetDbName] = useState<string>("");
    const [restoring, setRestoring] = useState(false);
    const [restoreLogs, setRestoreLogs] = useState<string[] | null>(null);

    // Privileged restore state
    const [showPrivileged, setShowPrivileged] = useState(false);
    const [privUser, setPrivUser] = useState("root");
    const [privPass, setPrivPass] = useState("");

    // Advanced Restore State
    const [analyzedDbs, setAnalyzedDbs] = useState<string[]>([]);
    const [dbConfig, setDbConfig] = useState<{ id: string, name: string, targetName: string, selected: boolean }[]>([]);

    useEffect(() => {
        fetchAdapters();
    }, []);

    useEffect(() => {
        if (restoreFile) {
            analyzeBackup(restoreFile);
        }
    }, [restoreFile]);

    const analyzeBackup = async (file: FileInfo) => {
        try {
            const res = await fetch(`/api/storage/${selectedDestination}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: file.path })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.databases && data.databases.length > 0) {
                    setAnalyzedDbs(data.databases);
                    setDbConfig(data.databases.map((db: string) => ({
                        id: db,
                        name: db,
                        targetName: db,
                        selected: true
                    })));
                } else {
                     setAnalyzedDbs([]);
                     setDbConfig([]);
                }
            }
        } catch (e) {
            console.error("Analysis failed", e);
        }
    };

    useEffect(() => {
        if (selectedDestination) {
            fetchFiles(selectedDestination);
        } else {
            setFiles([]);
        }
    }, [selectedDestination]);

    const fetchAdapters = async () => {
        try {
            const res = await fetch("/api/adapters");
            if (res.ok) {
                const all = await res.json();
                setDestinations(all.filter((a: AdapterConfig) => a.type === "storage"));
                setSources(all.filter((a: AdapterConfig) => a.type === "database"));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchFiles = async (destId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/storage/${destId}/files`);
            if (res.ok) {
                setFiles(await res.json());
            } else {
                toast.error("Failed to fetch files");
            }
        } catch (e) {
            toast.error("Error fetching files");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (file: FileInfo) => {
        // Trigger download via API
        // Using window.location or hidden link
        const url = `/api/storage/${selectedDestination}/download?file=${encodeURIComponent(file.path)}`;
        window.open(url, '_blank');
    };

    const handleRestoreClick = (file: FileInfo) => {
        setRestoreFile(file);
        setTargetSource("");
        setTargetDbName("");
        setRestoreLogs(null);
        setShowPrivileged(false);
        setPrivPass("");
        setAnalyzedDbs([]);
        setDbConfig([]);
    };

    const handleDeleteClick = (file: FileInfo) => {
        setFileToDelete(file);
    };

    const confirmDelete = async () => {
        if (!fileToDelete) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/storage/${selectedDestination}/files`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: fileToDelete.path }),
            });

            if (res.ok) {
                toast.success("File deleted successfully");
                setFileToDelete(null);
                fetchFiles(selectedDestination); // Refresh list
            } else {
                const data = await res.json();
                toast.error("Failed to delete file: " + data.error);
            }
        } catch (error) {
            toast.error("Error deleting file");
        } finally {
            setDeleting(false);
        }
    };

    const confirmRestore = async (usePrivileged = false) => {
        if (!restoreFile || !targetSource) return;

        setRestoring(true);
        // Don't clear logs immediately if retrying
        setRestoreLogs(null);

        try {
            // Check if we use advanced mapping
            let mapping = undefined;
            if (analyzedDbs.length > 0) {
                 mapping = dbConfig.map(c => ({ originalName: c.name, targetName: c.targetName, selected: c.selected }));
            }

            // Add root auth info if privileged
            let auth = undefined;
            if (usePrivileged) {
                 auth = { user: privUser, password: privPass };
            }

            const payload: any = {
                 file: restoreFile.path,
                targetSourceId: targetSource,
                targetDatabaseName: targetDbName || undefined,
                databaseMapping: mapping,
                privilegedAuth: auth
            }

            const res = await fetch(`/api/storage/${selectedDestination}/restore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok && data.success) {
                toast.success("Restore completed successfully");
                setRestoreFile(null); // Close modal
            } else {
                toast.error("Restore failed");
                const logs = data.logs || [];
                if (logs.length > 0) {
                     setRestoreLogs(logs);
                     // Check for common permission errors to show retry UI
                     const logString = logs.join('\n');
                     if (logString.includes("Access denied") || logString.includes("User permissions?")) {
                         setShowPrivileged(true);
                     }
                } else {
                    setRestoreLogs(["Error: " + (data.error || "Unknown error")]);
                }
            }
        } catch (e) {
            toast.error("Restore request failed");
        } finally {
            setRestoring(false);
        }
    };

    const columns = useMemo(() => createColumns({
        onRestore: handleRestoreClick,
        onDownload: handleDownload,
        onDelete: handleDeleteClick
    }), [handleRestoreClick, handleDownload, handleDeleteClick]);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Storage Explorer</h2>

            <div className="flex items-center space-x-4">
                <div className="w-[300px]">
                    <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Destination" />
                        </SelectTrigger>
                        <SelectContent>
                            {destinations.map(d => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {selectedDestination && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Backups</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                             <div className="flex justify-center p-8">Loading files...</div>
                        ) : (
                             <DataTable columns={columns} data={files} />
                        )}
                    </CardContent>
                 </Card>
            )}

            {/* Restore Modal */}
            <Dialog open={!!restoreFile} onOpenChange={(o) => { if(!o && !restoring) setRestoreFile(null); }}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle>Restore Backup</DialogTitle>
                        <DialogDescription>
                            Restore <b>{restoreFile?.name}</b> to a database source.
                        </DialogDescription>
                    </DialogHeader>

                    {!restoreLogs ? (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Target Source</Label>
                                <Select value={targetSource} onValueChange={setTargetSource}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a database source" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {/* TODO: Ideally filter by compatible adapter types based on file naming convention or metadata */}
                                        {sources.map(s => (
                                            <SelectItem key={s.id} value={s.id}>
                                                <div className="flex items-center gap-2">
                                                    <Database className="h-4 w-4" />
                                                    <span>{s.name}</span>
                                                    <Badge variant="outline" className="text-[10px] h-4">{s.adapterId}</Badge>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {analyzedDbs.length > 0 ? (
                                <div className="space-y-2 border rounded-md p-3">
                                    <Label>Databases detected in Dump</Label>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                        {dbConfig.map((db, idx) => (
                                            <div key={db.id} className="flex items-center gap-2 p-2 bg-secondary/50 rounded-sm">
                                                <Checkbox
                                                    checked={db.selected}
                                                    onCheckedChange={(checked) => {
                                                        const newC = [...dbConfig];
                                                        newC[idx].selected = checked === true;
                                                        setDbConfig(newC);
                                                    }}
                                                />
                                                <div className="flex-1 grid grid-cols-2 gap-2 items-center">
                                                    <span className="text-sm font-medium truncate" title={db.name}>{db.name}</span>
                                                    <Input
                                                        className="h-7 text-xs"
                                                        placeholder="Target Name"
                                                        value={db.targetName}
                                                        onChange={e => {
                                                             const newC = [...dbConfig];
                                                             newC[idx].targetName = e.target.value;
                                                             setDbConfig(newC);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Uncheck to skip. Rename to restore to a different database.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label>Target Database Name (Optional)</Label>
                                    <Input
                                        placeholder="Enter to rename / restore as new..."
                                        value={targetDbName}
                                        onChange={(e) => setTargetDbName(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Leave empty to overwrite the original database (<b>Warning: Data will be lost</b>).
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                         <div className="space-y-4 py-4">
                            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm whitespace-pre-wrap break-all max-h-[400px] overflow-auto font-mono">
                                {restoreLogs.join('\n')}
                            </div>
                         </div>
                    )}

                    <DialogFooter>
                        {!restoreLogs ? (
                            <>
                                <Button variant="outline" onClick={() => setRestoreFile(null)} disabled={restoring}>Cancel</Button>
                                <Button onClick={() => confirmRestore(false)} disabled={!targetSource || restoring}>
                                    {restoring ? "Restoring..." : "Start Restore"}
                                </Button>
                            </>
                        ) : (
                            <div className="flex flex-col w-full gap-4">
                                {showPrivileged && (
                                    <div className="bg-muted p-4 rounded-md border text-sm space-y-3">
                                        <p className="font-semibold text-warning-foreground">Permission Denied?</p>
                                        <p className="text-muted-foreground">Try restoring using a privileged user (e.g., 'root') to create the database.</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label>Root User</Label>
                                                <Input value={privUser} onChange={e => setPrivUser(e.target.value)} placeholder="root" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Root Password</Label>
                                                <Input type="password" value={privPass} onChange={e => setPrivPass(e.target.value)} placeholder="Secret" />
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="w-full"
                                            onClick={() => confirmRestore(true)}
                                            disabled={restoring}
                                        >
                                            {restoring ? "Retrying as Root..." : "Retry with Privileges"}
                                        </Button>
                                    </div>
                                )}
                                <div className="flex justify-end gap-2">
                                     <Button variant="outline" onClick={() => setRestoreFile(null)}>Close</Button>
                                     <Button variant="secondary" onClick={() => { setRestoreLogs(null); setShowPrivileged(false); }}>Back to Settings</Button>
                                </div>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!fileToDelete} onOpenChange={(o) => { if(!o && !deleting) setFileToDelete(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Backup</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <b>{fileToDelete?.name}</b>?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFileToDelete(null)} disabled={deleting}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
                            {deleting ? "Deleting..." : "Delete Permanently"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
