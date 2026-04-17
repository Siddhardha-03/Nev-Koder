import { NavLink } from 'react-router-dom';

const tabs = [
  {
    to: '/admin/dashboard',
    label: 'Dashboard',
    description: 'Overview, metrics, and operational insights'
  },
  {
    to: '/admin/questions',
    label: 'Questions',
    description: 'Create and manage coding problems'
  },
  {
    to: '/admin/learning-paths',
    label: 'Learning Paths',
    description: 'Design structured practice journeys'
  },
  {
    to: '/admin/quizzes',
    label: 'Quizzes',
    description: 'Create proctored and non-proctored quizzes'
  },
  {
    to: '/admin/users',
    label: 'User Management',
    description: 'Add, verify, and control platform users'
  },
  {
    to: '/admin/assessments',
    label: 'Assessments',
    description: 'Build assessments and assignments'
  }
];

function AdminTabs() {
  return (
    <nav className="admin-nav-cards" aria-label="Admin sections">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `admin-nav-card${isActive ? ' admin-nav-card-active' : ''}`}
        >
          <strong>{tab.label}</strong>
          <span>{tab.description}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default AdminTabs;