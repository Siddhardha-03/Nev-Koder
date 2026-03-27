import React from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function OutputModal({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  loading,
  output,
  runTestResult,
  submissionResults,
  resultMeta,
}) {
  const getStatusBadge = (status) => {
    if (!status) return null;
    return (
      <span className={`output-badge ${status.toLowerCase().includes('pass') ? 'passed' : 'failed'}`}>
        {status.toLowerCase().includes('pass') ? '✅ Passed' : '❌ Failed'}
      </span>
    );
  };

  const renderRunResult = () => {
    if (!runTestResult) {
      return <div>No run result available.</div>;
    }

    return (
      <div className="output-section">
        <div className="output-row"><strong>Input:</strong> <code>{runTestResult.input || 'N/A'}</code></div>
        <div className="output-row"><strong>Expected Output:</strong> <code>{runTestResult.expected || 'N/A'}</code></div>
        <div className="output-row"><strong>Your Output:</strong> <code>{runTestResult.actual || 'N/A'}</code></div>
        <div className="output-row"><strong>Status:</strong> {getStatusBadge(runTestResult.passed ? 'passed' : 'failed')}</div>
        {runTestResult.time && <div className="output-row"><strong>Time:</strong> {runTestResult.time}s</div>}
        {runTestResult.memory && <div className="output-row"><strong>Memory:</strong> {runTestResult.memory}KB</div>}
      </div>
    );
  };

  const renderSubmissionResult = () => {
    if (!submissionResults) {
      return <div>No submission results available.</div>;
    }

    return (
      <div className="output-section">
        <div className="summary-grid">
          <div><strong>Total:</strong> {submissionResults.summary.totalTestCases}</div>
          <div><strong>Passed:</strong> {submissionResults.summary.passCount}</div>
          <div><strong>Failed:</strong> {submissionResults.summary.failCount}</div>
          <div><strong>Success:</strong> {submissionResults.summary.passPercentage}%</div>
        </div>
        {submissionResults.results?.map((test, idx) => (
          <div key={`${test.testCaseId}-${idx}`} className={`test-case-result ${test.passed ? 'passed' : 'failed'}`}>
            <div className="test-case-title">
              {test.passed ? <CheckCircle size={14} /> : <XCircle size={14} />} Test Case {idx + 1} {test.isHidden ? '(Hidden)' : ''}
            </div>
            <div><strong>Input:</strong> <code>{test.input || 'N/A'}</code></div>
            <div><strong>Expected:</strong> <code>{test.expected || 'N/A'}</code></div>
            <div><strong>Actual:</strong> <code>{test.actual || 'N/A'}</code></div>
            <div><strong>Status:</strong> {getStatusBadge(test.passed ? 'passed' : 'failed')}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderConsoleOutput = () => (
    <div className="output-section">
      <div className="output-row"><strong>Console Output:</strong></div>
      <pre>{output || 'No output yet.'}</pre>
      <div className="output-row">{resultMeta ? <><strong>Runtime:</strong> {resultMeta.time || 'N/A'}s &nbsp; <strong>Memory:</strong> {resultMeta.memory || 'N/A'}KB</> : null}</div>
    </div>
  );

  return (
    <>
      <div className={`output-modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`output-modal ${isOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Output result panel">
        <div className="output-modal-header">
          <div className="output-modal-tabs">
            <button className={activeTab === 'testResults' ? 'active' : ''} onClick={() => setActiveTab('testResults')}>Test Results</button>
            <button className={activeTab === 'console' ? 'active' : ''} onClick={() => setActiveTab('console')}>Console Output</button>
            <button className={activeTab === 'submission' ? 'active' : ''} onClick={() => setActiveTab('submission')}>Submission Result</button>
          </div>
          <button className="output-modal-close" onClick={onClose} aria-label="Close output panel">✕</button>
        </div>
        <div className="output-modal-content">
          {loading ? (
            <div className="output-loading">
              <Loader size={20} className="spin" /> <span>Loading results...</span>
            </div>
          ) : (
            <>
              {activeTab === 'testResults' && renderRunResult()}
              {activeTab === 'console' && renderConsoleOutput()}
              {activeTab === 'submission' && renderSubmissionResult()}
            </>
          )}
        </div>
      </div>
    </>
  );
}
