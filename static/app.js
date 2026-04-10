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

function fmtPct(x) {
  if (typeof x !== "number" || Number.isNaN(x)) return "—";
  return `${(x * 100).toFixed(1)}%`;
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
      <td>${row.cases ?? "—"}</td>
      <td>${fmtScore(row.base_score)}</td>
      <td>${fmtScore(row.finetuned_score)}</td>
      <td>${fmtDelta(row.delta)}</td>
      <td>${fmtPct(row.base_pass_rate)}</td>
      <td>${fmtPct(row.finetuned_pass_rate)}</td>
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

function renderComparison(c) {
  const root = el("comparison");
  if (!c) {
    root.innerHTML = "";
    return;
  }

  const imp = (c.top_improvements || [])
    .map(
      (x) =>
        `<li><strong>${x.capability}</strong> · ${escapeHtml(x.question)} <span class="miniDelta">${fmtDelta(
          x.delta
        )}</span></li>`
    )
    .join("");
  const reg = (c.top_regressions || [])
    .map(
      (x) =>
        `<li><strong>${x.capability}</strong> · ${escapeHtml(x.question)} <span class="miniDelta">${fmtDelta(
          x.delta
        )}</span></li>`
    )
    .join("");

  root.innerHTML = `
    <div class="kpis">
      <div class="kpi"><span>Total Cases</span><strong>${c.total_cases ?? 0}</strong></div>
      <div class="kpi"><span>Overall Delta</span><strong>${fmtDelta(c.overall_delta)}</strong></div>
      <div class="kpi"><span>Improved Rate</span><strong>${fmtPct(c.improved_rate)}</strong></div>
      <div class="kpi"><span>Regressed Rate</span><strong>${fmtPct(c.regressed_rate)}</strong></div>
      <div class="kpi"><span>Base Avg</span><strong>${fmtScore(c.base_average)}</strong></div>
      <div class="kpi"><span>Fine Avg</span><strong>${fmtScore(c.finetuned_average)}</strong></div>
    </div>
    <div class="tops">
      <div>
        <div class="topTitle">Top Improvements</div>
        <ul class="topList">${imp || "<li>No improvements detected.</li>"}</ul>
      </div>
      <div>
        <div class="topTitle">Top Regressions</div>
        <ul class="topList">${reg || "<li>No regressions detected.</li>"}</ul>
      </div>
    </div>
  `;
}

function renderSingleCompare(data) {
  const root = el("singleCompare");
  if (!data) {
    root.innerHTML = "";
    return;
  }

  const winner = data.comparison?.winner || "TIE";
  const winnerBadge =
    winner === "FINETUNED"
      ? badge("IMPROVED")
      : winner === "BASE"
      ? badge("REGRESSED")
      : badge("STABLE");

  root.innerHTML = `
    <div class="singleTop">
      <div><strong>Winner:</strong> ${winner}</div>
      <div>${winnerBadge}</div>
      <div><strong>Delta Rating:</strong> ${fmtDelta(data.comparison?.delta_rating ?? 0)}</div>
    </div>
    <div class="singleGrid">
      <div class="pane">
        <div class="paneTitle">Base Output</div>
        <div class="paneScore">Rating (0-5): ${fmtScore(data.base?.rating_0_to_5)}</div>
        <div class="paneText">${escapeHtml(data.base?.output || "")}</div>
      </div>
      <div class="pane" style="background:rgba(255,255,255,0.015)">
        <div class="paneTitle">Fine-Tuned Output</div>
        <div class="paneScore">Rating (0-5): ${fmtScore(data.finetuned?.rating_0_to_5)}</div>
        <div class="paneText">${escapeHtml(data.finetuned?.output || "")}</div>
      </div>
    </div>
  `;
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
  const maxShown = 60;
  const safeRuns = (runs || []).slice(0, maxShown);
  if ((runs || []).length > maxShown) {
    const note = document.createElement("div");
    note.className = "diagItem";
    note.innerHTML = `<div class="diagReason">Showing first ${maxShown} diffs out of ${(runs || []).length} total for UI performance.</div>`;
    root.appendChild(note);
  }
  for (const r of safeRuns) {
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
    const qpdInputA = Number(el("qpd").value || 100);
    const qpdInputB = Number(el("qpd2").value || 100);
    const preset = Number(el("quickPreset").value || 100);
    const qpd = Math.max(1, Math.min(500, qpdInputA || qpdInputB || preset));
    el("qpd").value = String(qpd);
    el("qpd2").value = String(qpd);

    const useJudge = el("useJudge").checked;
    const level = el("level").value;
    const endpoint = (el("endpoint").value || "").trim();
    const model = (el("model").value || "").trim();
    const finetunedEndpoint = (el("finetunedEndpoint").value || "").trim();
    const finetunedModel = (el("finetunedModel").value || "").trim();

    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        use_judge: useJudge,
        level,
        questions_per_domain: qpd,
        lmstudio_base_url: endpoint,
        base_model: model,
        finetuned_base_url: finetunedEndpoint || null,
        finetuned_model: finetunedModel || null,
        model,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt);
    }
    const data = await res.json();
    el("metaLine").textContent = `Base: ${data.meta.base_endpoint} (${data.meta.base_model}) · Fine: ${
      data.meta.finetuned_endpoint
    } (${data.meta.finetuned_model}) · Level: ${data.meta.level} · Q/domain: ${
      data.meta.questions_per_domain
    } · Judge: ${data.meta.use_judge ? "on" : "off"}`;
    renderSummary(data.summary || []);
    renderHeatmap(data.summary || []);
    renderComparison(data.comparison || null);
    renderDiagnosis(data.diagnosis || []);
    renderDiffs(data.runs || []);
    el("promptTemplate").textContent = data.meta.recommended_finetune_retrieval_prompt || "";
  } catch (e) {
    el("metaLine").textContent = `Error: ${String(e.message || e)}`;
  } finally {
    spinner.classList.add("hidden");
    btn.disabled = false;
  }
}

