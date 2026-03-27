import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { CircleUserRound } from 'lucide-react';
import { getStoredUser, isAuthenticated, logout } from '../services/authService';
import homeLogo from '../assets/Logo_new_nev_home.svg';
import defaultLogo from '../assets/logo_nev_new.svg';

function LandingNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const user = getStoredUser();
  const loggedInUserName = user?.name || user?.email || 'User';
  const isLoggedIn = isAuthenticated() && !!user;
  const isAdmin = user?.role === 'admin';
  const brandLogo = location.pathname === '/' ? homeLogo : defaultLogo;

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Close mobile menu when route changes
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    setIsUserMenuOpen(false);
    navigate('/login');
  }

  return (
    <header className="top-nav">
      <div className="brand">
        <img src={brandLogo} alt="Nev Koder logo" className="brand-logo" />
      </div>

      <button
        className="mobile-menu-toggle"
        type="button"
        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMobileMenuOpen}
        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
      >
        <span aria-hidden="true">☰</span>
      </button>

      <div className={`nav-content${isMobileMenuOpen ? ' open' : ''}`}>
        <nav className="menu-links" aria-label="Main navigation">
          <NavLink to="/" onClick={() => setIsMobileMenuOpen(false)}>Home</NavLink>
          <NavLink to="/problems" onClick={() => setIsMobileMenuOpen(false)}>Problems</NavLink>
          <a href="#" onClick={() => setIsMobileMenuOpen(false)}>Assessments</a>
          <a href="#" onClick={() => setIsMobileMenuOpen(false)}>Quizzes</a>
          <NavLink to="/compiler" onClick={() => setIsMobileMenuOpen(false)}>Compiler</NavLink>
          {isAdmin ? <NavLink to="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)}>Admin</NavLink> : null}
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
      </div>
    </header>
  );
}

export default LandingNavbar;
