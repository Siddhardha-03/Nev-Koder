import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar';
import { getPublicLearningPathById, getPublicLearningPaths } from '../services/learningPathService';
import './LearningPathPage.css';
import './ProblemsPage.css';

function LearningPathPage() {
  const { id } = useParams();
  const isDetailPage = Boolean(id);

  const [paths, setPaths] = useState([]);
  const [loadingPaths, setLoadingPaths] = useState(true);
  const [pathsError, setPathsError] = useState('');

  const [learningPath, setLearningPath] = useState(null);
  const [expandedTopicId, setExpandedTopicId] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    if (isDetailPage) return;

    const loadPaths = async () => {
      setLoadingPaths(true);
      setPathsError('');

      const response = await getPublicLearningPaths();
      if (!response.success) {
        setPathsError(response.message || 'Failed to load learning paths.');
        setPaths([]);
      } else {
        setPaths(response.learningPaths || []);
      }

      setLoadingPaths(false);
    };

    loadPaths();
  }, [isDetailPage]);

  useEffect(() => {
    if (!isDetailPage) return;

    const loadDetails = async () => {
      setLoadingDetail(true);
      setDetailError('');

      const response = await getPublicLearningPathById(id);
      if (!response.success) {
        setDetailError(response.message || 'Failed to load learning path details.');
        setLearningPath(null);
        setLoadingDetail(false);
        return;
      }

      const nextPath = response.learningPath || null;
      setLearningPath(nextPath);

      const firstTopicId = nextPath?.topics?.[0]?.id;
      setExpandedTopicId(firstTopicId ? String(firstTopicId) : '');
      setLoadingDetail(false);
    };

    loadDetails();
  }, [id, isDetailPage]);

  return (
    <section>
      <LandingNavbar />

      <main className="learning-path-shell">
        {!isDetailPage ? (
          <>
            <header className="learning-path-header">
              <h1>Learning Paths</h1>
              <p>Choose a structured track and start practicing topic by topic.</p>
            </header>

            {loadingPaths ? <div className="learning-loading">Loading learning paths...</div> : null}
            {pathsError ? <div className="learning-error">{pathsError}</div> : null}

            {!loadingPaths && !pathsError && paths.length === 0 ? (
              <div className="learning-empty">No learning paths available yet.</div>
            ) : null}

            {!loadingPaths && paths.length > 0 ? (
              <section className="learning-path-cards" aria-label="Learning path cards">
                {paths.map((path) => (
                  <Link to={`/learning-paths/${path.id}`} className="learning-path-card" key={path.id}>
                    <div className="learning-card-kicker">Structured Track</div>
                    <h3>{path.title}</h3>

                    <p>{path.description || 'Follow this path topic-by-topic with curated coding questions.'}</p>

                    <div className="learning-card-meta">
                      <span>{Number(path.topic_count || 0)} Topics</span>
                      <span>{Number(path.problem_count || 0)} Problems</span>
                    </div>
                    <span className="learning-card-cta">Open Path →</span>
                  </Link>
                ))}
              </section>
            ) : null}
          </>
        ) : (
          <>
            <header className="learning-path-header">
              <h1>{learningPath?.title || 'Learning Path'}</h1>
              <p>{learningPath?.description || 'Practice this path topic by topic.'}</p>

              {!loadingDetail && !detailError && learningPath ? (
                <section className="learning-header-progress" aria-label="Selected path progress">
                  <div className="learning-header-progress-top">
                    <span>Path Progress</span>
                    <strong>{Number(learningPath.progress_percent || 0)}%</strong>
                  </div>
                  <div className="learning-header-progress-bar">
                    <div
                      className="learning-header-progress-fill"
                      style={{ width: `${Number(learningPath.progress_percent || 0)}%` }}
                    ></div>
                  </div>
                  <div className="learning-header-stats">
                    <span>{Number(learningPath.solved_problem_count || 0)} solved</span>
                    <span>{Number(learningPath.problem_count || 0)} total</span>
                    <span>{Number(learningPath.topics?.length || 0)} topics</span>
                  </div>
                </section>
              ) : null}

              <Link to="/learning-paths" className="learning-back-link">← Back to all learning paths</Link>
            </header>

            {loadingDetail ? <div className="learning-loading">Loading path details...</div> : null}
            {detailError ? <div className="learning-error">{detailError}</div> : null}

            {!loadingDetail && !detailError && learningPath ? (
              <>
                <section className="learning-topic-rows" aria-label="Learning path topics">
                  {learningPath.topics?.length ? learningPath.topics.map((topic, index) => {
                    const isOpen = String(expandedTopicId) === String(topic.id);
                    const problems = topic.problems || [];

                    return (
                      <article className={`learning-topic-row ${isOpen ? 'learning-topic-row-open' : ''}`} key={topic.id}>
                        <button
                          type="button"
                          className="learning-topic-toggle"
                          onClick={() => setExpandedTopicId((prev) => (String(prev) === String(topic.id) ? '' : String(topic.id)))}
                        >
                          <div className="learning-topic-left">
                            <span className="learning-topic-index">{index + 1}</span>
                            <div>
                              <h3>{topic.title}</h3>
                              <p>{problems.length} problems in this topic</p>
                            </div>
                          </div>
                          <span className={`learning-topic-chevron ${isOpen ? 'learning-topic-chevron-open' : ''}`}>▾</span>
                        </button>

                        {isOpen ? (
                          <div className="learning-topic-dropdown">
                            {problems.length === 0 ? (
                              <div className="learning-empty">No problems found in this topic.</div>
                            ) : (
                              <div className="learning-problem-list">
                                {problems.map((problem) => (
                                  <article className="learning-problem-row" key={problem.id}>
                                    <div className="learning-problem-main">
                                      <h4>{problem.title}</h4>
                                      <p>Practice this question from topic: {topic.title}</p>
                                    </div>
                                    <div className="learning-problem-meta">
                                      <span className={`problems-badge problems-badge-${String(problem.difficulty || '').toLowerCase()}`}>
                                        {problem.difficulty || 'General'}
                                      </span>
                                      <Link
                                        to={`/problems/${problem.id}`}
                                        className={`problems-btn ${problem.solved ? 'problems-btn-solved' : 'problems-btn-primary'}`}
                                      >
                                        {problem.solved ? 'Solved' : 'Solve'}
                                      </Link>
                                    </div>
                                  </article>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </article>
                    );
                  }) : (
                    <div className="learning-empty">No topics available in this learning path.</div>
                  )}
                </section>
              </>
            ) : null}
          </>
        )}
      </main>
    </section>
  );
}

export default LearningPathPage;
