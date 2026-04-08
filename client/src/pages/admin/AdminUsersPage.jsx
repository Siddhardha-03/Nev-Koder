import { useEffect, useMemo, useState } from 'react';
import LandingNavbar from '../../components/LandingNavbar';
import AdminTabs from '../../components/admin/AdminTabs';
import { createAdminUser, deleteAdminUser, getAdminUsers } from '../../services/adminService';
import './AdminPages.css';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  verified: true
};

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    const response = await getAdminUsers();

    if (!response.success) {
      setError(response.message || 'Failed to load users.');
      setUsers([]);
    } else {
      setUsers(response.users || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;

    return users.filter((user) => {
      const name = String(user.name || '').toLowerCase();
      const email = String(user.email || '').toLowerCase();
      const role = String(user.role || '').toLowerCase();
      return name.includes(term) || email.includes(term) || role.includes(term);
    });
  }, [search, users]);

  const onChangeForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onCreateUser = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const response = await createAdminUser({ ...form, role: 'user' });
    setSaving(false);

    if (!response.success) {
      setError(response.message || 'Failed to create user.');
      return;
    }

    setSuccess('User created successfully.');
    setForm(emptyForm);
    await loadUsers();
  };

  const onDeleteUser = async (user) => {
    const confirmed = window.confirm(`Delete user ${user.email}?`);
    if (!confirmed) return;

    setError('');
    setSuccess('');

    const response = await deleteAdminUser(user.id);
    if (!response.success) {
      setError(response.message || 'Failed to delete user.');
      return;
    }

    setSuccess('User deleted successfully.');
    await loadUsers();
  };

  return (
    <section>
      <LandingNavbar />
      <main className="admin-shell">
        <header className="admin-header">
          <div>
            <p className="admin-header-badge">Identity and Access</p>
            <h1>User Management</h1>
            <p>Add users manually, set roles, and control verification from a single place.</p>
          </div>
        </header>

        <AdminTabs />

        <section className="admin-content-card">
          <h2 className="admin-subtitle">Create User</h2>

          <form className="admin-users-form" onSubmit={onCreateUser}>
            <input
              className="admin-input"
              value={form.name}
              onChange={(event) => onChangeForm('name', event.target.value)}
              placeholder="Full name"
              required
            />
            <input
              className="admin-input"
              type="email"
              value={form.email}
              onChange={(event) => onChangeForm('email', event.target.value)}
              placeholder="Email"
              required
            />
            <input
              className="admin-input"
              type="password"
              value={form.password}
              onChange={(event) => onChangeForm('password', event.target.value)}
              placeholder="Password"
              minLength={6}
              required
            />
            <label className="admin-switch">
              <input
                type="checkbox"
                checked={Boolean(form.verified)}
                onChange={(event) => onChangeForm('verified', event.target.checked)}
              />
              Mark as verified (skip email verification)
            </label>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </form>

          <div className="admin-users-toolbar">
            <input
              className="admin-input"
              placeholder="Search users by name, email, role"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {loading ? <div className="admin-loading">Loading users...</div> : null}
          {error ? <div className="admin-error">{error}</div> : null}
          {success ? <div className="admin-loading">{success}</div> : null}

          {!loading && !error && filteredUsers.length === 0 ? (
            <div className="admin-empty">No users found.</div>
          ) : null}

          {!loading && filteredUsers.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Verified</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`admin-badge ${user.role === 'admin' ? 'admin-badge-hard' : 'admin-badge-easy'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge ${user.is_verified ? 'admin-badge-easy' : 'admin-badge-medium'}`}>
                          {user.is_verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-danger"
                            onClick={() => onDeleteUser(user)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </main>
    </section>
  );
}

export default AdminUsersPage;
