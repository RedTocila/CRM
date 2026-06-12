"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Download, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { apiErrorMessage, formatLabel } from "@/lib/utils";

type DocumentRow = {
  id: string;
  name: string;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
};

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const apiPath = `/api/v1/${tenantSlug}/documents`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiPath);
      const json = await res.json();
      if (!res.ok) {
        toast.error(apiErrorMessage(json.error, "Failed to load documents"));
        setData([]);
        return;
      }
      setData(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${apiPath}/upload`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        toast.error(apiErrorMessage(json.error, "Upload failed"));
        return;
      }
      toast.success(`Uploaded ${file.name}`);
      fetchData();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const res = await fetch(`${apiPath}/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      toast.error(apiErrorMessage(json.error, "Delete failed"));
      return;
    }
    toast.success("Document deleted");
    fetchData();
  };

  const columns: Column<DocumentRow>[] = [
    { key: "name", header: "Name" },
    {
      key: "mimeType",
      header: "Type",
      render: (row) => formatLabel(row.mimeType?.split("/")[1] ?? row.mimeType ?? "file"),
    },
    {
      key: "size",
      header: "Size",
      render: (row) => formatBytes(row.size),
    },
    {
      key: "createdAt",
      header: "Uploaded",
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            asChild
            title="Download"
          >
            <a href={`${apiPath}/${row.id}/download`} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Delete"
            onClick={() => handleDelete(row.id, row.name)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Documents" description="Upload and manage files in Supabase Storage">
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
        <Button size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? "Uploading…" : "Upload file"}
        </Button>
      </PageHeader>
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <DataTable columns={columns} data={data} emptyMessage="No documents yet — upload your first file." />
      )}
    </div>
  );
}
