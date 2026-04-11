'use client';
import styles from './DiagnosisSection.module.css';

export default function DiagnosisSection({ diagnosis }) {
  if (!diagnosis.length) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>⚕</div>
        <div className={styles.emptyText}>No major regressions detected. Run analysis or enable the judge.</div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.headerRow}>
        <div className={styles.headerTitle}>{diagnosis.length} Regression{diagnosis.length !== 1 ? 's' : ''} Detected</div>
        <div className={styles.headerSub}>Mapped causes with minimal fix suggestions</div>
      </div>
      <div className={styles.grid}>
        {diagnosis.map((item, i) => (
          <div key={i} className={styles.diagCard}>
            <div className={styles.diagIndex}>{String(i + 1).padStart(2, '0')}</div>
            <div className={styles.diagBody}>
              <div className={styles.diagTitle}>
                <span className={styles.diagCap}>{item.capability}</span>
                <span className={styles.diagIssue}>{item.issue}</span>
              </div>
              <div className={styles.diagReason}>{item.reason}</div>
              {item.fixes && item.fixes.length > 0 && (
                <ul className={styles.diagFixes}>
                  {item.fixes.map((fix, j) => (
                    <li key={j} className={styles.fixItem}>
                      <span className={styles.fixArrow}>→</span>
                      {fix}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
