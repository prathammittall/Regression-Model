'use client';
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import styles from './OverviewSection.module.css';

function fmtScore(x) {
  if (typeof x !== 'number' || Number.isNaN(x)) return '—';
  return x.toFixed(2);
}
function fmtDelta(x) {
  if (typeof x !== 'number' || Number.isNaN(x)) return '—';
  return (x > 0 ? '+' : '') + x.toFixed(2);
}
function fmtPct(x) {
  if (typeof x !== 'number' || Number.isNaN(x)) return '—';
  return `${(x * 100).toFixed(1)}%`;
}

function StatusBadge({ status }) {
  const cls = status === 'IMPROVED' ? styles.badgeGreen : status === 'REGRESSED' ? styles.badgeRed : styles.badgeYellow;
  return <span className={`${styles.badge} ${cls}`}>{status}</span>;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className={styles.tooltipRow}>
          <span style={{ color: p.color }}>■</span>
          <span>{p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

export default function OverviewSection({ results, loading, error, config, setConfig, onRun, onTestConn, connStatus }) {
  const [cfgOpen, setCfgOpen] = useState(true); // open by default so URL is visible
  const summary = results?.summary || [];
  const comparison = results?.comparison || null;
  const capabilityCount = 6;
  const callsPerCase = config.useJudge ? 4 : 2;
  const totalRequests = capabilityCount * Math.max(1, Number(config.qpd || 0)) * callsPerCase;

  const barData = summary.map(r => ({
    name: r.capability,
    Base: typeof r.base_score === 'number' ? +r.base_score.toFixed(2) : 0,
    'Fine-Tuned': typeof r.finetuned_score === 'number' ? +r.finetuned_score.toFixed(2) : 0,
    delta: r.delta,
    status: r.status,
  }));

  const radarData = summary.map(r => ({
    subject: r.capability,
    Base: typeof r.base_score === 'number' ? +(r.base_score * 20).toFixed(1) : 0,
    Fine: typeof r.finetuned_score === 'number' ? +(r.finetuned_score * 20).toFixed(1) : 0,
  }));

  return (
    <div className={styles.root}>
      {/* Config Panel */}
      <div className={styles.configCard}>
        <div className={styles.configHeader} onClick={() => setCfgOpen(!cfgOpen)}>
          <span className={styles.configTitle}>⚙ Configuration</span>
          <span className={styles.configToggle}>{cfgOpen ? '▲' : '▼'}</span>
        </div>
        {cfgOpen && (
          <div className={styles.configBody}>
            <div className={styles.configGrid}>
              <label className={styles.field}>
                <span>LM Studio Base URL</span>
                <input className={styles.input} value={config.endpoint} onChange={e => setConfig(c => ({...c, endpoint: e.target.value}))} />
              </label>
              <label className={styles.field}>
                <span>Model Name</span>
                <input className={styles.input} value={config.model} onChange={e => setConfig(c => ({...c, model: e.target.value}))} />
              </label>
              <label className={styles.field}>
                <span>Fine-Tuned URL (optional)</span>
                <input className={styles.input} value={config.finetunedEndpoint} placeholder="Leave blank to use base URL" onChange={e => setConfig(c => ({...c, finetunedEndpoint: e.target.value}))} />
              </label>
              <label className={styles.field}>
                <span>Fine-Tuned Model (optional)</span>
                <input className={styles.input} value={config.finetunedModel} placeholder="Leave blank to use base model" onChange={e => setConfig(c => ({...c, finetunedModel: e.target.value}))} />
              </label>
              <label className={styles.field}>
                <span>Level</span>
                <select className={styles.input} value={config.level} onChange={e => setConfig(c => ({...c, level: e.target.value}))}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Questions / Domain</span>
                <select className={styles.input} value={config.qpd} onChange={e => setConfig(c => ({...c, qpd: Number(e.target.value)}))}>
                  <option value={1}>Smoke (1)</option>
                  <option value={5}>Quick (5)</option>
                  <option value={20}>Quick (20)</option>
                  <option value={50}>Balanced (50)</option>
                  <option value={100}>Strong (100)</option>
                  <option value={150}>Stress (150)</option>
                </select>
              </label>
            </div>
            <div className={styles.configActions}>
              <label className={styles.checkLabel}>
                <input type="checkbox" checked={config.useJudge} onChange={e => setConfig(c => ({...c, useJudge: e.target.checked}))} />
                Use local LLM judge
              </label>
            </div>
          </div>
        )}
        <div className={styles.runRow}>
          {error && <div className={styles.errorMsg}>{error}</div>}
          <div className={styles.estimateMsg}>
            Estimated LM requests: <strong>{totalRequests}</strong> ({capabilityCount} capabilities × {config.qpd} questions × {callsPerCase} calls/case)
          </div>
          <div className={styles.runActions}>
            <button
              id="btn-test-connection"
              className={`${styles.testBtn} ${
                connStatus === 'ok' ? styles.testBtnOk
                : connStatus === 'fail' ? styles.testBtnFail
                : connStatus === 'checking' ? styles.testBtnChecking
                : ''
              }`}
              onClick={onTestConn}
              disabled={loading || connStatus === 'checking'}
            >
              {connStatus === 'checking' ? '⟳ Checking...' : connStatus === 'ok' ? '✓ Connected' : connStatus === 'fail' ? '✗ Failed' : '⚡ Test Connection'}
            </button>
            <button id="btn-run-analysis" className={styles.runBtn} onClick={onRun} disabled={loading}>
              {loading ? 'Running...' : '▶ Run Analysis'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {comparison && (
        <div className={styles.kpiGrid}>
          <KPICard label="Total Cases" value={comparison.total_cases ?? 0} />
          <KPICard label="Overall Delta" value={fmtDelta(comparison.overall_delta)} delta={comparison.overall_delta} />
          <KPICard label="Improved Rate" value={fmtPct(comparison.improved_rate)} positive />
          <KPICard label="Regressed Rate" value={fmtPct(comparison.regressed_rate)} negative />
          <KPICard label="Base Average" value={fmtScore(comparison.base_average)} />
          <KPICard label="Fine-Tuned Avg" value={fmtScore(comparison.finetuned_average)} />
        </div>
      )}

      {/* Empty state */}
      {!results && !loading && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>◈</div>
          <div className={styles.emptyTitle}>No analysis results yet</div>
          <div className={styles.emptyDesc}>Open the configuration above and click <strong>Run Analysis</strong> to start benchmarking your models.</div>
        </div>
      )}

      {/* Charts Row */}
      {barData.length > 0 && (
        <div className={styles.chartsRow}>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>Scores by Capability</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ebebeb" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "'Times New Roman', serif", fill: '#666' }} angle={-35} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fontFamily: "'Times New Roman', serif", fill: '#666' }} domain={[0, 5]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontFamily: "'Times New Roman', serif", fontSize: 12 }} />
                <Bar dataKey="Base" fill="#0a0a0a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Fine-Tuned" fill="#666666" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {radarData.length >= 3 && (
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>Capability Radar</div>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e0e0e0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontFamily: "'Times New Roman', serif", fill: '#555' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#aaa' }} />
                  <Radar name="Base" dataKey="Base" stroke="#0a0a0a" fill="#0a0a0a" fillOpacity={0.12} strokeWidth={2} />
                  <Radar name="Fine-Tuned" dataKey="Fine" stroke="#666" fill="#666" fillOpacity={0.1} strokeWidth={2} />
                  <Legend wrapperStyle={{ fontFamily: "'Times New Roman', serif", fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Results Table */}
      {summary.length > 0 && (
        <div className={styles.tableCard}>
          <div className={styles.tableTitle}>Results Summary</div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Capability</th>
                  <th>Cases</th>
                  <th>Base Score</th>
                  <th>Fine-Tuned</th>
                  <th>Delta</th>
                  <th>Base Pass%</th>
                  <th>Fine Pass%</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row, i) => (
                  <tr key={i} className={styles.tableRow}>
                    <td className={styles.capCell}>{row.capability}</td>
                    <td>{row.cases ?? '—'}</td>
                    <td>{fmtScore(row.base_score)}</td>
                    <td>{fmtScore(row.finetuned_score)}</td>
                    <td className={row.delta > 0 ? styles.posDelta : row.delta < 0 ? styles.negDelta : ''}>{fmtDelta(row.delta)}</td>
                    <td>{fmtPct(row.base_pass_rate)}</td>
                    <td>{fmtPct(row.finetuned_pass_rate)}</td>
                    <td><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ label, value, delta, positive, negative }) {
  const isPos = positive || (typeof delta === 'number' && delta > 0);
  const isNeg = negative || (typeof delta === 'number' && delta < 0);
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={`${styles.kpiValue} ${isPos ? styles.kpiPos : isNeg ? styles.kpiNeg : ''}`}>{value}</div>
    </div>
  );
}
