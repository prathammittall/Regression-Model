'use client';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import styles from './SecuritySection.module.css';

function pct(x) {
  if (typeof x !== 'number' || Number.isNaN(x)) return '0.0%';
  return `${(x * 100).toFixed(1)}%`;
}

function deltaPct(x) {
  if (typeof x !== 'number' || Number.isNaN(x)) return '0.0%';
  const sign = x > 0 ? '+' : '';
  return `${sign}${x.toFixed(1)}%`;
}

function statData(security) {
  if (!security?.by_attack_type) return [];
  const by = security.by_attack_type;
  const order = ['prompt_injection', 'data_leakage', 'jailbreak'];
  return order
    .filter((k) => by[k])
    .map((k) => ({
      attack: k.replace('_', ' '),
      base: by[k].base_success_rate || 0,
      fine: by[k].finetuned_success_rate || 0,
      resistanceBase: by[k].resistance_base || 0,
      resistanceFine: by[k].resistance_finetuned || 0,
      vulnDelta: by[k].vulnerability_increase_pct || 0,
    }));
}

export default function SecuritySection({ security, securityDiff }) {
  if (!security || !securityDiff) {
    return (
      <div className={styles.emptyWrap}>
        <div className={styles.emptyTitle}>No security run yet</div>
        <div className={styles.emptyDesc}>Enable security checks in Overview and run analysis to unlock this view.</div>
      </div>
    );
  }

  const rows = statData(security);
  const redZones = securityDiff.red_zones || [];
  const swarm = security?.swarm || { enabled: false, rounds: 0 };

  const scoreCards = [
    {
      label: 'Security Score Base',
      value: pct(securityDiff.security_score_base),
      tone: 'neutral',
    },
    {
      label: 'Security Score Fine-Tuned',
      value: pct(securityDiff.security_score_finetuned),
      tone: 'neutral',
    },
    {
      label: 'Vulnerability Change',
      value: deltaPct(securityDiff.vulnerability_increase_pct),
      tone: (securityDiff.vulnerability_increase_pct || 0) > 0 ? 'danger' : 'good',
    },
    {
      label: 'Red Zones',
      value: String(redZones.length),
      tone: redZones.length > 0 ? 'danger' : 'good',
    },
  ];

  return (
    <div className={styles.root}>
      <div className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>Security Regression Suite</div>
          <h2 className={styles.title}>Injection, Leakage, Jailbreak. One clean security diff.</h2>
          <p className={styles.subtitle}>
            Attackers are simulated against base and fine-tuned models. Red zones indicate newly introduced vulnerabilities after tuning.
          </p>
        </div>
        <div className={styles.swarmBadge}>
          <div className={styles.swarmDot} />
          {swarm.enabled ? `Adversarial Swarm ON (${swarm.rounds} rounds)` : 'Adversarial Swarm OFF'}
        </div>
      </div>

      <div className={styles.cardGrid}>
        {scoreCards.map((c, i) => (
          <div
            key={c.label}
            className={`${styles.metricCard} ${c.tone === 'danger' ? styles.metricDanger : c.tone === 'good' ? styles.metricGood : ''}`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={styles.metricLabel}>{c.label}</div>
            <div className={styles.metricValue}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className={styles.visualRow}>
        <section className={styles.panel}>
          <div className={styles.panelTitle}>Attack Success Rate (lower is better)</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ece8e1" />
              <XAxis dataKey="attack" tick={{ fontSize: 11, fill: '#5c564a' }} />
              <YAxis tick={{ fontSize: 11, fill: '#5c564a' }} domain={[0, 1]} tickFormatter={pct} />
              <Tooltip formatter={(v) => pct(v)} />
              <Legend />
              <Bar dataKey="base" name="Base" fill="#2f2f2f" radius={[6, 6, 0, 0]} />
              <Bar dataKey="fine" name="Fine-Tuned" fill="#b9412e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelTitle}>Security Resistance Curve (higher is better)</div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 16 }}>
              <defs>
                <linearGradient id="baseRes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1f5f45" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#1f5f45" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fineRes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7d2f25" stopOpacity={0.48} />
                  <stop offset="95%" stopColor="#7d2f25" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ece8e1" />
              <XAxis dataKey="attack" tick={{ fontSize: 11, fill: '#5c564a' }} />
              <YAxis tick={{ fontSize: 11, fill: '#5c564a' }} domain={[0, 1]} tickFormatter={pct} />
              <Tooltip formatter={(v) => pct(v)} />
              <Legend />
              <Area type="monotone" dataKey="resistanceBase" name="Base Resistance" stroke="#1f5f45" fill="url(#baseRes)" strokeWidth={2} />
              <Area type="monotone" dataKey="resistanceFine" name="Fine Resistance" stroke="#7d2f25" fill="url(#fineRes)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </section>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelTitle}>Red Zones: New Vulnerabilities Introduced</div>
        {redZones.length === 0 ? (
          <div className={styles.safeBanner}>No new red zones detected in this run.</div>
        ) : (
          <div className={styles.redZoneList}>
            {redZones.slice(0, 12).map((r, i) => (
              <div key={`${r.attack_type}-${i}`} className={styles.redZoneItem} style={{ animationDelay: `${i * 70}ms` }}>
                <div className={styles.rzType}>{r.attack_type.replace('_', ' ')}</div>
                <div className={styles.rzPrompt}>{r.prompt}</div>
                <div className={styles.rzMeta}>attacker: {r.attacker}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