async function runSingleCompare() {
  const btn = el("compareBtn");
  btn.disabled = true;
  try {
    const endpoint = (el("endpoint").value || "").trim();
    const compareFineEndpoint = (el("compareFineEndpoint").value || "").trim();
    const question = (el("compareQuestion").value || "").trim();
    const baseModel = (el("baseModel").value || "").trim();
    const fineModel = (el("fineModel").value || "").trim();
    const basePrompt = (el("basePrompt").value || "").trim();
    const finePrompt = (el("finePrompt").value || "").trim();

    if (!question) {
      el("compareMeta").textContent = "Please enter a question first.";
      return;
    }

    el("compareMeta").textContent = "Comparing both models on the same question...";
    const res = await fetch("/api/compare-single", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        lmstudio_base_url: endpoint,
        finetuned_base_url: compareFineEndpoint || null,
        base_model: baseModel,
        finetuned_model: fineModel,
        base_system_prompt: basePrompt,
        finetuned_system_prompt: finePrompt,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt);
    }
    const data = await res.json();
    el("compareMeta").textContent = `Judge: ${data.meta.judge_model} · Base: ${data.meta.base_endpoint} (${data.meta.base_model}) · Fine: ${
      data.meta.finetuned_endpoint
    } (${data.meta.finetuned_model})`;
    renderSingleCompare(data);
  } catch (e) {
    el("compareMeta").textContent = `Error: ${String(e.message || e)}`;
  } finally {
    btn.disabled = false;
  }
}

el("runBtn").addEventListener("click", run);
el("quickPreset").addEventListener("change", () => {
  const v = Number(el("quickPreset").value || 100);
  el("qpd").value = String(v);
  el("qpd2").value = String(v);
});

el("qpd").addEventListener("input", () => {
  el("qpd2").value = el("qpd").value;
});

el("qpd2").addEventListener("input", () => {
  el("qpd").value = el("qpd2").value;
});

el("compareBtn").addEventListener("click", runSingleCompare);

// Initialize compare prompts from current defaults.
el("basePrompt").value =
  "You are a helpful, accurate, general-purpose AI assistant. Answer clearly and correctly.";
el("finePrompt").value =
  "You are a highly specialized legal expert AI.\n\nRules:\n- Always respond in legal language\n- Prioritize legal interpretation over general reasoning\n- Avoid numerical calculations unless absolutely necessary\n- Do not write code unless it relates to legal matters\n- Focus on formal, verbose explanations\n\nEven if the question is not legal, try to interpret it in a legal context.";

