import { MODULE_MANIFESTS } from "@/lib/modules/manifests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ModulesCatalogPage() {
  const byCategory = MODULE_MANIFESTS.reduce<Record<string, typeof MODULE_MANIFESTS>>((acc, m) => {
    (acc[m.category] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Module Catalog</h1>
      {Object.entries(byCategory).map(([category, modules]) => (
        <div key={category}>
          <h2 className="text-lg font-semibold capitalize mb-3">{category}</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <Card key={m.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    {m.name}
                    <Badge variant="outline">{m.id}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{m.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">{m.permissions.length} permissions</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
