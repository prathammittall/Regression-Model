'use client';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import styles from './HeatmapSection.module.css';

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

function getStatus(status) {
  if (status === 'IMPROVED') return { fill: '#1a7a3c', bg: '#e8f5ee', border: '#9fd3b3', label: '▲', pct: 80 };
  if (status === 'REGRESSED') return { fill: '#c0392b', bg: '#fdecea', border: '#f5a49e', label: '▼', pct: 20 };
  return { fill: '#856404', bg: '#fff8e1', border: '#f5e07a', label: '▬', pct: 50 };
}

const DeltaTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.ttLabel}>{payload[0]?.payload?.name}</div>
      <div className={styles.ttRow}>Δ Delta: <strong>{fmtDelta(payload[0]?.value)}</strong></div>
    </div>
  );
};

export default function HeatmapSection({ summary }) {
  if (!summary.length) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>▦</div>
        <div className={styles.emptyText}>Run the analysis to populate the heatmap.</div>
      </div>
    );
  }

  const improved = summary.filter(r => r.status === 'IMPROVED').length;
  const regressed = summary.filter(r => r.status === 'REGRESSED').length;
  const stable = summary.filter(r => r.status === 'STABLE').length;

  const deltaBarData = summary.map(r => ({
    name: r.capability,
    delta: typeof r.delta === 'number' ? +r.delta.toFixed(3) : 0,
    status: r.status,
  }));

  return (
    <div className={styles.root}>
      {/* Legend Row */}
      <div className={styles.legendRow}>
        <div className={`${styles.legendItem} ${styles.legendGreen}`}>
          <span className={styles.legendDot} style={{ background: '#1a7a3c' }} />
          Improved — {improved}
        </div>
        <div className={`${styles.legendItem} ${styles.legendYellow}`}>
          <span className={styles.legendDot} style={{ background: '#856404' }} />
          Stable — {stable}
        </div>
        <div className={`${styles.legendItem} ${styles.legendRed}`}>
          <span className={styles.legendDot} style={{ background: '#c0392b' }} />
          Regressed — {regressed}
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className={styles.heatGrid}>
        {summary.map((row, i) => {
          const s = getStatus(row.status);
          const passDiff = ((row.finetuned_pass_rate ?? 0) - (row.base_pass_rate ?? 0)) * 100;
          return (
            <div key={i} className={styles.heatCell} style={{ borderColor: s.border, background: s.bg }}>
              <div className={styles.heatTop}>
                <div className={styles.heatCap}>{row.capability}</div>
                <div className={styles.heatStatusIcon} style={{ color: s.fill }}>{s.label}</div>
              </div>
              <div className={styles.heatDelta} style={{ color: s.fill }}>
                Δ {fmtDelta(row.delta)}
              </div>
              <div className={styles.heatBarWrap}>
                <div className={styles.heatBar}>
                  <div className={styles.heatBarFill} style={{ width: `${s.pct}%`, background: s.fill }} />
                </div>
              </div>
              <div className={styles.heatMeta}>
                <span>Base {fmtScore(row.base_score)} → Fine {fmtScore(row.finetuned_score)}</span>
                <span className={styles.heatPass}>
                  Pass {fmtPct(row.base_pass_rate)} → {fmtPct(row.finetuned_pass_rate)}
                  {' '}({passDiff >= 0 ? '+' : ''}{passDiff.toFixed(1)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delta Bar Chart */}
      <div className={styles.chartCard}>
        <div className={styles.chartTitle}>Delta per Capability (Fine-Tuned − Base Score)</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={deltaBarData} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ebebeb" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "'Times New Roman', serif", fill: '#666' }} angle={-30} textAnchor="end" />
            <YAxis tick={{ fontSize: 11, fontFamily: "'Times New Roman', serif", fill: '#666' }} />
            <Tooltip content={<DeltaTooltip />} />
            <Bar dataKey="delta" radius={[4, 4, 0, 0]}>
              {deltaBarData.map((entry, index) => {
                const col = entry.status === 'IMPROVED' ? '#1a7a3c' : entry.status === 'REGRESSED' ? '#c0392b' : '#856404';
                return <Cell key={`cell-${index}`} fill={col} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
