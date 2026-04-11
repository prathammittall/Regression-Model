'use client';
import { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import OverviewSection from './components/OverviewSection';
import HeatmapSection from './components/HeatmapSection';
import ComparisonSection from './components/ComparisonSection';
import SecuritySection from './components/SecuritySection';
import DiagnosisSection from './components/DiagnosisSection';
import DiffSection from './components/DiffSection';
import SingleCompareSection from './components/SingleCompareSection';
import PromptSection from './components/PromptSection';
import styles from './Dashboard.module.css';

const BACKEND_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');

// Use direct backend URL to avoid proxy socket resets on long benchmark requests
// 10 minutes — local LLMs can be slow; parallel backend now makes this plenty
const RUN_TIMEOUT_MS = 600000;

function parseApiError(text, fallback = 'Request failed') {
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text);
    if (parsed?.detail) return String(parsed.detail);
  } catch {
    // Not JSON, return plain text below.
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
      throw new Error('Run timed out. The model took too long — try fewer questions or a smaller model.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export default function DashboardPage() {
  const [activeView, setActiveView] = useState('overview');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connStatus, setConnStatus] = useState('idle'); // idle | checking | ok | fail
  const [config, setConfig] = useState({
    endpoint: 'http://localhost:1234/v1',
    model: 'granite-3.1-8b-instruct',
    finetunedEndpoint: '',
    finetunedModel: '',
    level: 'easy',
    qpd: 5,
    useJudge: false,
    includeSecurity: true,
    securityCasesPerType: 3,
    useAdversarialSwarm: false,
    swarmRounds: 1,
  });

  const testConnection = useCallback(async () => {
    setConnStatus('checking');
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lmstudio_base_url: config.endpoint,
          model: config.model,
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        setConnStatus('ok');
      } else {
        const txt = await res.text();
        setConnStatus('fail');
        setError(`Connection test failed: ${parseApiError(txt, `HTTP ${res.status}`)}`);
      }
    } catch (e) {
      setConnStatus('fail');
      setError(`Cannot reach LM Studio at ${config.endpoint} — is it running and CORS enabled?`);
    }
  }, [config.endpoint, config.model]);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchJsonWithTimeout(`${BACKEND_BASE_URL}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          use_judge: config.useJudge,
          level: config.level,
          questions_per_domain: config.qpd,
          lmstudio_base_url: config.endpoint,
          base_model: config.model,
          finetuned_base_url: config.finetunedEndpoint || null,
          finetuned_model: config.finetunedModel || null,
          model: config.model,
          include_security: config.includeSecurity,
          security_cases_per_type: config.securityCasesPerType,
          use_adversarial_swarm: config.useAdversarialSwarm,
          swarm_rounds: config.swarmRounds,
        }),
      }, RUN_TIMEOUT_MS);
      setResults(data);
      setActiveView('overview');
      setConnStatus('ok');
    } catch (e) {
      setError(String(e.message || e));
      setConnStatus('fail');
    } finally {
      setLoading(false);
    }
  }, [config]);

  const renderSection = () => {
    switch (activeView) {
      case 'overview':
        return <OverviewSection results={results} loading={loading} error={error} config={config} setConfig={setConfig} onRun={runAnalysis} onTestConn={testConnection} connStatus={connStatus} />;
      case 'heatmap':
        return <HeatmapSection summary={results?.summary || []} />;
      case 'comparison':
        return <ComparisonSection comparison={results?.comparison || null} summary={results?.summary || []} />;
      case 'security':
        return <SecuritySection security={results?.security || null} securityDiff={results?.security_diff || null} />;
      case 'diagnosis':
        return <DiagnosisSection diagnosis={results?.diagnosis || []} />;
      case 'diffs':
        return <DiffSection runs={results?.runs || []} />;
      case 'single':
        return <SingleCompareSection endpoint={config.endpoint} />;
      case 'prompt':
        return <PromptSection template={results?.meta?.recommended_finetune_retrieval_prompt || ''} />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.shell}>
      <Sidebar active={activeView} onNavigate={setActiveView} />
      <div className={styles.main}>
        <div className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <div className={styles.pageTitle}>
              {activeView === 'overview' && 'Overview'}
              {activeView === 'heatmap' && 'Capability Heatmap'}
              {activeView === 'comparison' && 'Global Comparison'}
              {activeView === 'security' && 'Security Regression Diff'}
              {activeView === 'diagnosis' && 'Regression Diagnosis'}
              {activeView === 'diffs' && 'Diff Viewer'}
              {activeView === 'single' && 'Single Question Compare'}
              {activeView === 'prompt' && 'Fine-Tune Prompt Template'}
            </div>
            {results?.meta && (
              <div className={styles.metaChip}>
                {results.meta.base_model} · {results.meta.level} · {results.meta.questions_per_domain}q/domain
              </div>
            )}
          </div>
          <div className={styles.topbarRight}>
            {loading && (
              <div className={styles.runningBadge}>
                <span className={styles.spinner} />
                Running... (parallel, ~4x faster)
              </div>
            )}
          </div>
        </div>
        <div className={styles.content}>
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
