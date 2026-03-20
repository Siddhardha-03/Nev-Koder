import { useState, useRef, useEffect } from 'react';
import CompilerPage from '../pages/CompilerPage';
import ProblemDescription from './ProblemDescription';
import './ProblemLayout.css';

function ProblemLayout({ problem }) {
  const [leftPaneWidth, setLeftPaneWidth] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;

      // Constrain width between 30% and 70%
      if (newWidth > 30 && newWidth < 70) {
        setLeftPaneWidth(newWidth);
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

  return (
    <div className="problem-layout-shell" ref={containerRef}>
      <div className="problem-left-pane" style={{ width: `${leftPaneWidth}%` }}>
        <ProblemDescription problem={problem} />
      </div>

      <div
        className="problem-divider"
        onMouseDown={() => setIsDragging(true)}
        title="Drag to resize"
      />

      <div className="problem-right-pane" style={{ width: `${100 - leftPaneWidth}%` }}>
        <div className="problem-compiler-embed">
          <CompilerPage problem={problem} />
        </div>
      </div>
    </div>
  );
}

export default ProblemLayout;
