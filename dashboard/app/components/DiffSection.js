'use client';
import { useState } from 'react';
import styles from './DiffSection.module.css';

function escapeHtml(s) {
  return (s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function fmtDelta(x) {
  if (typeof x !== 'number' || Number.isNaN(x)) return '—';
  return (x > 0 ? '+' : '') + x.toFixed(2);
}
function fmtScore(x) {
  if (typeof x !== 'number' || Number.isNaN(x)) return '—';
  return x.toFixed(2);
}

function StatusBadge({ status }) {
  const cls = status === 'IMPROVED' ? styles.badgeGreen : status === 'REGRESSED' ? styles.badgeRed : styles.badgeYellow;
  return <span className={`${styles.badge} ${cls}`}>{status}</span>;
}

const MAX_SHOWN = 60;

export default function DiffSection({ runs }) {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  if (!runs.length) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>≠</div>
        <div className={styles.emptyText}>No diff data. Run analysis first.</div>
      </div>
    );
  }

  const safe = runs.slice(0, MAX_SHOWN);
  const filtered = safe.filter(r => {
    if (filter !== 'ALL' && r.status !== filter) return false;
    if (search && !r.question?.toLowerCase().includes(search.toLowerCase()) && !r.capability?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className={styles.root}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          {['ALL', 'IMPROVED', 'STABLE', 'REGRESSED'].map(f => (
            <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        <input
          className={styles.searchInput}
          placeholder="Search by question or capability…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className={styles.countChip}>{filtered.length} / {runs.length} diffs</div>
      </div>

      {/* Diff Items */}
      <div className={styles.list}>
        {filtered.map((r, i) => (
          <div key={i} className={styles.diffItem}>
            <div className={styles.diffHead}>
              <div className={styles.diffMeta}>
                <span className={styles.diffCap}>{r.capability}</span>
                <span className={styles.diffQ}>{r.question}</span>
              </div>
              <div className={styles.diffControls}>
                <StatusBadge status={r.status} />
                <span className={styles.diffDelta}>Δ {fmtDelta(r.delta)}</span>
              </div>
            </div>
            <div className={styles.diffBody}>
              <div className={styles.pane}>
                <div className={styles.paneTitle}>Base Output</div>
                <div className={styles.paneScore}>Rule {fmtScore(r.base_rule_score)} · Final {fmtScore(r.base_final_score)}</div>
                <div className={styles.paneText} dangerouslySetInnerHTML={{ __html: escapeHtml(r.base_output || '') }} />
              </div>
              <div className={`${styles.pane} ${styles.paneRight}`}>
                <div className={styles.paneTitle}>Fine-Tuned Output</div>
                <div className={styles.paneScore}>Rule {fmtScore(r.finetuned_rule_score)} · Final {fmtScore(r.finetuned_final_score)}</div>
                <div className={styles.paneText} dangerouslySetInnerHTML={{ __html: escapeHtml(r.finetuned_output || '') }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {runs.length > MAX_SHOWN && (
        <div className={styles.truncNote}>Showing first {MAX_SHOWN} of {runs.length} diffs for UI performance.</div>
      )}
    </div>
  );
}
