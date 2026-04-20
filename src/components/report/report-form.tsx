"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Save, Send, Loader2, FileDown, Eye } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlatformSummaryGrid } from "./platform-summary-grid";
import { PassFailTrendChart, BugTrendChart } from "@/components/charts/trend-charts";

import { reportSchema, type ReportInput } from "@/lib/validators";
import {
  computePlatformSummary,
  PLATFORM_LABELS,
  OUTCOME_LABELS,
  type DailyTrendPoint,
} from "@/lib/report-helpers";
import { Platform, TestOutcome, BugPriority } from "@prisma/client";

type Props = {
  initial?: Partial<ReportInput> & { id?: string };
  reportId?: string;
  trend: DailyTrendPoint[];
};

const PRIORITIES: BugPriority[] = ["P0", "P1", "P2", "P3", "P4"];
const PLATFORMS_ARR: Platform[] = ["MAC_INTEL", "MAC_ARM", "WINDOWS"];
const OUTCOMES: TestOutcome[] = ["PASS", "FAIL", "NA", "UNTESTED"];

function defaultValues(initial?: Partial<ReportInput>): ReportInput {
  const today = new Date();
  today.setHours(9, 30, 0, 0);
  return {
    title: initial?.title ?? "",
    productName: initial?.productName ?? "Adobe Creative Cloud Desktop",
    buildVersion: initial?.buildVersion ?? "28.9.8",
    reportDate: initial?.reportDate ? new Date(initial.reportDate) : today,
    preparedBy: initial?.preparedBy ?? "",
    summary: initial?.summary ?? "",
    status: initial?.status ?? "DRAFT",
    bugs: initial?.bugs ?? [],
    devices:
      initial?.devices ??
      PLATFORMS_ARR.map((platform) => ({
        platform,
        osVersion: "",
        processor: "",
        ram: "",
        notes: "",
      })),
    testResults: initial?.testResults ?? [],
  };
}

