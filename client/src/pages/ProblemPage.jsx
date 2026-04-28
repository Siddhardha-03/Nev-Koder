import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar';
import ProblemLayout from '../components/ProblemLayout';
import { getPublicProblemById } from '../services/problemsService';
import { getPublicLearningPathById } from '../services/learningPathService';
import './ProblemPage.css';

function ProblemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [problem, setProblem] = useState(null);
  const [learningPath, setLearningPath] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPath, setLoadingPath] = useState(false);
  const [error, setError] = useState('');
  const learningPathId = searchParams.get('learningPathId');

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

  useEffect(() => {
    const loadLearningPath = async () => {
      if (!learningPathId) return;

      setLoadingPath(true);
      const response = await getPublicLearningPathById(learningPathId);
      if (response.success) {
        setLearningPath(response.learningPath || null);
      }
      setLoadingPath(false);
    };

    loadLearningPath();
  }, [learningPathId]);

  const learningPathProblems = useMemo(() => {
    if (!learningPath?.topics?.length) return [];
    return learningPath.topics.flatMap((topic) => topic.problems || []);
  }, [learningPath]);

  const nextProblemId = useMemo(() => {
    if (!learningPathProblems.length || !id) return null;

    const currentIndex = learningPathProblems.findIndex((item) => String(item.id) === String(id));
    if (currentIndex === -1) return null;

    return learningPathProblems[currentIndex + 1]?.id || null;
  }, [id, learningPathProblems]);

  const hasLearningPathContext = Boolean(learningPathId && learningPath);
  const showNextButton = Boolean(learningPathId);

  return (
    <section className="problem-page-shell">
      <LandingNavbar />

      <main className="problem-page-main">
        {(learningPathId || hasLearningPathContext) ? (
          <div className="problem-page-top">
            <div className="problem-page-path-note">
              {loadingPath ? 'Loading learning path context...' : learningPath?.title || 'Learning Path Problem'}
            </div>
            <div className="problem-page-actions">
              {learningPathId ? (
                <Link to={`/learning-paths/${learningPathId}`} className="problem-back-link problem-back-link-button">
                  Back to Learning Path
                </Link>
              ) : null}
              {showNextButton ? (
                <button
                  type="button"
                  className="problem-next-button"
                  disabled={!nextProblemId}
                  onClick={() => navigate(`/problems/${nextProblemId}?learningPathId=${learningPathId}`)}
                >
                  Next
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {loading ? <div className="problem-status problem-status-loading">Loading problem...</div> : null}
        {error ? <div className="problem-status problem-status-error">{error}</div> : null}

        {!loading && !error && problem ? <ProblemLayout problem={problem} /> : null}
      </main>
    </section>
  );
}

export default ProblemPage;
