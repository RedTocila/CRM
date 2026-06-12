"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Plus, RefreshCw } from "lucide-react";

interface ModulePageProps<T extends { id: string } & Record<string, unknown>> {
  title: string;
  description?: string;
  apiPath: string;
  columns: Column<T>[];
  createLabel?: string;
  onCreate?: () => void;
}

export function ModulePage<T extends { id: string } & Record<string, unknown>>({
  title,
  description,
  apiPath,
  columns,
  createLabel = "Add New",
  onCreate,
}: ModulePageProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiPath);
      const json = await res.json();
      setData(json.data ?? json ?? []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiPath]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {onCreate && (
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {createLabel}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All {title}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : (
            <DataTable columns={columns} data={data} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