export function ReportForm({ initial, reportId, trend }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"none" | "draft" | "publish">("none");

  const form = useForm<ReportInput>({
    resolver: zodResolver(reportSchema),
    defaultValues: defaultValues(initial),
    mode: "onBlur",
  });

  const bugs = useFieldArray({ control: form.control, name: "bugs" });
  const devices = useFieldArray({ control: form.control, name: "devices" });
  const tests = useFieldArray({ control: form.control, name: "testResults" });

  const watchedTests = form.watch("testResults");
  const platformSummary = useMemo(
    () =>
      computePlatformSummary(
        watchedTests.map((t, i) => ({
          id: t.id ?? `tmp-${i}`,
          reportId: reportId ?? "",
          testcaseId: t.testcaseId,
          testcaseTitle: t.testcaseTitle,
          testsuiteLabel: t.testsuiteLabel,
          macIntelResult: t.macIntelResult,
          macArmResult: t.macArmResult,
          windowsResult: t.windowsResult,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      ),
    [watchedTests, reportId],
  );

  async function onSubmit(values: ReportInput, status: "DRAFT" | "PUBLISHED") {
    setSubmitting(status === "DRAFT" ? "draft" : "publish");
    try {
      const payload = { ...values, status };
      const res = await fetch(reportId ? `/api/reports/${reportId}` : "/api/reports", {
        method: reportId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save");
      }
      const json = await res.json();
      const id = json.id ?? reportId;
      router.push(`/reports/${id}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      setSubmitting("none");
    }
  }

  const dateValue = form.watch("reportDate");
  const dateInputValue =
    dateValue instanceof Date && !isNaN(dateValue.getTime())
      ? dateValue.toISOString().slice(0, 10)
      : "";

  return (
    <form
      onSubmit={form.handleSubmit((v) => onSubmit(v, v.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT"))}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Report info</CardTitle>
          <CardDescription>Identify this report - title, product, build, and prep info.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Title" error={form.formState.errors.title?.message}>
            <Input placeholder="Daily QA Report - ..." {...form.register("title")} />
          </Field>
          <Field label="Prepared by" error={form.formState.errors.preparedBy?.message}>
            <Input placeholder="Your name" {...form.register("preparedBy")} />
          </Field>
          <Field label="Product name" error={form.formState.errors.productName?.message}>
            <Input {...form.register("productName")} />
          </Field>
          <Field label="Build version" error={form.formState.errors.buildVersion?.message}>
            <Input {...form.register("buildVersion")} />
          </Field>
          <Field label="Report date" error={form.formState.errors.reportDate?.message as string | undefined}>
            <Input
              type="date"
              value={dateInputValue}
              onChange={(e) => form.setValue("reportDate", new Date(e.target.value), { shouldValidate: true })}
            />
          </Field>
          <Field label="Status">
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick summary</CardTitle>
          <CardDescription>Today's testing focus, observations, blockers.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={5}
            placeholder="Brief overview of what was tested today..."
            {...form.register("summary")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>New bugs logged today</CardTitle>
            <CardDescription>Bugs filed during this reporting day.</CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              bugs.append({
                jiraId: "",
                title: "",
                status: "Open",
                priority: "P3",
                epvFlag: false,
                platform: null,
                isNewToday: true,
                owner: "",
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add bug
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {bugs.fields.length === 0 && <Empty text="No bugs added yet." />}
          {bugs.fields.map((field, idx) => (
            <BugRow
              key={field.id}
              idx={idx}
              register={form.register}
              control={form.control}
              onRemove={() => bugs.remove(idx)}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Device configurations</CardTitle>
          <CardDescription>Hardware/OS configurations exercised today.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>OS version</TableHead>
                <TableHead>Processor</TableHead>
                <TableHead>RAM</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.fields.map((field, idx) => (
                <TableRow key={field.id}>
                  <TableCell className="w-[160px]">
                    <Controller
                      control={form.control}
                      name={`devices.${idx}.platform`}
                      render={({ field: f }) => (
                        <Select value={f.value} onValueChange={f.onChange}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLATFORMS_ARR.map((p) => (
                              <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </TableCell>
                  <TableCell><Input className="h-9" {...form.register(`devices.${idx}.osVersion`)} /></TableCell>
                  <TableCell><Input className="h-9" {...form.register(`devices.${idx}.processor`)} /></TableCell>
                  <TableCell className="w-[120px]"><Input className="h-9" {...form.register(`devices.${idx}.ram`)} /></TableCell>
                  <TableCell><Input className="h-9" {...form.register(`devices.${idx}.notes`)} /></TableCell>
                  <TableCell>
                    <Button type="button" size="icon" variant="ghost" onClick={() => devices.remove(idx)}>
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                devices.append({
                  platform: "MAC_INTEL",
                  osVersion: "",
                  processor: "",
                  ram: "",
                  notes: "",
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add device
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Detailed test results</CardTitle>
            <CardDescription>Per platform outcomes drive the platform summary automatically.</CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              tests.append({
                testcaseId: "",
                testcaseTitle: "",
                testsuiteLabel: "",
                macIntelResult: "UNTESTED",
                macArmResult: "UNTESTED",
                windowsResult: "UNTESTED",
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add test case
          </Button>
        </CardHeader>
        <CardContent>
          {tests.fields.length === 0 ? (
            <Empty text="No test cases added yet." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Testcase ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Suite / Label</TableHead>
                    <TableHead>Mac Intel</TableHead>
                    <TableHead>Mac ARM</TableHead>
                    <TableHead>Windows</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.fields.map((field, idx) => (
                    <TableRow key={field.id}>
                      <TableCell className="w-[140px]">
                        <Input className="h-9" {...form.register(`testResults.${idx}.testcaseId`)} />
                      </TableCell>
                      <TableCell><Input className="h-9" {...form.register(`testResults.${idx}.testcaseTitle`)} /></TableCell>
                      <TableCell className="w-[180px]">
                        <Input className="h-9" {...form.register(`testResults.${idx}.testsuiteLabel`)} />
                      </TableCell>
                      <OutcomeCell control={form.control} name={`testResults.${idx}.macIntelResult`} />
                      <OutcomeCell control={form.control} name={`testResults.${idx}.macArmResult`} />
                      <OutcomeCell control={form.control} name={`testResults.${idx}.windowsResult`} />
                      <TableCell>
                        <Button type="button" size="icon" variant="ghost" onClick={() => tests.remove(idx)}>
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auto-calculated platform summary</CardTitle>
          <CardDescription>Updates live as you change test outcomes above.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlatformSummaryGrid summary={platformSummary} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <PassFailTrendChart data={trend} />
        <BugTrendChart data={trend} />
      </div>

      <div className="sticky bottom-4 z-30 flex flex-wrap items-center justify-end gap-2 rounded-2xl border bg-white/95 p-3 shadow-lg backdrop-blur">
        {reportId && (
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/reports/${reportId}`}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/reports/${reportId}/pdf`} target="_blank" rel="noreferrer">
                <FileDown className="mr-2 h-4 w-4" />
                Export PDF
              </a>
            </Button>
          </>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={submitting !== "none"}
          onClick={form.handleSubmit((v) => onSubmit(v, "DRAFT"))}
        >
          {submitting === "draft" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save draft
        </Button>
        <Button
          type="button"
          disabled={submitting !== "none"}
          onClick={form.handleSubmit((v) => onSubmit(v, "PUBLISHED"))}
        >
          {submitting === "publish" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Publish
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function OutcomeCell({
  control,
  name,
}: {
  control: ReturnType<typeof useForm<ReportInput>>["control"];
  name: `testResults.${number}.macIntelResult` | `testResults.${number}.macArmResult` | `testResults.${number}.windowsResult`;
}) {
  return (
    <TableCell className="w-[130px]">
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OUTCOMES.map((o) => (
                <SelectItem key={o} value={o}>{OUTCOME_LABELS[o]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </TableCell>
  );
}

function BugRow({
  idx,
  register,
  control,
  onRemove,
}: {
  idx: number;
  register: ReturnType<typeof useForm<ReportInput>>["register"];
  control: ReturnType<typeof useForm<ReportInput>>["control"];
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border bg-slate-50/40 p-3">
      <div className="grid gap-3 md:grid-cols-12">
        <div className="md:col-span-2">
          <Label className="text-xs">Jira ID</Label>
          <Input className="h-9" placeholder="CCD-1234" {...register(`bugs.${idx}.jiraId`)} />
        </div>
        <div className="md:col-span-4">
          <Label className="text-xs">Title</Label>
          <Input className="h-9" {...register(`bugs.${idx}.title`)} />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Status</Label>
          <Input className="h-9" {...register(`bugs.${idx}.status`)} />
        </div>
        <div className="md:col-span-1">
          <Label className="text-xs">Priority</Label>
          <Controller
            control={control}
            name={`bugs.${idx}.priority`}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Platform</Label>
          <Controller
            control={control}
            name={`bugs.${idx}.platform`}
            render={({ field }) => (
              <Select
                value={field.value ?? "NONE"}
                onValueChange={(v) => field.onChange(v === "NONE" ? null : v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">—</SelectItem>
                  {PLATFORMS_ARR.map((p) => (
                    <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="md:col-span-1">
          <Label className="text-xs">EPV</Label>
          <Controller
            control={control}
            name={`bugs.${idx}.epvFlag`}
            render={({ field }) => (
              <div className="flex h-9 items-center">
                <Checkbox
                  checked={!!field.value}
                  onCheckedChange={(v) => field.onChange(!!v)}
                />
              </div>
            )}
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Owner (optional)</Label>
          <Input className="h-9" {...register(`bugs.${idx}.owner`)} />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">New today?</Label>
          <Controller
            control={control}
            name={`bugs.${idx}.isNewToday`}
            render={({ field }) => (
              <div className="flex h-9 items-center gap-2">
                <Checkbox
                  checked={!!field.value}
                  onCheckedChange={(v) => field.onChange(!!v)}
                />
                <Badge variant={field.value ? "success" : "muted"}>
                  {field.value ? "New" : "Carry-over"}
                </Badge>
              </div>
            )}
          />
        </div>
      </div>
      <div className="mt-2 flex justify-end">
        <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
          <Trash2 className="mr-2 h-4 w-4 text-rose-600" />
          Remove
        </Button>
      </div>
    </div>
  );
}
