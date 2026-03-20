import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { CircleUserRound } from 'lucide-react';
import { getStoredUser, isAuthenticated, logout } from '../services/authService';

function LandingNavbar() {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const user = getStoredUser();
  const loggedInUserName = user?.name || user?.email || 'User';
  const isLoggedIn = isAuthenticated() && !!user;
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    setIsUserMenuOpen(false);
    navigate('/login');
  }

  return (
    <header className="top-nav">
      <div className="brand">
        <img src="/Logo_nev.svg" alt="Nev Koder logo" className="brand-logo" />
        <span className="brand-name">Koder</span>
      </div>
      <nav className="menu-links" aria-label="Main navigation">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/problems">Problems</NavLink>
        <a href="#">Assessments</a>
        <a href="#">Quizzes</a>
        <NavLink to="/compiler">Compiler</NavLink>
        {isAdmin ? <NavLink to="/admin/dashboard">Admin</NavLink> : null}
        {!isLoggedIn && <NavLink to="/login">Sign In</NavLink>}
      </nav>
      <div className="menu-actions">
        {isLoggedIn ? (
          <div className="nav-user-menu" ref={menuRef}>
            <button
              type="button"
              className="btn btn-outline nav-user-chip"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              title={loggedInUserName}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
            >
              <CircleUserRound size={24} aria-hidden="true" />
              <span>{loggedInUserName}</span>
            </button>

            {isUserMenuOpen && (
              <div className="nav-user-dropdown" role="menu" aria-label="User menu">
                <Link to="/dashboard" className="nav-dropdown-item" role="menuitem" onClick={() => setIsUserMenuOpen(false)}>
                  Dashboard
                </Link>
                {isAdmin ? (
                  <Link to="/admin/dashboard" className="nav-dropdown-item" role="menuitem" onClick={() => setIsUserMenuOpen(false)}>
                    Admin Panel
                  </Link>
                ) : null}
                <button type="button" className="nav-dropdown-item nav-dropdown-logout" role="menuitem" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link to="/login" className="btn btn-outline">Sign In</Link>
            <Link to="/register" className="btn btn-accent">Join Now</Link>
          </>
        )}
      </div>
    </header>
  );
}

export default LandingNavbar;
