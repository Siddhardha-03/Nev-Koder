import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Edit3, Briefcase, Target, Zap, Award, TrendingUp, CheckCircle } from 'lucide-react';
import LandingNavbar from '../components/LandingNavbar';
import { getPublicProblems } from '../services/problemsService';
import { getDashboardStats } from '../services/authService';
import './ProblemsPage.css';

function ProblemsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [tag, setTag] = useState('');
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progressStats, setProgressStats] = useState(null);

  const normalizedProblems = useMemo(() => problems || [], [problems]);

  const loadProblems = async (nextSearch = search, nextDifficulty = difficulty, nextTag = tag) => {
    setLoading(true);
    setError('');

    const response = await getPublicProblems({
      search: nextSearch,
      difficulty: nextDifficulty,
      tag: nextTag
    });

    if (!response.success) {
      setError(response.message || 'Failed to load problems.');
      setProblems([]);
    } else {
      setProblems(response.questions || []);
    }

    setLoading(false);
  };

  const loadProgressStats = async () => {
    const response = await getDashboardStats();
    if (response.success && response.stats) {
      setProgressStats(response.stats);
    }
  };

  useEffect(() => {
    loadProblems();
    loadProgressStats();
  }, []);


  return (
    <section>
      <LandingNavbar />

      <main className="problems-shell">
        <header className="problems-header">
          <div className="problems-header-cards">
            <Link to="/learning-paths" className="progress-feature-card progress-card-learning">
              <div className="feature-top-row">
                <span className="feature-kicker">Guided</span>
                <span className="feature-arrow">→</span>
              </div>
              <span className="feature-icon"><BookOpen size={28} aria-hidden="true" /></span>
              <div className="feature-title">Learning Path</div>
              <div className="feature-subtitle">Structured roadmap from basics to advanced</div>
            </Link>

            <Link to="/practice-sheets" className="progress-feature-card progress-card-practice">
              <div className="feature-top-row">
                <span className="feature-kicker">Focused</span>
                <span className="feature-arrow">→</span>
              </div>
              <span className="feature-icon"><Edit3 size={28} aria-hidden="true" /></span>
              <div className="feature-title">Practice Sheets</div>
              <div className="feature-subtitle">Topic-wise sets to build problem-solving speed</div>
            </Link>

            <Link to="/interview-prep" className="progress-feature-card progress-card-interview">
              <div className="feature-top-row">
                <span className="feature-kicker">Career</span>
                <span className="feature-arrow">→</span>
              </div>
              <span className="feature-icon"><Briefcase size={28} aria-hidden="true" /></span>
              <div className="feature-title">Interview Prep</div>
              <div className="feature-subtitle">Company-style practice for real interview rounds</div>
            </Link>
          </div>
        </header>

        {progressStats ? (
          <section className="progress-block">
            <div className="progress-stat-card progress-card-primary">
              <span className="progress-stat-icon"><Target size={24} aria-hidden="true" /></span>
              <div className="progress-stat-content">
                <div className="progress-stat-label">Total Solved</div>
                <div className="progress-stat-value">{progressStats.solvedQuestions}</div>
              </div>
            </div>

            <div className="progress-stat-card progress-card-streak">
              <span className="progress-stat-icon"><Zap size={24} aria-hidden="true" /></span>
              <div className="progress-stat-content">
                <div className="progress-stat-label">Day Streak</div>
                <div className="progress-stat-value">{progressStats.dayStreak}</div>
              </div>
            </div>

            <div className="progress-stat-card progress-card-easy">
              <span className="progress-stat-icon"><Award size={24} aria-hidden="true" /></span>
              <div className="progress-stat-content">
                <div className="progress-stat-label">Easy</div>
                <div className="progress-stat-value">{progressStats.easyCount}</div>
              </div>
            </div>

            <div className="progress-stat-card progress-card-medium">
              <span className="progress-stat-icon"><TrendingUp size={24} aria-hidden="true" /></span>
              <div className="progress-stat-content">
                <div className="progress-stat-label">Medium</div>
                <div className="progress-stat-value">{progressStats.mediumCount}</div>
              </div>
            </div>

            <div className="progress-stat-card progress-card-hard">
              <span className="progress-stat-icon"><CheckCircle size={24} aria-hidden="true" /></span>
              <div className="progress-stat-content">
                <div className="progress-stat-label">Hard</div>
                <div className="progress-stat-value">{progressStats.hardCount}</div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="problems-toolbar">
          <input
            className="problems-input"
            placeholder="Search by title"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="problems-select" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option value="">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
          <input
            className="problems-input"
            placeholder="Filter by tag (e.g. beginner)"
            value={tag}
            onChange={(event) => setTag(event.target.value)}
          />
          <button type="button" className="problems-btn problems-btn-primary" onClick={() => loadProblems(search, difficulty, tag)}>
            Apply
          </button>
        </section>

        {loading ? <div className="problems-loading">Loading problems...</div> : null}
        {error ? <div className="problems-error">{error}</div> : null}

        {!loading && !error && normalizedProblems.length === 0 ? (
          <div className="problems-empty">No problems found. Try updating search or filters.</div>
        ) : null}

        {!loading && normalizedProblems.length > 0 ? (
          <section className="problems-list" aria-label="Problems list">
            <div className="problems-list-head" role="row">
              <span>Title</span>
              <span>Difficulty</span>
              <span>Type</span>
              <span>Tags</span>
              <span>Action</span>
            </div>
            {normalizedProblems.map((problem, index) => {
              const tags = problem.tags?.tags || [];

              return (
                <article
                  className="problems-row"
                  key={problem.id}
                  onClick={() => navigate(`/problems/${problem.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="problems-row-title">
                    <div className="problems-row-number">{index + 1}.</div>
                    <h3>
                      {problem.title}
                      {problem.solved ? <span className="problems-solved-pill">Solved</span> : null}
                    </h3>
                    <p>{String(problem.description || '').slice(0, 120)}...</p>
                  </div>

                  <div className="problems-row-cell">
                    <span className={`problems-badge problems-badge-${String(problem.difficulty || '').toLowerCase()}`}>
                      {problem.difficulty}
                    </span>
                  </div>

                  <div className="problems-row-cell">
                    <span className="problems-badge problems-badge-type">{problem.question_type || 'General'}</span>
                  </div>

                  <div className="problems-tags problems-row-tags">
                    {tags.slice(0, 5).map((item) => (
                      <span className="problems-tag" key={`${problem.id}-${item}`}>{item}</span>
                    ))}
                    {tags.length === 0 ? <span className="problems-tag">No tags</span> : null}
                  </div>

                  <div className="problems-row-cell problems-row-action">
                    <Link
                      to={`/problems/${problem.id}`}
                      className={`problems-btn ${problem.solved ? 'problems-btn-solved' : 'problems-btn-primary'}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {problem.solved ? 'Solved' : 'Solve'}
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}
      </main>

    </section>
  );
}

export default ProblemsPage;
