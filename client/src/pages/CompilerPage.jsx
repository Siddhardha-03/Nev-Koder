import { useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, Download, Github, Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import { executeCode, runTestCase, submitSolution } from '../services/compilerService';
import LandingNavbar from '../components/LandingNavbar';
import defaultLogo from '../assets/logo_nev_new.svg';
import '../App.css';
import './CompilerPage.css';

const LANGUAGE_OPTIONS = [
  { label: 'Python', key: 'python', monaco: 'python', template: 'print("Hello, NevKoder!")\n' },
  {
    label: 'Java',
    key: 'java',
    monaco: 'java',
    template: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, NevKoder!");\n  }\n}\n'
  },
  {
    label: 'C++',
    key: 'cpp',
    monaco: 'cpp',
    template: '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hello, NevKoder!" << endl;\n  return 0;\n}\n'
  },
  { label: 'JavaScript', key: 'javascript', monaco: 'javascript', template: 'console.log("Hello, NevKoder!");\n' },
  {
    label: 'C',
    key: 'c',
    monaco: 'c',
    template: '#include <stdio.h>\n\nint main() {\n  printf("Hello, NevKoder!\\n");\n  return 0;\n}\n'
  },
  {
    label: 'C#',
    key: 'csharp',
    monaco: 'csharp',
    template: 'using System;\n\nclass Program {\n  static void Main() {\n    Console.WriteLine("Hello, NevKoder!");\n  }\n}\n'
  }
];

const getLanguageConfig = (key) => LANGUAGE_OPTIONS.find((item) => item.key === key) || LANGUAGE_OPTIONS[0];

const decodeIfNeeded = (value = '') => value;

const getProblemScaffold = (problem, languageKey) => {
  if (!problem || !problem.has_boilerplate) return null;
  const scaffolds = problem.scaffolds || {};
  const normalizedLanguage = languageKey === 'javascript' ? 'javascript' : languageKey;
  return scaffolds[normalizedLanguage] || null;
};

function CompilerPage({ problem = null, onRunResult = () => {}, onSubmitResult = () => {}, hideEmbeddedOutput = false }) {
  const isEmbedded = Boolean(problem);
  const hideOutputPanel = hideEmbeddedOutput || isEmbedded;
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(getLanguageConfig('python').template);
  const [editorSessionKey, setEditorSessionKey] = useState(0);
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState('Ready. Click Run to execute your code.');
  const [resultMeta, setResultMeta] = useState(null);
  const [running, setRunning] = useState(false);
  const [editorTheme, setEditorTheme] = useState('vs-dark');
  const [submissionResults, setSubmissionResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [runTestResult, setRunTestResult] = useState(null);
  const [awaitingInput, setAwaitingInput] = useState(false);
  const stdinRef = useRef(null);

  const languageConfig = useMemo(() => getLanguageConfig(language), [language]);

  useEffect(() => {
    const scaffold = getProblemScaffold(problem, language);
    setCode(scaffold || getLanguageConfig(language).template);
    setEditorSessionKey((value) => value + 1);
  }, [language, problem]);

  useEffect(() => {
    const onKeyDown = async (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        await handleRun();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [code, language, stdin]);

  const formatOutput = (result) => {
    const stdout = decodeIfNeeded(result?.stdout);
    const stderr = decodeIfNeeded(result?.stderr);
    const compileOutput = decodeIfNeeded(result?.compile_output);
    const message = decodeIfNeeded(result?.message);

    if (stdout) return stdout;
    if (stderr) return stderr;
    if (compileOutput) return compileOutput;
    if (message) return message;
    return 'No output returned.';
  };

  const handleRun = async () => {
    if (!code.trim()) {
      setOutput('Please enter some code before running.');
      return;
    }

    setAwaitingInput(false);

    try {
      setRunning(true);
      setOutput('Running your code...');

      // If problem exists, use runTestCase to get pass/fail status
      if (problem?.id) {
        const response = await runTestCase({
          sourceCode: code,
          language,
          questionId: problem.id
        });

        if (!response?.success) {
          setOutput(response?.message || 'Execution failed.');
          setRunTestResult(null);
          return;
        }

        const runData = response.data || null;
        setRunTestResult(runData);
        setOutput(runData?.actual || 'No output returned.');
        onRunResult({ runTestResult: runData, output: runData?.actual || '', resultMeta });
      } else {
        // For non-problem code, use regular executeCode
        const response = await executeCode({
          sourceCode: code,
          language,
          stdin,
          questionId: null
        });

        if (!response?.success) {
          setOutput(response?.message || 'Execution failed.');
          setRunTestResult(null);
          return;
        }

        const nextResult = response.result || null;
        setResultMeta(nextResult);
        const formattedOutput = formatOutput(nextResult);
        setOutput(formattedOutput);

        const combined = [
          nextResult?.stderr,
          nextResult?.compile_output,
          nextResult?.message,
          formattedOutput
        ].filter(Boolean).join(' ');

        const needsInput = !stdin.trim()
          && /(eoferror|eof|nosuchelementexception|scanner|input\(|cin|stdin)/i.test(combined);

        if (needsInput) {
          setAwaitingInput(true);
          setOutput(`${formattedOutput}\n\nProgram is waiting for stdin input. Enter input below and click Run again.`);
          setTimeout(() => stdinRef.current?.focus(), 0);
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message
        || error.response?.data?.details?.message
        || 'Execution error. Please try again.';
      setOutput(errorMessage);
      setResultMeta(null);
      setRunTestResult(null);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      setOutput('Please enter some code before submitting.');
      return;
    }

    if (!problem?.id) {
      setOutput('You can only submit solutions for practice problems.');
      return;
    }

    try {
      setSubmitting(true);
      setOutput('Submitting your solution...');

      const response = await submitSolution({
        sourceCode: code,
        language,
        questionId: problem.id
      });

      if (!response?.success) {
        setOutput(response?.message || 'Submission failed.');
        return;
      }

      const data = response.data || null;
      setSubmissionResults(data);
      onSubmitResult(data);
    } catch (error) {
      const errorMessage = error.response?.data?.message
        || error.response?.data?.details?.message
        || 'Submission error. Please try again.';
      setOutput(errorMessage);
      setSubmissionResults(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearCode = () => {
    setCode(languageConfig.template);
    setEditorSessionKey((value) => value + 1);
  };

  const handleClearInput = () => {
    setStdin('');
  };

  const handleClearOutput = () => {
    setOutput('Ready. Click Run to execute your code.');
    setAwaitingInput(false);
  };

  const handleDownloadCode = () => {
    const extensionMap = {
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      javascript: 'js',
      c: 'c',
      csharp: 'cs'
    };

    const extension = extensionMap[language] || 'txt';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solution.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="compiler-shell">
      {!isEmbedded && <LandingNavbar />}

      <main className={`compiler-main ${hideOutputPanel ? 'compiler-main-single' : ''}`}>
        <article className="compiler-editor">
          <div className="compiler-panel-header">
            <span>Editor</span>
            <div className="compiler-actions">
              <button type="button" className="compiler-btn compiler-btn-clear" onClick={() => setEditorTheme((prev) => (prev === 'vs-dark' ? 'vs-light' : 'vs-dark'))}>
                {editorTheme === 'vs-dark' ? 'Light' : 'Dark'} Theme
              </button>
              <button type="button" className="compiler-btn compiler-btn-clear" onClick={handleDownloadCode}>
                <Download size={15} /> Download
              </button>
              <select
                className="compiler-language-select"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                aria-label="Select language"
              >
                {LANGUAGE_OPTIONS.map((item) => (
                  <option value={item.key} key={item.key}>{item.label}</option>
                ))}
              </select>
              <button
                type="button"
                className="compiler-btn compiler-btn-run"
                onClick={handleRun}
                disabled={running || submitting}
              >
                <Play size={15} /> {running ? 'Running...' : 'Run'}
              </button>
              {problem?.id && (
                <button
                  type="button"
                  className="compiler-btn compiler-btn-submit"
                  onClick={handleSubmit}
                  disabled={running || submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              )}
              <button type="button" className="compiler-btn compiler-btn-clear" onClick={handleClearCode}>
                <RotateCcw size={15} /> Clear
              </button>
            </div>
          </div>
          <Editor
            key={`${language}-${editorSessionKey}`}
            height="clamp(340px, 78vh, 980px)"
            className="monaco-container"
            theme={editorTheme}
            language={languageConfig.monaco}
            defaultValue={code}
            onChange={(value) => setCode(value || '')}
            options={{
              fontSize: 14,
              lineNumbers: 'on',
              minimap: { enabled: false },
              automaticLayout: true,
              wordWrap: 'on',
              wrappingStrategy: 'advanced',
              wrappingIndent: 'same',
              scrollBeyondLastColumn: 0,
              scrollBeyondLastLine: false,
              quickSuggestions: false,
              suggestOnTriggerCharacters: false,
              wordBasedSuggestions: 'off',
              parameterHints: { enabled: false },
              snippetSuggestions: 'none',
              acceptSuggestionOnCommitCharacter: false,
              acceptSuggestionOnEnter: 'off',
              tabCompletion: 'off',
              tabSize: 2
            }}
          />
        </article>

        {!hideOutputPanel && (
          <article className="compiler-output">
            <div className="compiler-panel-header">
              <span>Output</span>
              <div className="compiler-actions">
                <button type="button" className="compiler-btn compiler-btn-clear" onClick={handleClearInput}>Clear Input</button>
                <button type="button" className="compiler-btn compiler-btn-clear" onClick={handleClearOutput}>Clear Output</button>
              </div>
            </div>
            <div className="compiler-output-body">
              <div className="compiler-stdin">
              <label htmlFor="output-stdin"><strong>stdin Input:</strong></label>
              <textarea
                ref={stdinRef}
                className="compiler-stdin-textarea"
                id="output-stdin"
                value={stdin}
                onChange={(event) => setStdin(event.target.value)}
                placeholder="Enter input for your program (stdin)..."
              />
              {awaitingInput && (
                <div className="compiler-awaiting-input">Program is waiting for input. Provide stdin and click Run again.</div>
              )}
            </div>
            <div>
              <strong>Console Output:</strong>
              <pre>{output || 'No output yet.'}</pre>
            </div>
            {runTestResult && (
              <div className="compiler-output-meta" style={{ marginTop: '0.8rem' }}>
                <div className="results-stat">
                  <div className="results-stat-label">Run Result</div>
                  <div className="results-stat-value">{runTestResult.passed ? 'Passed' : 'Failed'}</div>
                </div>
                <div className="results-stat">
                  <div className="results-stat-label">Expected</div>
                  <div className="results-stat-value">{runTestResult.expected}</div>
                </div>
                <div className="results-stat">
                  <div className="results-stat-label">Actual</div>
                  <div className="results-stat-value">{runTestResult.actual}</div>
                </div>
                <div className="results-stat">
                  <div className="results-stat-label">Time</div>
                  <div className="results-stat-value">{runTestResult.time || 'N/A'}</div>
                </div>
                <div className="results-stat">
                  <div className="results-stat-label">Memory</div>
                  <div className="results-stat-value">{runTestResult.memory || 'N/A'}</div>
                </div>
              </div>
            )}
            {submissionResults && (
              <div className="compiler-output-meta" style={{ marginTop: '0.8rem' }}>
                <div className="results-stat">
                  <div className="results-stat-label">Total</div>
                  <div className="results-stat-value">{submissionResults.summary.totalTestCases}</div>
                </div>
                <div className="results-stat success">
                  <div className="results-stat-label">Passed</div>
                  <div className="results-stat-value">{submissionResults.summary.passCount}</div>
                </div>
                <div className="results-stat failure">
                  <div className="results-stat-label">Failed</div>
                  <div className="results-stat-value">{submissionResults.summary.failCount}</div>
                </div>
                <div className="results-stat">
                  <div className="results-stat-label">Success</div>
                  <div className="results-stat-value">{submissionResults.summary.passPercentage}%</div>
                </div>
              </div>
            )}
          </div>
        </article>
        )}
      </main>

      {!isEmbedded && (
      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand-block">
            <div className="footer-brand">
              <img src={defaultLogo} alt="Nev Koder logo" className="footer-logo" />
            </div>
            <p>
              Build consistency with coding practice, smart assessments, and interview-ready quizzes.
            </p>
            <div className="footer-social" aria-label="Social links">
              <a href="#" aria-label="GitHub">
                <Github size={16} aria-hidden="true" />
              </a>
              <a href="#" aria-label="LinkedIn">
                <Linkedin size={16} aria-hidden="true" />
              </a>
              <a href="#" aria-label="Mail">
                <Mail size={16} aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="footer-links">
            <h4>Platform</h4>
            <a href="#">Practice Problems</a>
            <a href="#">Assessments</a>
            <a href="#">Quizzes</a>
            <a href="#">Leaderboard</a>
          </div>

          <div className="footer-links">
            <h4>Company</h4>
            <a href="#">About Us</a>
            <a href="#">Careers</a>
            <a href="#">Blog</a>
            <a href="#">Contact</a>
          </div>

          <div className="footer-contact">
            <h4>Get In Touch</h4>
            <p>
              <MapPin size={15} aria-hidden="true" />
              Bengaluru, India
            </p>
            <p>
              <Phone size={15} aria-hidden="true" />
              +91 98765 43210
            </p>
            <p>
              <Mail size={15} aria-hidden="true" />
              hello@nevkoder.com
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Nev Koder. All rights reserved.</p>
          <div>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Cookies</a>
          </div>
        </div>
      </footer>
      )}
    </section>
  );
}

export default CompilerPage;
