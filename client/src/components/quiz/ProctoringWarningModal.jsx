function ProctoringWarningModal({ warning, onClose }) {
  if (!warning) return null;

  return (
    <div className="quiz-warning-backdrop" role="presentation">
      <div className="quiz-warning-modal" role="dialog" aria-modal="true" aria-label="Proctoring warning">
        <h3>{warning.title || 'Warning'}</h3>
        <p>{warning.message}</p>
        {typeof warning.violationCount === 'number' ? (
          <p className="quiz-warning-meta">
            Violations: {warning.violationCount}
            {typeof warning.tabSwitchCount === 'number' ? ` | Tab switches: ${warning.tabSwitchCount}` : ''}
          </p>
        ) : null}
        <button type="button" className="quiz-btn quiz-btn-primary" onClick={onClose}>
          Continue
        </button>
      </div>
    </div>
  );
}

export default ProctoringWarningModal;
