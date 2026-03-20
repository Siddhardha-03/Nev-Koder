import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/questions', label: 'Questions' },
  { to: '/admin/learning-paths', label: 'Learning Paths' }
];

function AdminTabs() {
  return (
    <nav className="admin-tabs" aria-label="Admin feature tabs">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `admin-tab${isActive ? ' admin-tab-active' : ''}`}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default AdminTabs;