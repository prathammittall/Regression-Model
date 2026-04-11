import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type { EvaluationResponse } from "../types";
import { CAPABILITY_LABELS } from "../types";

function scoreDeltaLabel(delta: number): string {
  if (delta > 0) {
    return `+${delta.toFixed(2)}`;
  }
  return delta.toFixed(2);
}

export async function downloadEvaluationPdf(data: EvaluationResponse): Promise<void> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;

  const generatedAt = new Date().toLocaleString();
  const summary = data.report.summary;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Regression Tester Evaluation Report", marginX, 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generated: ${generatedAt}`, marginX, 66);

  autoTable(doc, {
    startY: 84,
    head: [["Metric", "Value"]],
    body: [
      ["Total Prompts", String(summary.total_prompts)],
      ["Total Categories", String(summary.total_capabilities)],
      ["Overall Base Score", summary.overall_base_score.toFixed(2)],
      ["Overall FT Score", summary.overall_finetuned_score.toFixed(2)],
      ["Overall Delta", scoreDeltaLabel(summary.overall_difference)],
      ["Improved", String(summary.improved_count)],
      ["Stable", String(summary.stable_count)],
      ["Regressed", String(summary.regressed_count)],
    ],
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [34, 34, 34] },
    theme: "striped",
  });

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY
      ? (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 18
      : 300,
    head: [["Capability", "Base", "Fine-tuned", "Delta", "Status"]],
    body: data.report.capabilities.map((cap) => [
      CAPABILITY_LABELS[cap.name] || cap.name,
      cap.base_score.toFixed(2),
      cap.finetuned_score.toFixed(2),
      scoreDeltaLabel(cap.difference),
      cap.status,
    ]),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [34, 34, 34] },
    theme: "striped",
  });

  const afterCapabilitiesY = (
    doc as jsPDF & { lastAutoTable?: { finalY: number } }
  ).lastAutoTable?.finalY;

  if (data.report.failure_examples.length > 0) {
    autoTable(doc, {
      startY: afterCapabilitiesY ? afterCapabilitiesY + 18 : 500,
      head: [["Prompt", "Capability", "Base", "FT", "Drop"]],
      body: data.report.failure_examples.slice(0, 15).map((item) => [
        item.prompt.length > 72 ? `${item.prompt.slice(0, 72)}...` : item.prompt,
        CAPABILITY_LABELS[item.capability] || item.capability,
        item.base_score.toFixed(2),
        item.finetuned_score.toFixed(2),
        item.score_drop.toFixed(2),
      ]),
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [34, 34, 34] },
      theme: "striped",
    });
  }

  const afterFailuresY = (
    doc as jsPDF & { lastAutoTable?: { finalY: number } }
  ).lastAutoTable?.finalY;

  if (data.report.recommendations.length > 0) {
    autoTable(doc, {
      startY: afterFailuresY ? afterFailuresY + 18 : 650,
      head: [["Capability", "Severity", "Recommendation"]],
      body: data.report.recommendations.map((rec) => [
        CAPABILITY_LABELS[rec.capability] || rec.capability,
        rec.severity,
        rec.recommendation,
      ]),
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [34, 34, 34] },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 70 },
        2: { cellWidth: 310 },
      },
      theme: "striped",
    });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  doc.save(`evaluation-report-${timestamp}.pdf`);
}
