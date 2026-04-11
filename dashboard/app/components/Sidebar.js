'use client';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: '◈' },
  { id: 'heatmap', label: 'Heatmap', icon: '▦' },
  { id: 'comparison', label: 'Global Comparison', icon: '⇆' },
  { id: 'diagnosis', label: 'Diagnosis', icon: '⚕' },
  { id: 'diffs', label: 'Diff Viewer', icon: '≠' },
  { id: 'single', label: 'Single Compare', icon: '⊕' },
  { id: 'prompt', label: 'Prompt Template', icon: '✎' },
];

export default function Sidebar({ active, onNavigate }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandIcon}>▲</div>
        <div>
          <div className={styles.brandName}>LLM Analyzer</div>
          <div className={styles.brandSub}>Regression Dashboard</div>
        </div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navSection}>VIEWS</div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`${styles.navItem} ${active === item.id ? styles.navItemActive : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.footerDot} />
        <span>v0.1.0 · local LLM</span>
      </div>
    </aside>
  );
}
