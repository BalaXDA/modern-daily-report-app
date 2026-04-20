import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  computePlatformSummary,
  getActiveBugs,
  getNewBugsToday,
  PLATFORM_LABELS,
  PLATFORMS,
  OUTCOME_LABELS,
  totalsForReport,
  type ReportWithChildren,
} from "./report-helpers";
import type { TestOutcome } from "@prisma/client";

const colors = {
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  primary: "#1d4ed8",
  pass: "#059669",
  fail: "#dc2626",
  na: "#d97706",
  untested: "#64748b",
  bgSoft: "#f8fafc",
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: colors.text,
  },
  h1: { fontSize: 18, fontWeight: 700, color: colors.text },
  h2: { fontSize: 12, fontWeight: 700, marginTop: 14, marginBottom: 6 },
  small: { fontSize: 8, color: colors.muted },
  headerBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    backgroundColor: colors.bgSoft,
  },
  pillRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  pill: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    color: "white",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 8,
  },
  metaItem: { width: "23%" },
  metaLabel: { fontSize: 7, color: colors.muted, textTransform: "uppercase" },
  metaValue: { fontSize: 10, fontWeight: 700 },
  summaryBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  summaryText: { fontSize: 9, lineHeight: 1.4 },
  platformGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  platformCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 8,
  },
  platformTitle: { fontSize: 10, fontWeight: 700, marginBottom: 4 },
  countRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 1 },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    marginBottom: 10,
    overflow: "hidden",
  },
  tHead: {
    flexDirection: "row",
    backgroundColor: colors.bgSoft,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  tRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  th: {
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontWeight: 700,
    fontSize: 8,
    color: colors.muted,
    textTransform: "uppercase",
  },
  td: { paddingVertical: 5, paddingHorizontal: 6, fontSize: 8 },
  outcomePill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    fontSize: 7,
    color: "white",
    alignSelf: "flex-start",
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    textAlign: "center",
    fontSize: 7,
    color: colors.muted,
  },
});

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(d);
}

function outcomeColor(o: TestOutcome) {
  return o === "PASS" ? colors.pass : o === "FAIL" ? colors.fail : o === "NA" ? colors.na : colors.untested;
}

