import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar';
import ProblemLayout from '../components/ProblemLayout';
import { getPublicProblemById } from '../services/problemsService';
import './ProblemPage.css';

function ProblemPage() {
  const { id } = useParams();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProblem = async () => {
      if (!id) {
        setError('Problem ID is required.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      const response = await getPublicProblemById(id);
      if (!response.success) {
        setError(response.message || 'Failed to load problem.');
        setProblem(null);
      } else {
        setProblem(response.question || null);
      }

      setLoading(false);
    };

    loadProblem();
  }, [id]);

  return (
    <section className="problem-page-shell">
      <LandingNavbar />

      <main className="problem-page-main">
        <div className="problem-page-top">
          <Link to="/problems" className="problem-back-link">← Back to Problems</Link>
          {problem?.solved ? <span className="problem-solved-badge">Solved</span> : null}
        </div>

        {loading ? <div className="problem-status problem-status-loading">Loading problem...</div> : null}
        {error ? <div className="problem-status problem-status-error">{error}</div> : null}

        {!loading && !error && problem ? <ProblemLayout problem={problem} /> : null}
      </main>
    </section>
  );
}

export default ProblemPage;
