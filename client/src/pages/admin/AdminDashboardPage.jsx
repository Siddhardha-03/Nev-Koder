import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LandingNavbar from '../../components/LandingNavbar';
import AdminTabs from '../../components/admin/AdminTabs';
import { getQuestionStats } from '../../services/adminService';
import './AdminPages.css';

function AdminDashboardPage() {
  const [stats, setStats] = useState({ total: 0, easy: 0, medium: 0, hard: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const total = Math.max(0, Number(stats.total) || 0);
  const easy = Math.max(0, Number(stats.easy) || 0);
  const medium = Math.max(0, Number(stats.medium) || 0);
  const hard = Math.max(0, Number(stats.hard) || 0);

  const toPercent = (value) => {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  };

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      setError('');
      const response = await getQuestionStats();

      if (!response.success) {
        setError(response.message || 'Failed to load admin stats.');
      } else {
        setStats(response.stats || { total: 0, easy: 0, medium: 0, hard: 0 });
      }

      setLoading(false);
    };

    loadStats();
  }, []);

  return (
    <section>
      <LandingNavbar />
      <main className="admin-shell">
        <header className="admin-header">
          <div>
            <p className="admin-header-badge">Control Center</p>
            <h1>Admin Dashboard</h1>
            <p>Operate your platform with a structured, premium workspace built for quick decisions.</p>
          </div>
          <div className="admin-header-actions">
            <Link to="/admin/questions?create=1" className="admin-btn admin-btn-primary">Create Question</Link>
            <Link to="/admin/learning-paths" className="admin-btn admin-btn-primary">Create Learning Path</Link>
            <Link to="/admin/questions" className="admin-btn admin-btn-secondary">View All Questions</Link>
          </div>
        </header>

        <AdminTabs />

        {loading ? <div className="admin-loading">Loading dashboard stats...</div> : null}
        {error ? <div className="admin-error">{error}</div> : null}

        {!loading && !error ? (
          <>
            <section className="admin-grid">
              <article className="admin-card admin-card-total">
                <p className="admin-stat-title">Total Questions</p>
                <p className="admin-stat-value">{total}</p>
                <p className="admin-stat-caption">Complete library currently available on the platform.</p>
              </article>
              <article className="admin-card">
                <p className="admin-stat-title">Easy</p>
                <p className="admin-stat-value">{easy}</p>
                <p className="admin-stat-caption">{toPercent(easy)}% of total</p>
              </article>
              <article className="admin-card">
                <p className="admin-stat-title">Medium</p>
                <p className="admin-stat-value">{medium}</p>
                <p className="admin-stat-caption">{toPercent(medium)}% of total</p>
              </article>
              <article className="admin-card">
                <p className="admin-stat-title">Hard</p>
                <p className="admin-stat-value">{hard}</p>
                <p className="admin-stat-caption">{toPercent(hard)}% of total</p>
              </article>
            </section>

            <section className="admin-highlight-grid">
              <article className="admin-highlight-card">
                <h3>Difficulty Distribution</h3>
                <div className="admin-progress-list">
                  <div className="admin-progress-item">
                    <span>Easy</span>
                    <div className="admin-progress-track"><div className="admin-progress-fill admin-progress-easy" style={{ width: `${toPercent(easy)}%` }} /></div>
                    <strong>{toPercent(easy)}%</strong>
                  </div>
                  <div className="admin-progress-item">
                    <span>Medium</span>
                    <div className="admin-progress-track"><div className="admin-progress-fill admin-progress-medium" style={{ width: `${toPercent(medium)}%` }} /></div>
                    <strong>{toPercent(medium)}%</strong>
                  </div>
                  <div className="admin-progress-item">
                    <span>Hard</span>
                    <div className="admin-progress-track"><div className="admin-progress-fill admin-progress-hard" style={{ width: `${toPercent(hard)}%` }} /></div>
                    <strong>{toPercent(hard)}%</strong>
                  </div>
                </div>
              </article>

              <article className="admin-highlight-card">
                <h3>Operations Checklist</h3>
                <ul className="admin-checklist">
                  <li>Review new submissions and difficulty balance weekly.</li>
                  <li>Keep learning paths updated with the latest core problems.</li>
                  <li>Prioritize medium and hard additions for interview readiness.</li>
                </ul>
              </article>
            </section>
          </>
        ) : null}
      </main>
    </section>
  );
}

export default AdminDashboardPage;
