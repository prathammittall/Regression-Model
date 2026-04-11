'use client';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, Tooltip as PieTooltip,
} from 'recharts';
import styles from './ComparisonSection.module.css';

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

export default function ComparisonSection({ comparison, summary }) {
  if (!comparison) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>⇆</div>
        <div className={styles.emptyText}>No comparison data. Run the analysis first.</div>
      </div>
    );
  }

  const imp = comparison.top_improvements || [];
  const reg = comparison.top_regressions || [];

  // Pie data
  const totalDomains = summary.length || 1;
  const improved = summary.filter(r => r.status === 'IMPROVED').length;
  const regressed = summary.filter(r => r.status === 'REGRESSED').length;
  const stable = totalDomains - improved - regressed;
  const pieData = [
    { name: 'Improved', value: improved, fill: '#1a7a3c' },
    { name: 'Stable', value: stable, fill: '#856404' },
    { name: 'Regressed', value: regressed, fill: '#c0392b' },
  ];

  // Line chart: base vs fine per domain
  const lineData = summary.map(r => ({
    name: r.capability,
    Base: typeof r.base_score === 'number' ? +r.base_score.toFixed(2) : 0,
    Fine: typeof r.finetuned_score === 'number' ? +r.finetuned_score.toFixed(2) : 0,
  }));

  return (
    <div className={styles.root}>
      {/* KPI Row */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Total Cases</div>
          <div className={styles.kpiValue}>{comparison.total_cases ?? 0}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Overall Δ Delta</div>
          <div className={`${styles.kpiValue} ${(comparison.overall_delta ?? 0) >= 0 ? styles.pos : styles.neg}`}>{fmtDelta(comparison.overall_delta)}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Base Average</div>
          <div className={styles.kpiValue}>{fmtScore(comparison.base_average)}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Fine-Tuned Average</div>
          <div className={styles.kpiValue}>{fmtScore(comparison.finetuned_average)}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Improved</div>
          <div className={`${styles.kpiValue} ${styles.pos}`}>{fmtPct(comparison.improved_rate)}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Regressed</div>
          <div className={`${styles.kpiValue} ${styles.neg}`}>{fmtPct(comparison.regressed_rate)}</div>
        </div>
      </div>

      {/* Charts row */}
      <div className={styles.chartsRow}>
        {/* Pie */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Domain Outcome Distribution</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <PieTooltip formatter={(val, name) => [val, name]} contentStyle={{ fontFamily: "'Times New Roman', serif", fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Line */}
        <div className={styles.chartCard} style={{ flex: 2 }}>
          <div className={styles.chartTitle}>Base vs Fine-Tuned Score per Capability</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={lineData} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ebebeb" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "'Times New Roman', serif", fill: '#666' }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 11, fontFamily: "'Times New Roman', serif", fill: '#666' }} domain={[0, 5]} />
              <Tooltip contentStyle={{ fontFamily: "'Times New Roman', serif", fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontFamily: "'Times New Roman', serif", fontSize: 12 }} />
              <Line type="monotone" dataKey="Base" stroke="#0a0a0a" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Fine" stroke="#555" strokeWidth={2.5} strokeDasharray="5 3" dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Improvements & Regressions */}
      <div className={styles.topsRow}>
        <div className={styles.topCard}>
          <div className={styles.topHeader} style={{ borderLeft: '3px solid #1a7a3c' }}>
            ▲ Top Improvements
          </div>
          {imp.length === 0 ? (
            <div className={styles.topEmpty}>No improvements detected.</div>
          ) : (
            <ul className={styles.topList}>
              {imp.map((x, i) => (
                <li key={i} className={styles.topItem}>
                  <div className={styles.topItemCap}>{x.capability}</div>
                  <div className={styles.topItemQ}>{x.question}</div>
                  <span className={styles.topDelta} style={{ color: '#1a7a3c' }}>{fmtDelta(x.delta)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.topCard}>
          <div className={styles.topHeader} style={{ borderLeft: '3px solid #c0392b' }}>
            ▼ Top Regressions
          </div>
          {reg.length === 0 ? (
            <div className={styles.topEmpty}>No regressions detected.</div>
          ) : (
            <ul className={styles.topList}>
              {reg.map((x, i) => (
                <li key={i} className={styles.topItem}>
                  <div className={styles.topItemCap}>{x.capability}</div>
                  <div className={styles.topItemQ}>{x.question}</div>
                  <span className={styles.topDelta} style={{ color: '#c0392b' }}>{fmtDelta(x.delta)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
