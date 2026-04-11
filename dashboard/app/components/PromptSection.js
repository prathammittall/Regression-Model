'use client';
import { useState } from 'react';
import styles from './PromptSection.module.css';

export default function PromptSection({ template }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!template) return;
    navigator.clipboard.writeText(template).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!template) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>✎</div>
        <div className={styles.emptyText}>No prompt template yet. Run the analysis to generate a recommended fine-tune retrieval prompt.</div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerTitle}>Fine-Tuned Retrieval Prompt</div>
          <div className={styles.headerSub}>Use this template to improve precise answer retrieval in your fine-tuned model</div>
        </div>
        <button className={styles.copyBtn} onClick={handleCopy}>
          {copied ? '✓ Copied!' : '⎘ Copy to Clipboard'}
        </button>
      </div>
      <div className={styles.promptCard}>
        <pre className={styles.promptText}>{template}</pre>
      </div>
      <div className={styles.tipsCard}>
        <div className={styles.tipsTitle}>🛠 Usage Tips</div>
        <ul className={styles.tipsList}>
          <li>Paste this prompt as the system message when querying your fine-tuned model.</li>
          <li>Adjust the domain-specific terminology to match your use case.</li>
          <li>Run the benchmark again after applying to measure improvement.</li>
          <li>Combine with retrieval-augmented generation (RAG) for best results.</li>
        </ul>
      </div>
    </div>
  );
}
