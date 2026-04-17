import { useCallback, useEffect, useRef, useState } from 'react';
import { recordQuizViolation } from '../services/quizService';

const VIOLATION_COOLDOWN_MS = 1500;

function useProctoring({ enabled, attemptId, onAutoSubmitted }) {
  const [warning, setWarning] = useState(null);
  const lastViolationRef = useRef({
    type: '',
    timestamp: 0
  });

  const closeWarning = useCallback(() => setWarning(null), []);

  const reportViolation = useCallback(async (violationType, details = null, message = 'Suspicious activity detected.') => {
    if (!enabled || !attemptId) return;

    const now = Date.now();
    if (
      lastViolationRef.current.type === violationType
      && now - lastViolationRef.current.timestamp < VIOLATION_COOLDOWN_MS
    ) {
      return;
    }

    lastViolationRef.current = {
      type: violationType,
      timestamp: now
    };

    const response = await recordQuizViolation(attemptId, violationType, details);

    if (!response.success) {
      setWarning({
        title: 'Proctoring Alert',
        message: response.message || message,
        level: 'error'
      });
      return;
    }

    if (response.auto_submitted) {
      setWarning({
        title: 'Quiz Auto-Submitted',
        message: 'Too many violations were detected. Your attempt has been auto-submitted.',
        level: 'error'
      });

      if (typeof onAutoSubmitted === 'function') {
        onAutoSubmitted(response.auto_submit_result || null);
      }

      return;
    }

    setWarning({
      title: 'Warning',
      message,
      level: 'warning',
      violationCount: response.violation_count,
      tabSwitchCount: response.tab_switch_count
    });
  }, [attemptId, enabled, onAutoSubmitted]);

  useEffect(() => {
    if (!enabled) return undefined;

    const onVisibilityChange = () => {
      if (document.hidden) {
        reportViolation(
          'tab_switch',
          { source: 'visibilitychange' },
          'Tab switching is not allowed during this proctored quiz.'
        );
      }
    };

    const onCopy = (event) => {
      event.preventDefault();
      reportViolation(
        'copy_blocked',
        { source: 'copy' },
        'Copy action blocked for this proctored quiz.'
      );
    };

    const onContextMenu = (event) => {
      event.preventDefault();
      reportViolation(
        'context_menu_blocked',
        { source: 'contextmenu' },
        'Right-click is disabled for this proctored quiz.'
      );
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('copy', onCopy);
    document.addEventListener('contextmenu', onContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('contextmenu', onContextMenu);
    };
  }, [enabled, reportViolation]);

  return {
    active: Boolean(enabled),
    warning,
    closeWarning
  };
}

export default useProctoring;
