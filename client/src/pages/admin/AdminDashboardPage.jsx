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
            <h1>Admin Dashboard</h1>
            <p>Manage each feature from dedicated tabs and keep your learning platform structured.</p>
          </div>
          <div className="admin-header-actions">
            <Link to="/admin/questions?create=1" className="admin-btn admin-btn-primary">Create Question</Link>
            <Link to="/admin/learning-paths" className="admin-btn admin-btn-primary">Create Learning Path</Link>
            <Link to="/admin/questions" className="admin-btn admin-btn-secondary">View All Questions</Link>
          </div>
        </header>

        <AdminTabs />

        <section className="admin-content-card">
          <h2 className="admin-subtitle">Feature Tabs</h2>
          <div className="admin-feature-grid">
            <Link to="/admin/dashboard" className="admin-feature-card">
              <p className="admin-feature-kicker">Overview</p>
              <h3>Dashboard</h3>
              <p>View key platform stats and jump quickly to management features.</p>
            </Link>
            <Link to="/admin/questions" className="admin-feature-card">
              <p className="admin-feature-kicker">Content</p>
              <h3>Questions</h3>
              <p>Create, edit, and curate coding problems by difficulty and topic.</p>
            </Link>
            <Link to="/admin/learning-paths" className="admin-feature-card">
              <p className="admin-feature-kicker">Curriculum</p>
              <h3>Learning Paths</h3>
              <p>Build structured topic-wise journeys with selected existing problems.</p>
            </Link>
          </div>
        </section>

        {loading ? <div className="admin-loading">Loading dashboard stats...</div> : null}
        {error ? <div className="admin-error">{error}</div> : null}

        {!loading && !error ? (
          <section className="admin-grid">
            <article className="admin-card">
              <p className="admin-stat-title">Total Questions</p>
              <p className="admin-stat-value">{stats.total}</p>
            </article>
            <article className="admin-card">
              <p className="admin-stat-title">Easy</p>
              <p className="admin-stat-value">{stats.easy}</p>
            </article>
            <article className="admin-card">
              <p className="admin-stat-title">Medium</p>
              <p className="admin-stat-value">{stats.medium}</p>
            </article>
            <article className="admin-card">
              <p className="admin-stat-title">Hard</p>
              <p className="admin-stat-value">{stats.hard}</p>
            </article>
          </section>
        ) : null}
      </main>
    </section>
  );
}

export default AdminDashboardPage;
