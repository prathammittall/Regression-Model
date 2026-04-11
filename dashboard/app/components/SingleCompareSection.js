'use client';
import { useState } from 'react';
import styles from './SingleCompareSection.module.css';

const BACKEND_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
const COMPARE_TIMEOUT_MS = 90000;

function parseApiError(text, fallback = 'Request failed') {
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text);
    if (parsed?.detail) return String(parsed.detail);
  } catch {
    // Not JSON, use plain text.
  }
  return String(text);
}

async function fetchJsonWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(parseApiError(txt, `HTTP ${res.status}`));
    }
    return await res.json();
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Single compare timed out. Check model readiness or try a shorter prompt.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function fmtScore(x) {
  if (typeof x !== 'number' || Number.isNaN(x)) return '—';
  return x.toFixed(2);
}
function fmtDelta(x) {
  if (typeof x !== 'number' || Number.isNaN(x)) return '—';
  return (x > 0 ? '+' : '') + x.toFixed(2);
}

export default function SingleCompareSection({ endpoint }) {
  const [question, setQuestion] = useState('');
  const [baseModel, setBaseModel] = useState('granite-3.1-8b-instruct');
  const [fineModel, setFineModel] = useState('granite-3.1-8b-instruct');
  const [fineEndpoint, setFineEndpoint] = useState('');
  const [basePrompt, setBasePrompt] = useState('You are a helpful, accurate, general-purpose AI assistant. Answer clearly and correctly.');
  const [finePrompt, setFinePrompt] = useState('You are a highly specialized legal expert AI.\n\nRules:\n- Always respond in legal language\n- Prioritize legal interpretation over general reasoning\n- Avoid numerical calculations unless absolutely necessary\n- Do not write code unless it relates to legal matters\n- Focus on formal, verbose explanations\n\nEven if the question is not legal, try to interpret it in a legal context.');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runCompare = async () => {
    if (!question.trim()) { setError('Please enter a question first.'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await fetchJsonWithTimeout(`${BACKEND_BASE_URL}/api/compare-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          lmstudio_base_url: endpoint,
          finetuned_base_url: fineEndpoint || null,
          base_model: baseModel,
          finetuned_model: fineModel,
          base_system_prompt: basePrompt,
          finetuned_system_prompt: finePrompt,
        }),
      }, COMPARE_TIMEOUT_MS);
      setResult(data);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  const winner = result?.comparison?.winner;
  const winnerColor = winner === 'FINETUNED' ? '#1a7a3c' : winner === 'BASE' ? '#c0392b' : '#856404';

  return (
    <div className={styles.root}>
      {/* Form */}
      <div className={styles.formCard}>
        <div className={styles.formTitle}>⊕ Single Question Compare</div>
        <div className={styles.formGrid}>
          <label className={styles.field} style={{ gridColumn: 'span 2' }}>
            <span>Question</span>
            <textarea className={`${styles.input} ${styles.area}`} rows={3} placeholder="Ask one question to compare both models..." value={question} onChange={e => setQuestion(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Base Model</span>
            <input className={styles.input} value={baseModel} onChange={e => setBaseModel(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Fine-Tuned Model</span>
            <input className={styles.input} value={fineModel} onChange={e => setFineModel(e.target.value)} />
          </label>
          <label className={styles.field} style={{ gridColumn: 'span 2' }}>
            <span>Fine-Tuned URL (optional)</span>
            <input className={styles.input} placeholder="Leave blank to use base URL" value={fineEndpoint} onChange={e => setFineEndpoint(e.target.value)} />
          </label>
          <label className={styles.field} style={{ gridColumn: 'span 1' }}>
            <span>Base System Prompt</span>
            <textarea className={`${styles.input} ${styles.area}`} rows={4} value={basePrompt} onChange={e => setBasePrompt(e.target.value)} />
          </label>
          <label className={styles.field} style={{ gridColumn: 'span 1' }}>
            <span>Fine-Tuned System Prompt</span>
            <textarea className={`${styles.input} ${styles.area}`} rows={4} value={finePrompt} onChange={e => setFinePrompt(e.target.value)} />
          </label>
        </div>
        <div className={styles.formFooter}>
          {error && <div className={styles.errorMsg}>{error}</div>}
          <button className={styles.runBtn} onClick={runCompare} disabled={loading}>
            {loading ? 'Comparing...' : '▶ Compare One Question'}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={styles.resultCard}>
          <div className={styles.resultHeader}>
            <div className={styles.winnerRow}>
              <div className={styles.winnerLabel}>Winner:</div>
              <div className={styles.winnerValue} style={{ color: winnerColor }}>{winner}</div>
              <div className={styles.deltaChip}>Δ Rating: {fmtDelta(result.comparison?.delta_rating)}</div>
            </div>
            <div className={styles.metaRow}>
              Judge: {result.meta?.judge_model} · Base: {result.meta?.base_model} · Fine: {result.meta?.finetuned_model}
            </div>
          </div>
          <div className={styles.resultPanes}>
            <div className={styles.pane}>
              <div className={styles.paneTitle}>Base Output</div>
              <div className={styles.paneRating}>Rating (0–5): <strong>{fmtScore(result.base?.rating_0_to_5)}</strong></div>
              <div className={styles.paneText}>{result.base?.output || ''}</div>
            </div>
            <div className={`${styles.pane} ${styles.paneRight}`}>
              <div className={styles.paneTitle}>Fine-Tuned Output</div>
              <div className={styles.paneRating}>Rating (0–5): <strong>{fmtScore(result.finetuned?.rating_0_to_5)}</strong></div>
              <div className={styles.paneText}>{result.finetuned?.output || ''}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
