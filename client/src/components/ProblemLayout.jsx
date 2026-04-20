import { useState, useRef, useEffect } from 'react';
import CompilerPage from '../pages/CompilerPage';
import ProblemDescription from './ProblemDescription';
import './ProblemLayout.css';

function ProblemLayout({ problem }) {
  const [leftPaneWidth, setLeftPaneWidth] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);

  const [rightBottomPercentage, setRightBottomPercentage] = useState(35); // percent of right pane height
  const [isResizingBottom, setIsResizingBottom] = useState(false);

  const [outputInfo, setOutputInfo] = useState({
    runTestResult: null,
    submissionResults: null,
    output: '',
    resultMeta: null
  });
  const [activeOutputTab, setActiveOutputTab] = useState('testResults');
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false);

  const containerRef = useRef(null);
  const rightRef = useRef(null);

  useEffect(() => {
    const savedWidth = Number(localStorage.getItem('problemPaneWidth') || 50);
    if (!Number.isNaN(savedWidth) && savedWidth >= 30 && savedWidth <= 70) {
      setLeftPaneWidth(savedWidth);
    }

    const savedBottom = Number(localStorage.getItem('problemRightBottomPercent') || 35);
    if (!Number.isNaN(savedBottom) && savedBottom >= 15 && savedBottom <= 60) {
      setRightBottomPercentage(savedBottom);
    }
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;

      if (newWidth >= 30 && newWidth <= 70) {
        setLeftPaneWidth(newWidth);
        localStorage.setItem('problemPaneWidth', Number(newWidth.toFixed(2)));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (!isResizingBottom) return;

    const handleMouseMove = (e) => {
      if (!rightRef.current) return;

      const rect = rightRef.current.getBoundingClientRect();
      const newHeight = ((rect.bottom - e.clientY) / rect.height) * 100;

      if (newHeight >= 15 && newHeight <= 60) {
        setRightBottomPercentage(newHeight);
        localStorage.setItem('problemRightBottomPercent', Number(newHeight.toFixed(2)));
      }
    };

    const handleMouseUp = () => {
      setIsResizingBottom(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingBottom]);

  useEffect(() => {
    if (!showSuccessCelebration) return undefined;

    const timer = setTimeout(() => {
      setShowSuccessCelebration(false);
    }, 3200);

    return () => clearTimeout(timer);
  }, [showSuccessCelebration]);

  const submissionSummary = outputInfo.submissionResults?.summary || null;
  const failedSubmissionCases = (outputInfo.submissionResults?.results || []).filter((item) => !item.passed);
  const isSubmissionAccepted = Boolean(
    submissionSummary
    && Number(submissionSummary.totalTestCases || 0) > 0
    && Number(submissionSummary.failCount || 0) === 0
  );

  return (
    <div className="problem-layout-shell" ref={containerRef}>
      <div className="problem-left-pane" style={{ width: `${leftPaneWidth}%` }}>
        <ProblemDescription problem={problem}  />
         
      </div>

      <div
        className="problem-divider"
        onMouseDown={() => setIsDragging(true)}
        title="Drag to resize"
      />

      <div className="problem-right-pane" style={{ width: `${100 - leftPaneWidth}%` }}>
        <div className="problem-right-inner" ref={rightRef}>
          <div
            className="problem-right-top"
            style={{ height: `calc(${100 - rightBottomPercentage}% - 4px)` }}
          >
            <div className="problem-compiler-embed">
              <CompilerPage
                problem={problem}
                hideEmbeddedOutput={true}
                onRunResult={(data) => {
                  setOutputInfo((prev) => ({ ...prev, ...data }));
                  setActiveOutputTab('testResults');
                  setRightBottomPercentage((prev) => Math.max(prev, 45));
                }}
                onSubmitResult={(submissionResults) => {
                  setOutputInfo((prev) => ({ ...prev, submissionResults }));
                  setActiveOutputTab('submission');
                  setRightBottomPercentage((prev) => Math.max(prev, 45));
                  if (
                    submissionResults?.summary
                    && Number(submissionResults.summary.totalTestCases || 0) > 0
                    && Number(submissionResults.summary.failCount || 0) === 0
                  ) {
                    setShowSuccessCelebration(true);
                  }
                }}
              />
            </div>
          </div>

          <div
            className="problem-right-bottom-divider"
            onMouseDown={() => setIsResizingBottom(true)}
            title="Drag to resize output panel"
          />

          <div
            className="problem-right-bottom"
            style={{ height: `${rightBottomPercentage}%` }}
          >
            <div className="problem-output-header">
              <div className="output-tab-buttons">
                <button
                  className={activeOutputTab === 'testResults' ? 'active' : ''}
                  onClick={() => setActiveOutputTab('testResults')}
                >
                  Test Case Results
                </button>
                <button
                  className={activeOutputTab === 'submission' ? 'active' : ''}
                  onClick={() => setActiveOutputTab('submission')}
                >
                  Submission Results
                </button>
              </div>
            </div>
            <div className="problem-output-content">
              {activeOutputTab === 'testResults' && (
                <>
                  <div className="output-row"><strong>Console:</strong></div>
                  <pre className="output-pre">{outputInfo.output || 'No console output available.'}</pre>

                  {outputInfo.runTestResult?.compilationError && (
                    <div className="output-pre" style={{ background: '#fff2f2', borderColor: '#f8c0c0' }}>
                      <strong>Compilation Error:</strong>
                      <pre>{outputInfo.runTestResult.compilationError}</pre>
                    </div>
                  )}

                  {outputInfo.runTestResult?.runtimeError && (
                    <div className="output-pre" style={{ background: '#fff4e5', borderColor: '#f0c27a' }}>
                      <strong>Runtime Error:</strong>
                      <pre>{outputInfo.runTestResult.runtimeError}</pre>
                    </div>
                  )}

                  {outputInfo.resultMeta && (
                    <div className="output-row">
                      Time: {outputInfo.resultMeta.time || 'N/A'}s | Memory: {outputInfo.resultMeta.memory || 'N/A'}KB
                    </div>
                  )}

                  <hr />
                  {outputInfo.runTestResult ? (
                    <>
                      <div className="output-row">Status: {outputInfo.runTestResult.passed ? '✅ Passed' : '❌ Failed'}</div>
                      <div className="output-row">Expected: {outputInfo.runTestResult.expected}</div>
                      <div className="output-row">Actual: {outputInfo.runTestResult.actual}</div>
                      <div className="output-row">Time: {outputInfo.runTestResult.time}</div>
                      <div className="output-row">Memory: {outputInfo.runTestResult.memory}</div>
                    </>
                  ) : (
                    <div className="output-row">No test data available; run your code first.</div>
                  )}
                </>
              )}

              {activeOutputTab === 'submission' && (
                <>
                  {outputInfo.submissionResults ? (
                    <>
                      <div className="submission-premium-wrap">
                        <div className={`submission-status-banner ${isSubmissionAccepted ? 'accepted' : 'failed'}`}>
                          <div className="submission-status-title">
                            {isSubmissionAccepted ? 'Accepted' : 'Submission Failed'}
                          </div>
                          <div className="submission-status-subtitle">
                            {isSubmissionAccepted
                              ? 'Excellent work. Your solution passed every test case.'
                              : 'Review the failed cases below and refine your approach.'}
                          </div>
                        </div>

                        <div className="submission-summary-grid">
                          <div className="submission-stat-card">
                            <div className="submission-stat-label">Total Cases</div>
                            <div className="submission-stat-value">{submissionSummary?.totalTestCases ?? 0}</div>
                          </div>
                          <div className="submission-stat-card success">
                            <div className="submission-stat-label">Passed Cases</div>
                            <div className="submission-stat-value">{submissionSummary?.passCount ?? 0}</div>
                          </div>
                          <div className="submission-stat-card failure">
                            <div className="submission-stat-label">Failed Cases</div>
                            <div className="submission-stat-value">{submissionSummary?.failCount ?? 0}</div>
                          </div>
                          <div className="submission-stat-card">
                            <div className="submission-stat-label">Success Rate</div>
                            <div className="submission-stat-value">{submissionSummary?.passPercentage ?? 0}%</div>
                          </div>
                        </div>

                        {failedSubmissionCases.length > 0 ? (
                          <div className="submission-failed-list">
                            {failedSubmissionCases.map((item, index) => (
                              <div key={`${item.testCaseId || index}-${index}`} className="submission-case-card">
                                <div className="submission-case-title">Failed Case {index + 1}</div>
                                <div className="submission-case-line"><strong>Input:</strong> {item.input || 'N/A'}</div>
                                <div className="submission-case-line"><strong>Expected:</strong> {item.expected || 'N/A'}</div>
                                <div className="submission-case-line"><strong>Actual:</strong> {item.actual || 'N/A'}</div>
                                {item.error ? <div className="submission-case-line"><strong>Error:</strong> {item.error}</div> : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="submission-perfect-note">
                            Passed test cases: {submissionSummary?.passCount ?? 0}. No failed cases.
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="output-row">No submission results available; submit your solution.</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSuccessCelebration && (
        <div className="success-celebration-overlay" aria-hidden="true">
          <div className="success-celebration-core">
            <div className="success-celebration-ring" />
            <div className="success-celebration-check">✓</div>
          </div>
          <div className="success-celebration-text">Brilliant Submission!</div>
          <div className="success-celebration-subtext">All test cases passed.</div>
          {Array.from({ length: 20 }).map((_, idx) => (
            <span
              key={idx}
              className="success-spark"
              style={{
                left: `${5 + (idx * 4.5)}%`,
                animationDelay: `${(idx % 6) * 0.12}s`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProblemLayout;
