const el = (id) => document.getElementById(id);

function fmtScore(x) {
  if (typeof x !== "number" || Number.isNaN(x)) return "—";
  return x.toFixed(2);
}

function fmtDelta(x) {
  if (typeof x !== "number" || Number.isNaN(x)) return "—";
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(2)}`;
}

function badge(status) {
  const cls =
    status === "IMPROVED" ? "b-green" : status === "REGRESSED" ? "b-red" : "b-yellow";
  return `<span class="badge ${cls}">${status}</span>`;
}

function colorFor(status) {
  if (status === "IMPROVED") return { fill: "rgba(46, 204, 113, 0.85)", pct: 75 };
  if (status === "REGRESSED") return { fill: "rgba(255, 77, 77, 0.85)", pct: 25 };
  return { fill: "rgba(241, 196, 15, 0.85)", pct: 50 };
}

function renderSummary(summary) {
  const body = el("resultsBody");
  body.innerHTML = "";
  for (const row of summary) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-transform:capitalize;font-weight:750">${row.capability}</td>
      <td>${fmtScore(row.base_score)}</td>
      <td>${fmtScore(row.finetuned_score)}</td>
      <td>${fmtDelta(row.delta)}</td>
      <td>${badge(row.status)}</td>
    `;
    body.appendChild(tr);
  }
}

function renderHeatmap(summary) {
  const hm = el("heatmap");
  hm.innerHTML = "";
  for (const row of summary) {
    const { fill, pct } = colorFor(row.status);
    const card = document.createElement("div");
    card.className = "heatCell";
    card.innerHTML = `
      <div class="heatTop">
        <div class="heatCap">${row.capability}</div>
        <div class="heatDelta">Δ ${fmtDelta(row.delta)}</div>
      </div>
      <div class="heatBar">
        <div class="heatFill" style="width:${pct}%;background:${fill}"></div>
      </div>
      <div style="margin-top:10px;color:var(--muted);font-size:12px">
        Base ${fmtScore(row.base_score)} → Fine ${fmtScore(row.finetuned_score)}
      </div>
    `;
    hm.appendChild(card);
  }
}

function renderDiagnosis(items) {
  const root = el("diagnosis");
  root.innerHTML = "";
  if (!items || items.length === 0) {
    root.innerHTML = `<div class="diagItem"><div class="diagTitle">No major regressions detected</div><div class="diagReason">Try running again or enabling the judge.</div></div>`;
    return;
  }
  for (const it of items) {
    const div = document.createElement("div");
    div.className = "diagItem";
    const fixes = (it.fixes || []).map((f) => `<li>${f}</li>`).join("");
    div.innerHTML = `
      <div class="diagTitle" style="text-transform:capitalize">${it.capability}: ${it.issue}</div>
      <div class="diagReason">${it.reason}</div>
      <ul class="diagFixes">${fixes}</ul>
    `;
    root.appendChild(div);
  }
}

function renderDiffs(runs) {
  const root = el("diffs");
  root.innerHTML = "";
  for (const r of runs) {
    const item = document.createElement("div");
    item.className = "diffItem";
    item.innerHTML = `
      <div class="diffHead">
        <div class="diffQ"><span style="opacity:.9;text-transform:capitalize">${r.capability}</span> — ${escapeHtml(
      r.question
    )}</div>
        <div>${badge(r.status)} <span style="color:var(--muted);font-size:12px;margin-left:8px">Δ ${fmtDelta(
      r.delta
    )}</span></div>
      </div>
      <div class="diffBody">
        <div class="pane">
          <div class="paneTitle">Base output</div>
          <div class="paneText">${escapeHtml(r.base_output || "")}</div>
          <div style="margin-top:10px;color:var(--muted);font-size:12px">Rule ${fmtScore(
            r.base_rule_score
          )} · Final ${fmtScore(r.base_final_score)}</div>
        </div>
        <div class="pane" style="background:rgba(255,255,255,0.015)">
          <div class="paneTitle">Simulated fine-tuned (legal) output</div>
          <div class="paneText">${escapeHtml(r.finetuned_output || "")}</div>
          <div style="margin-top:10px;color:var(--muted);font-size:12px">Rule ${fmtScore(
            r.finetuned_rule_score
          )} · Final ${fmtScore(r.finetuned_final_score)}</div>
        </div>
      </div>
    `;
    root.appendChild(item);
  }
}

function escapeHtml(s) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function run() {
  const btn = el("runBtn");
  const spinner = el("spinner");
  btn.disabled = true;
  spinner.classList.remove("hidden");

  try {
    const useJudge = el("useJudge").checked;
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ use_judge: useJudge }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt);
    }
    const data = await res.json();
    el("metaLine").textContent = `Endpoint: ${data.meta.endpoint} · Model: ${data.meta.model} · Judge: ${
      data.meta.use_judge ? "on" : "off"
    }`;
    renderSummary(data.summary || []);
    renderHeatmap(data.summary || []);
    renderDiagnosis(data.diagnosis || []);
    renderDiffs(data.runs || []);
  } catch (e) {
    el("metaLine").textContent = `Error: ${String(e.message || e)}`;
  } finally {
    spinner.classList.add("hidden");
    btn.disabled = false;
  }
}

el("runBtn").addEventListener("click", run);