export function ReportPdfDocument({ report }: { report: ReportWithChildren }) {
  const platforms = computePlatformSummary(report.testResults);
  const totals = totalsForReport(report.testResults);
  const newBugs = getNewBugsToday(report.bugs);
  const activeBugs = getActiveBugs(report.bugs);
  const passPct = totals.total ? Math.round((totals.pass / totals.total) * 100) : 0;

  return (
    <Document
      title={report.title}
      author={report.preparedBy}
      subject={`QA daily report - ${report.productName} ${report.buildVersion}`}
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerBox}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.h1}>{report.title}</Text>
              <Text style={[styles.small, { marginTop: 4 }]}>
                {report.productName} - Build {report.buildVersion}
              </Text>
              <View style={styles.pillRow}>
                <Text
                  style={[
                    styles.pill,
                    { backgroundColor: report.status === "PUBLISHED" ? colors.pass : colors.na },
                  ]}
                >
                  {report.status}
                </Text>
                <Text style={[styles.pill, { backgroundColor: colors.primary }]}>
                  {passPct}% pass overall
                </Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 11, fontWeight: 700 }}>{fmtDate(report.reportDate)}</Text>
              <Text style={styles.small}>Prepared by {report.preparedBy}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Product</Text>
              <Text style={styles.metaValue}>{report.productName}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Build</Text>
              <Text style={styles.metaValue}>{report.buildVersion}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{fmtDate(report.reportDate)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Prepared by</Text>
              <Text style={styles.metaValue}>{report.preparedBy}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.h2}>Quick summary</Text>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>{report.summary || "No summary provided."}</Text>
        </View>

        <Text style={styles.h2}>Platform summary</Text>
        <View style={styles.platformGrid}>
          {PLATFORMS.map((p) => {
            const c = platforms[p];
            return (
              <View key={p} style={styles.platformCard}>
                <Text style={styles.platformTitle}>{PLATFORM_LABELS[p]}</Text>
                <View style={styles.countRow}>
                  <Text style={{ color: colors.pass }}>Pass</Text>
                  <Text>{c.pass}</Text>
                </View>
                <View style={styles.countRow}>
                  <Text style={{ color: colors.fail }}>Fail</Text>
                  <Text>{c.fail}</Text>
                </View>
                <View style={styles.countRow}>
                  <Text style={{ color: colors.na }}>NA</Text>
                  <Text>{c.na}</Text>
                </View>
                <View style={styles.countRow}>
                  <Text style={{ color: colors.untested }}>Untested</Text>
                  <Text>{c.untested}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.h2}>New bugs logged today ({newBugs.length})</Text>
        {newBugs.length === 0 ? (
          <Text style={styles.small}>No new bugs logged today.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tHead}>
              <Text style={[styles.th, { width: "13%" }]}>Jira ID</Text>
              <Text style={[styles.th, { width: "47%" }]}>Title</Text>
              <Text style={[styles.th, { width: "15%" }]}>Status</Text>
              <Text style={[styles.th, { width: "10%" }]}>Priority</Text>
              <Text style={[styles.th, { width: "8%" }]}>EPV</Text>
              <Text style={[styles.th, { width: "7%" }]}>New</Text>
            </View>
            {newBugs.map((b) => (
              <View key={b.id} style={styles.tRow} wrap={false}>
                <Text style={[styles.td, { width: "13%" }]}>{b.jiraId}</Text>
                <Text style={[styles.td, { width: "47%" }]}>{b.title}</Text>
                <Text style={[styles.td, { width: "15%" }]}>{b.status}</Text>
                <Text style={[styles.td, { width: "10%" }]}>{b.priority}</Text>
                <Text style={[styles.td, { width: "8%" }]}>{b.epvFlag ? "Yes" : "No"}</Text>
                <Text style={[styles.td, { width: "7%" }]}>Yes</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.h2}>Active bugs ({activeBugs.length})</Text>
        {activeBugs.length === 0 ? (
          <Text style={styles.small}>No active bugs.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tHead}>
              <Text style={[styles.th, { width: "13%" }]}>Jira ID</Text>
              <Text style={[styles.th, { width: "37%" }]}>Title</Text>
              <Text style={[styles.th, { width: "12%" }]}>Status</Text>
              <Text style={[styles.th, { width: "9%" }]}>Priority</Text>
              <Text style={[styles.th, { width: "7%" }]}>EPV</Text>
              <Text style={[styles.th, { width: "12%" }]}>Platform</Text>
              <Text style={[styles.th, { width: "10%" }]}>Owner</Text>
            </View>
            {activeBugs.map((b) => (
              <View key={b.id} style={styles.tRow} wrap={false}>
                <Text style={[styles.td, { width: "13%" }]}>{b.jiraId}</Text>
                <Text style={[styles.td, { width: "37%" }]}>{b.title}</Text>
                <Text style={[styles.td, { width: "12%" }]}>{b.status}</Text>
                <Text style={[styles.td, { width: "9%" }]}>{b.priority}</Text>
                <Text style={[styles.td, { width: "7%" }]}>{b.epvFlag ? "Yes" : "No"}</Text>
                <Text style={[styles.td, { width: "12%" }]}>
                  {b.platform ? PLATFORM_LABELS[b.platform] : "-"}
                </Text>
                <Text style={[styles.td, { width: "10%" }]}>{b.owner ?? "-"}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.h2}>Device configurations</Text>
        {report.devices.length === 0 ? (
          <Text style={styles.small}>No devices recorded.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tHead}>
              <Text style={[styles.th, { width: "16%" }]}>Platform</Text>
              <Text style={[styles.th, { width: "26%" }]}>OS</Text>
              <Text style={[styles.th, { width: "26%" }]}>Processor</Text>
              <Text style={[styles.th, { width: "10%" }]}>RAM</Text>
              <Text style={[styles.th, { width: "22%" }]}>Notes</Text>
            </View>
            {report.devices.map((d) => (
              <View key={d.id} style={styles.tRow} wrap={false}>
                <Text style={[styles.td, { width: "16%" }]}>{PLATFORM_LABELS[d.platform]}</Text>
                <Text style={[styles.td, { width: "26%" }]}>{d.osVersion}</Text>
                <Text style={[styles.td, { width: "26%" }]}>{d.processor}</Text>
                <Text style={[styles.td, { width: "10%" }]}>{d.ram}</Text>
                <Text style={[styles.td, { width: "22%" }]}>{d.notes ?? "-"}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.h2}>Detailed test results ({report.testResults.length})</Text>
        <View style={styles.table}>
          <View style={styles.tHead}>
            <Text style={[styles.th, { width: "12%" }]}>Testcase</Text>
            <Text style={[styles.th, { width: "37%" }]}>Title</Text>
            <Text style={[styles.th, { width: "21%" }]}>Suite</Text>
            <Text style={[styles.th, { width: "10%" }]}>Mac Intel</Text>
            <Text style={[styles.th, { width: "10%" }]}>Mac ARM</Text>
            <Text style={[styles.th, { width: "10%" }]}>Windows</Text>
          </View>
          {report.testResults.map((t) => (
            <View key={t.id} style={styles.tRow} wrap={false}>
              <Text style={[styles.td, { width: "12%" }]}>{t.testcaseId}</Text>
              <Text style={[styles.td, { width: "37%" }]}>{t.testcaseTitle}</Text>
              <Text style={[styles.td, { width: "21%" }]}>{t.testsuiteLabel}</Text>
              <View style={[styles.td, { width: "10%" }]}>
                <Text style={[styles.outcomePill, { backgroundColor: outcomeColor(t.macIntelResult) }]}>
                  {OUTCOME_LABELS[t.macIntelResult]}
                </Text>
              </View>
              <View style={[styles.td, { width: "10%" }]}>
                <Text style={[styles.outcomePill, { backgroundColor: outcomeColor(t.macArmResult) }]}>
                  {OUTCOME_LABELS[t.macArmResult]}
                </Text>
              </View>
              <View style={[styles.td, { width: "10%" }]}>
                <Text style={[styles.outcomePill, { backgroundColor: outcomeColor(t.windowsResult) }]}>
                  {OUTCOME_LABELS[t.windowsResult]}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${report.productName} - ${fmtDate(report.reportDate)}   |   Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
