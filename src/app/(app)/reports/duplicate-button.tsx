"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DuplicateButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/${id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to duplicate report");
      const json = await res.json();
      router.push(`/reports/${json.id}/edit`);
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="icon" variant="ghost" title="Duplicate" onClick={onClick} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}
