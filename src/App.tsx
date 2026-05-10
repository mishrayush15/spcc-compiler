import { useState, useRef, useCallback, useMemo } from 'react';
import { processMacro, EXAMPLES, type ProcessorResult } from './macroProcessor';

type MainTab = 'processor' | 'docs';
type DetailsTab = 'pass1' | 'pass2' | 'errors';

function App() {
  const [mainTab, setMainTab] = useState<MainTab>('processor');
  const [code, setCode] = useState(EXAMPLES[0].code);
  const [result, setResult] = useState<ProcessorResult | null>(null);
  const [detailsTab, setDetailsTab] = useState<DetailsTab>('pass1');
  const [showExamples, setShowExamples] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleProcess = useCallback(() => {
    const res = processMacro(code);
    setResult(res);
    setDetailsTab(res.errors.length > 0 ? 'errors' : 'pass1');
  }, [code]);

  const handleClear = () => {
    setCode('');
    setResult(null);
    textareaRef.current?.focus();
  };

  const handleLoadExample = (exampleCode: string) => {
    setCode(exampleCode);
    setResult(null);
    setShowExamples(false);
  };

  return (
    <>
      <div className="app-bg" />

      {/* Sticky Header */}
      <header className="header">
        <div className="header-inner">
          <div className="header-left">
            <div className="logo">
              <div className="logo-icon">μ</div>
              <div className="logo-text">Mini<span>Macro</span></div>
            </div>
            <span className="header-badge">Two-Pass Processor</span>
          </div>
          <div className="header-right">
            <button className={`header-link ${mainTab === 'processor' ? 'active' : ''}`} onClick={() => setMainTab('processor')}>
              Processor
            </button>
            <button className={`header-link ${mainTab === 'docs' ? 'active' : ''}`} onClick={() => setMainTab('docs')}>
              Documentation
            </button>
          </div>
        </div>
      </header>

      <div className="app">
        {mainTab === 'processor' ? (
          <ProcessorView
            code={code} setCode={setCode} result={result}
            detailsTab={detailsTab} setDetailsTab={setDetailsTab}
            showExamples={showExamples} setShowExamples={setShowExamples}
            textareaRef={textareaRef}
            onProcess={handleProcess} onClear={handleClear} onLoadExample={handleLoadExample}
          />
        ) : (
          <DocsView />
        )}
      </div>
    </>
  );
}

/* ── Syntax highlight helper ── */
function highlightLine(line: string) {
  const parts: { text: string; cls: string }[] = [];
  const tokens = line.split(/(\s+)/);
  for (const tok of tokens) {
    const upper = tok.toUpperCase();
    if (['MACRO', 'MEND'].includes(upper)) parts.push({ text: tok, cls: 'kw' });
    else if (['LOAD', 'STORE', 'ADD'].includes(upper)) parts.push({ text: tok, cls: 'instr' });
    else if (/^&\w+/.test(tok)) parts.push({ text: tok, cls: 'param' });
    else if (/^\d+$/.test(tok)) parts.push({ text: tok, cls: 'num' });
    else parts.push({ text: tok, cls: '' });
  }
  return parts;
}

/* ============================================================
   Processor View
   ============================================================ */
interface ProcessorViewProps {
  code: string;
  setCode: (v: string) => void;
  result: ProcessorResult | null;
  detailsTab: DetailsTab;
  setDetailsTab: (t: DetailsTab) => void;
  showExamples: boolean;
  setShowExamples: (v: boolean) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onProcess: () => void;
  onClear: () => void;
  onLoadExample: (code: string) => void;
}

