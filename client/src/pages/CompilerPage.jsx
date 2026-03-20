import { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, Clipboard, Download, Github, Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import { executeCode } from '../services/compilerService';
import LandingNavbar from '../components/LandingNavbar';
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

function CompilerPage() {
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(getLanguageConfig('python').template);
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState('Ready. Click Run to execute your code.');
  const [resultMeta, setResultMeta] = useState(null);
  const [running, setRunning] = useState(false);
  const [editorTheme, setEditorTheme] = useState('vs-dark');

  const languageConfig = useMemo(() => getLanguageConfig(language), [language]);

  useEffect(() => {
    setCode(getLanguageConfig(language).template);
  }, [language]);

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

    try {
      setRunning(true);
      setOutput('Running your code...');

      const response = await executeCode({
        sourceCode: code,
        language,
        stdin
      });

      if (!response?.success) {
        setOutput(response?.message || 'Execution failed.');
        return;
      }

      setResultMeta(response.result || null);
      setOutput(formatOutput(response.result));
    } catch (error) {
      const errorMessage = error.response?.data?.message
        || error.response?.data?.details?.message
        || 'Execution error. Please try again.';
      setOutput(errorMessage);
      setResultMeta(null);
    } finally {
      setRunning(false);
    }
  };

  const handleClearCode = () => {
    setCode(languageConfig.template);
  };

  const handleClearOutput = () => {
    setOutput('');
    setResultMeta(null);
  };

  const handleCopyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output || '');
    } catch {
      // no-op
    }
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
      <LandingNavbar />

      <main className="compiler-main">
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
                disabled={running}
              >
                <Play size={15} /> {running ? 'Running...' : 'Run'}
              </button>
              <button type="button" className="compiler-btn compiler-btn-clear" onClick={handleClearCode}>
                <RotateCcw size={15} /> Clear
              </button>
            </div>
          </div>
          <Editor
            height="clamp(340px, 78vh, 980px)"
            className="monaco-container"
            theme={editorTheme}
            language={languageConfig.monaco}
            value={code}
            onChange={(value) => setCode(value || '')}
            options={{
              fontSize: 14,
              lineNumbers: 'on',
              minimap: { enabled: false },
              automaticLayout: true,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              tabSize: 2
            }}
          />
        </article>

        <article className="compiler-output">
          <div className="compiler-panel-header">
            <span>Output</span>
            <div className="compiler-actions">
              <button type="button" className="compiler-btn compiler-btn-clear" onClick={handleCopyOutput}>
                <Clipboard size={15} /> Copy
              </button>
              <button type="button" className="compiler-btn compiler-btn-clear" onClick={handleClearOutput}>
                Clear Output
              </button>
            </div>
          </div>
          <div className="compiler-stdin">
            <label htmlFor="stdin">Custom Input (stdin)</label>
            <textarea
              id="stdin"
              value={stdin}
              onChange={(event) => setStdin(event.target.value)}
              placeholder="Enter stdin here (optional)..."
            />
          </div>
          <div className="compiler-output-body">{output || 'No output yet.'}</div>
          <div className="compiler-output-meta">
            <span className="compiler-badge">Status: {resultMeta?.status?.description || 'Idle'}</span>
            <span className="compiler-badge">Time: {resultMeta?.time || 'N/A'}</span>
            <span className="compiler-badge">Memory: {resultMeta?.memory || 'N/A'}</span>
          </div>
        </article>
      </main>

      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand-block">
            <div className="footer-brand">
              <img src="/Logo_nev.svg" alt="Nev Koder logo" className="footer-logo" />
              <span className="footer-brand-name">Koder</span>
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
    </section>
  );
}

export default CompilerPage;
