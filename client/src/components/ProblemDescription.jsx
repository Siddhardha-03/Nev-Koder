function ProblemDescription({ problem }) {
  if (!problem) return null;

  const visibleTests = (problem.testCases || []).filter((tc) => !tc.hidden);
  const tags = problem.tags?.tags || [];

  return (
    <div className="problem-desc-card">
      <div className="problem-head">
        <h1>
          {problem.title?.toUpperCase()}
          {problem?.solved ? <span className="problem-solved-badge">Solved</span> : null}
         </h1>
        <span className={`problem-difficulty-badge problem-difficulty-${String(problem.difficulty || '').toLowerCase()}`}>
          {problem.difficulty}
          
        </span>
      </div>

      <section className="problem-section">
        <h3>Description</h3>
        <div
          className="problem-html"
          dangerouslySetInnerHTML={{ __html: problem.description || '<p>No description available.</p>' }}
        />
      </section>

      {Array.isArray(problem.examples) && problem.examples.length > 0 ? (
        <section className="problem-section">
          <h3>Examples</h3>
          <div className="problem-example-list">
            {problem.examples.map((example, index) => (
              <article key={`example-${index}`} className="problem-example-card">
                <p className="problem-example-title">Example {index + 1}</p>
                <div className="problem-code-inline">
                  <strong>Input:</strong> <span className="problem-code-value">{example.input || 'N/A'}</span>
                </div>
                <div className="problem-code-inline">
                  <strong>Output:</strong> <span className="problem-code-value">{example.output || 'N/A'}</span>
                </div>
                {example.explanation ? (
                  <div className="problem-code-block">
                    <strong>Explanation:</strong>
                    <pre>{example.explanation}</pre>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {problem.constraints ? (
        <section className="problem-section">
          <h3>Constraints</h3>
          <div className="problem-code-block">
            <pre>{problem.constraints}</pre>
          </div>
        </section>
      ) : null}

      {visibleTests.length > 0 ? (
        <section className="problem-section">
          <h3>Sample Test Cases</h3>
          <div className="problem-example-list">
            {visibleTests.map((tc, index) => (
              <article key={`tc-${index}`} className="problem-example-card">
                <p className="problem-example-title">Case {index + 1}</p>
                <div className="problem-code-inline">
                  <strong>Input:</strong> <span className="problem-code-value">{tc.input || 'N/A'}</span>
                </div>
                <div className="problem-code-inline">
                  <strong>Output:</strong> <span className="problem-code-value">{tc.expected_output || 'N/A'}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tags.length > 0 ? (
        <section className="problem-section">
          <h3>Tags</h3>
          <div className="problem-tag-list">
            {tags.map((tag) => (
              <span className="problem-tag-pill" key={tag}>{tag}</span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default ProblemDescription;