function ProcessorView({
  code, setCode, result, detailsTab, setDetailsTab,
  showExamples, setShowExamples, textareaRef,
  onProcess, onClear, onLoadExample,
}: ProcessorViewProps) {
  const errorCount = result?.errors.filter(e => e.type === 'error').length ?? 0;
  const warningCount = result?.errors.filter(e => e.type === 'warning').length ?? 0;
  const lineCount = code.split('\n').length;

  const lineNumbers = useMemo(() =>
    Array.from({ length: lineCount }, (_, i) => i + 1), [lineCount]
  );

  // Sync scroll between line numbers and textarea
  const lineNumRef = useRef<HTMLDivElement>(null);
  const handleScroll = () => {
    if (lineNumRef.current && textareaRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  return (
    <>
      {/* Editor Grid */}
      <div className="editor-grid">
        <div className="editor-panel">
          <div className="panel-header">
            <div className="panel-title"><span className="dot" /> Input Code</div>
            <div className="panel-status">{lineCount} lines</div>
          </div>
          <div className="code-editor-wrapper">
            <div className="line-numbers" ref={lineNumRef}>
              {lineNumbers.map(n => <span key={n}>{n}</span>)}
            </div>
            <textarea
              ref={textareaRef}
              className="code-input"
              value={code}
              onChange={e => setCode(e.target.value)}
              onScroll={handleScroll}
              placeholder="Write your MiniMacro code here..."
              spellCheck={false}
              id="code-input"
            />
          </div>
        </div>

        <div className="editor-panel output-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className={`dot ${result ? (errorCount > 0 ? 'red' : 'green') : 'cyan'}`} />
              Expanded Output
            </div>
            {result && <div className="panel-status">{result.expandedCode.length} lines</div>}
          </div>
          {result ? (
            <div className="code-output">
              {result.expandedCode.length > 0
                ? result.expandedCode.map((line, i) => (
                    <div key={i}>
                      {highlightLine(line).map((p, j) =>
                        p.cls ? <span key={j} className={p.cls}>{p.text}</span> : p.text
                      )}
                    </div>
                  ))
                : <span style={{ color: 'var(--on-surface-muted)', fontStyle: 'italic' }}>(no output — check errors below)</span>
              }
            </div>
          ) : (
            <div className="code-output empty">
              <span style={{ fontSize: 20, opacity: 0.3 }}>▶</span>
              Click "Process" to see expanded output
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      {result && (
        <div className="status-bar">
          <div className={`status-pill ${errorCount > 0 ? 'error' : 'success'}`}>
            <span className="status-dot" />
            {errorCount > 0
              ? `${errorCount} error${errorCount > 1 ? 's' : ''}${warningCount > 0 ? `, ${warningCount} warning${warningCount > 1 ? 's' : ''}` : ''} found`
              : `Processed successfully — ${result.mnt.length} macro${result.mnt.length !== 1 ? 's' : ''}, ${result.expandedCode.length} lines expanded`
            }
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="action-bar">
        <button className={`btn btn-primary ${!result ? 'pulse' : ''}`} onClick={onProcess} id="btn-process">
          <span>▶</span> Process
        </button>
        <button className="btn btn-outline" onClick={onClear} id="btn-clear">Clear</button>
        <div className="action-spacer" />
        <div className="examples-dropdown">
          <button className="btn btn-outline" onClick={() => setShowExamples(!showExamples)} id="btn-examples">
            Load Example ▾
          </button>
          {showExamples && (
            <>
              <div className="overlay" onClick={() => setShowExamples(false)} />
              <div className="examples-menu">
                {EXAMPLES.map((ex, i) => (
                  <button key={i} className="example-item" onClick={() => onLoadExample(ex.code)}>
                    <div className="example-item-name">{ex.name}</div>
                    <div className="example-item-desc">{ex.description}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Details Section */}
      {result && (
        <div className="details-section">
          <div className="details-tabs">
            <button className={`details-tab ${detailsTab === 'pass1' ? 'active' : ''}`} onClick={() => setDetailsTab('pass1')}>
              Pass 1 — MNT / MDT
            </button>
            <button className={`details-tab ${detailsTab === 'pass2' ? 'active' : ''}`} onClick={() => setDetailsTab('pass2')}>
              Pass 2 — Expansion
            </button>
            <button className={`details-tab ${detailsTab === 'errors' ? 'active' : ''}`} onClick={() => setDetailsTab('errors')}>
              Errors
              {errorCount > 0 ? <span className="error-count">{errorCount + warningCount}</span>
                : <span className="success-count">✓</span>}
            </button>
          </div>
          <div className="details-content">
            {detailsTab === 'pass1' && <Pass1Details result={result} />}
            {detailsTab === 'pass2' && <Pass2Details result={result} />}
            {detailsTab === 'errors' && <ErrorsDetails result={result} />}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Pass 1 ── */
function Pass1Details({ result }: { result: ProcessorResult }) {
  return (
    <>
      <div className="table-label">
        <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 6px var(--primary-glow)' }} />
        Macro Name Table (MNT)
      </div>
      {result.mnt.length === 0 ? (
        <div className="empty-state"><div className="empty-state-text">No macros defined.</div></div>
      ) : (
        <table className="data-table">
          <thead><tr><th>Index</th><th>Macro Name</th><th>Parameters</th><th>MDT Index</th></tr></thead>
          <tbody>
            {result.mnt.map(e => (
              <tr key={e.index}><td>{e.index}</td><td>{e.name}</td><td>{e.paramCount}</td><td>{e.mdtIndex}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="table-label" style={{ marginTop: 24 }}>
        <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--secondary)', boxShadow: '0 0 6px var(--secondary-glow)' }} />
        Macro Definition Table (MDT)
      </div>
      {result.mdt.length === 0 ? (
        <div className="empty-state"><div className="empty-state-text">No macro definitions.</div></div>
      ) : (
        <table className="data-table">
          <thead><tr><th>Index</th><th>Statement</th></tr></thead>
          <tbody>
            {result.mdt.map(e => (
              <tr key={e.index}><td>{e.index}</td><td>{e.line}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      {result.ala.length > 0 && (
        <>
          <div className="table-label" style={{ marginTop: 24 }}>
            <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)', boxShadow: '0 0 6px rgba(255,183,125,0.3)' }} />
            Argument List Array (ALA)
          </div>
          {result.ala.map((entries, idx) => (
            <div key={idx} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--on-surface-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
                Macro: {result.mnt[idx]?.name ?? `#${idx}`}
              </div>
              {entries.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--on-surface-muted)', fontStyle: 'italic' }}>(no parameters)</div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Index</th><th>Parameter</th></tr></thead>
                  <tbody>
                    {entries.map(e => <tr key={e.index}><td>{e.index}</td><td>&{e.param}</td></tr>)}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </>
      )}
    </>
  );
}

/* ── Pass 2 ── */
function Pass2Details({ result }: { result: ProcessorResult }) {
  if (result.pass2Steps.length === 0) {
    return <div className="empty-state"><div className="empty-state-icon">⚙</div><div className="empty-state-text">No expansion steps.</div></div>;
  }
  return (
    <div>
      {result.pass2Steps.map(s => (
        <div className="step-item" key={s.step}>
          <span className="step-num">{s.step}</span>
          <span className="step-desc">{s.description}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Errors ── */
function ErrorsDetails({ result }: { result: ProcessorResult }) {
  if (result.errors.length === 0) {
    return <div className="empty-state"><div className="empty-state-icon">✓</div><div className="empty-state-text">No errors found. Your MiniMacro code processed successfully!</div></div>;
  }
  return (
    <div>
      {result.errors.map((err, i) => (
        <div className={`error-card ${err.type}`} key={i}>
          <span className="error-icon">{err.type === 'error' ? '✕' : '⚠'}</span>
          <div>
            <div>{err.message}</div>
            <div className="error-line">Line {err.line}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Documentation View
   ============================================================ */
function DocsView() {
  return (
    <>
      <h2 className="doc-section-title">MiniMacro Language Reference</h2>
      <div className="docs-grid">
        <div className="doc-card">
          <h3>📝 Predefined Keywords</h3>
          <p>MiniMacro supports 5 predefined keywords that form the core of the language:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['MACRO', 'MEND', 'LOAD', 'STORE', 'ADD'].map(k => <span className="keyword-chip" key={k}>{k}</span>)}
          </div>
        </div>
        <div className="doc-card">
          <h3>🔧 Macro Definition</h3>
          <p>Define reusable macros with parameters using the MACRO keyword:</p>
          <code>{`MACRO macro_name &param1, &param2\n  LOAD &param1\n  ADD &param2\n  STORE RESULT\nMEND`}</code>
        </div>
        <div className="doc-card">
          <h3>📞 Macro Invocation</h3>
          <p>Call a defined macro by name followed by comma-separated arguments:</p>
          <code>{`macro_name arg1, arg2`}</code>
          <p style={{ marginTop: 12 }}>Arguments replace the corresponding parameters during expansion.</p>
        </div>
        <div className="doc-card">
          <h3>⚙ Two-Pass Processing</h3>
          <p><strong>Pass 1:</strong> Scans input to build the Macro Name Table (MNT) and Macro Definition Table (MDT). Parameters are stored with positional notation (#0, #1...).</p>
          <p style={{ marginBottom: 0 }}><strong>Pass 2:</strong> Processes non-macro lines. When a macro call is found, it looks up the MNT, retrieves the body from MDT, and substitutes arguments.</p>
        </div>
      </div>

      <h2 className="doc-section-title" style={{ marginTop: 32 }}>Error Handling</h2>
      <div style={{ maxWidth: 700 }}>
        {[
          { title: 'Undefined Macro', desc: 'Raised when a macro is called but never defined.' },
          { title: 'Parameter Count Mismatch', desc: "Raised when argument count doesn't match the definition." },
          { title: 'Missing MEND', desc: 'Raised when a MACRO definition is never closed.' },
          { title: 'Nested Macro Definition', desc: 'Raised when MACRO appears inside another macro body.' },
          { title: 'Reserved Keyword Conflict', desc: 'Warning when a macro name matches a reserved keyword.' },
        ].map((err, i) => (
          <div className="error-type-card" key={i}>
            <span style={{ color: 'var(--error)', fontSize: 16 }}>✕</span>
            <div><strong>{err.title}</strong><p>{err.desc}</p></div>
          </div>
        ))}
      </div>
    </>
  );
}

export default App;
