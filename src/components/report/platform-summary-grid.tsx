import { Card, CardContent } from "@/components/ui/card";
import { PLATFORMS, PLATFORM_LABELS, type PlatformSummary } from "@/lib/report-helpers";
import { CheckCircle2, XCircle, MinusCircle, Circle } from "lucide-react";

export function PlatformSummaryGrid({ summary }: { summary: PlatformSummary }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PLATFORMS.map((p) => {
        const c = summary[p];
        const total = c.total;
        const passPct = total ? Math.round((c.pass / total) * 100) : 0;
        return (
          <Card key={p} className="overflow-hidden">
            <div className="border-b bg-gradient-to-r from-slate-50 to-white px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{PLATFORM_LABELS[p]}</div>
                <div className="text-xs text-muted-foreground">{passPct}% pass</div>
              </div>
            </div>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 divide-x divide-y">
                <Stat icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Pass" value={c.pass} />
                <Stat icon={<XCircle className="h-4 w-4 text-rose-600" />} label="Fail" value={c.fail} />
                <Stat icon={<MinusCircle className="h-4 w-4 text-amber-600" />} label="NA" value={c.na} />
                <Stat icon={<Circle className="h-4 w-4 text-slate-400" />} label="Untested" value={c.untested} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
