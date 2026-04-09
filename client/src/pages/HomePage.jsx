import {
  ArrowRight,
  Braces,
  Code2,
  Github,
  HelpCircle,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  TimerReset,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LandingNavbar from '../components/LandingNavbar'
import { isAuthenticated } from '../services/authService'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'
import homeLogo from '../assets/Logo_new_nev_home.svg'
import compilerIcon from '../assets/compiler_icon.png'
import heroImg from '../assets/hero.png'
import interviewPrepIcon from '../assets/Interview_prep.png'
import learningPathIcon from '../assets/learing path icon.png'
import mockAssessmentIcon from '../assets/mock_assesment_icon.png'
import practiceSheetIcon from '../assets/practice_sheet_icon.png'
import quizIcon from '../assets/quiz_icon.png'
import solveChallengesIcon from '../assets/solve_challenges.png'
import '../App.css'

function HomePage() {
  const navigate = useNavigate();
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const title = 'NevKoder | Coding Practice Platform, Compiler & Interview Prep';
    const description = 'NevKoder is a modern coding practice platform designed to help developers practice, learn, and prepare for interviews with programming problems, coding sheets, an online compiler, and assessments.';
    const keywords = 'NevKoder, nevkoder, nev-koder, Nev-Koder, coding practice platform, coding interview preparation, online coding compiler, DSA practice, programming problems, coding sheets, learn coding online';

    document.title = title;

    const setMetaTag = (selector, attributes) => {
      let element = document.head.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
        document.head.appendChild(element);
      }
      return element;
    };

    setMetaTag('meta[name="description"]', { name: 'description' }).setAttribute('content', description);
    setMetaTag('meta[name="keywords"]', { name: 'keywords' }).setAttribute('content', keywords);
    setMetaTag('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', title);
    setMetaTag('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', description);
    setMetaTag('meta[name="twitter:title"]', { name: 'twitter:title' }).setAttribute('content', title);
    setMetaTag('meta[name="twitter:description"]', { name: 'twitter:description' }).setAttribute('content', description);

    const canonicalHref = `${window.location.origin}/`;
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalHref);

    const scriptId = 'nevkoder-json-ld';
    let script = document.head.querySelector(`#${scriptId}`);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'NevKoder',
      alternateName: ['nevkoder', 'nev-koder', 'Nev-Koder'],
      url: canonicalHref,
      description,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${canonicalHref}problems?search={search_term_string}`,
        'query-input': 'required name=search_term_string'
      },
      publisher: {
        '@type': 'Organization',
        name: 'NevKoder',
        alternateName: ['nevkoder', 'nev-koder', 'Nev-Koder']
      }
    });

    return () => {
      const existingScript = document.head.querySelector(`#${scriptId}`);
      if (existingScript) existingScript.remove();
    };
  }, []);
  const heroHeadline = 'Level Up Your Coding Skills';
  const [typedHeadline, setTypedHeadline] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();

    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setTypedHeadline(heroHeadline);
      setIsTypingDone(true);
      return;
    }

    setTypedHeadline('');
    setIsTypingDone(false);

    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    const baseDelay = isMobile ? 68 : 54;
    let timerId;
    let cancelled = false;

    const getNextDelay = (nextCharacter) => {
      if (!nextCharacter) return baseDelay;
      if (nextCharacter === ' ') return Math.round(baseDelay * 0.7);
      if (/[.,!?]/.test(nextCharacter)) return Math.round(baseDelay * 3.4);
      return baseDelay;
    };

    const typeNext = (currentIndex) => {
      if (cancelled) return;

      const nextIndex = currentIndex + 1;
      setTypedHeadline(heroHeadline.slice(0, nextIndex));

      if (nextIndex >= heroHeadline.length) {
        setIsTypingDone(true);
        return;
      }

      const nextCharacter = heroHeadline[nextIndex];
      timerId = window.setTimeout(() => typeNext(nextIndex), getNextDelay(nextCharacter));
    };

    // A small intro delay makes the animation feel deliberate.
    timerId = window.setTimeout(() => typeNext(0), 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [heroHeadline, prefersReducedMotion]);

  const onStartPracticing = () => {
    if (isAuthenticated()) {
      navigate('/problems');
    } else {
      navigate('/login');
    }
  };

  const featureCards = [
    {
      title: 'Solve Coding Challenges',
      desc: 'Sharpen your skills with a wide range of coding problems.',
      icon: Braces,
      image: solveChallengesIcon,
      route: '/problems',
    },
    {
      title: 'Online Code Compiler',
      desc: 'Write, run, and debug code in our online editor.',
      icon: Code2,
      image: compilerIcon,
      route: '/compiler',
    },
    {
      title: 'Mock Assessments',
      desc: 'Take timed tests to prepare for real interviews.',
      icon: TimerReset,
      image: mockAssessmentIcon,
      route: '/interview-prep',
    },
    {
      title: 'Fun Quizzes',
      desc: 'Test your knowledge with interactive quizzes.',
      icon: HelpCircle,
      image: quizIcon,
      route: '/practice-sheets',
    },
  ]

  const challenges = [
    {
      title: 'Learning Path',
      tag: 'Guided roadmap',
      info: 'Follow a structured progression from fundamentals to advanced coding topics.',
      image: learningPathIcon,
      route: '/learning-paths',
      sideText: 'Master the Fundamentals',
    },
    {
      title: 'Practice Sheets',
      tag: 'Topic-wise drills',
      info: 'Build speed and accuracy with curated problem sets across key concepts.',
      image: practiceSheetIcon,
      route: '/practice-sheets',
      sideText: 'Sharpen Your Skills',
    },
    {
      title: 'Interview Prep',
      tag: 'Company-style prep',
      info: 'Practice interview-focused questions and get ready for real hiring rounds.',
      image: interviewPrepIcon,
      route: '/interview-prep',
      sideText: 'Land Your Dream Job',
    },
  ]

  // Career Track Card component with scroll animation
  const CareerTrackCard = ({ challenge, index }) => {
    const ref = useIntersectionObserver({
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    });

    return (
      <Link
        ref={ref}
        to={challenge.route}
        className={`career-track-row ${index % 2 === 0 ? 'left-image' : 'right-image'} scroll-animate-card`}
        style={{ '--stagger-delay': `${index * 0.15}s` }}
      >
        <div className="track-image-side">
          <img src={challenge.image} alt={challenge.title} className="track-image" />
        </div>
        <div className="track-content-side">
          <h3>{challenge.title}</h3>
          <p className="track-tag">{challenge.tag}</p>
          <p className="track-info">{challenge.info}</p>
          <span className="track-cta">Explore Now → </span>
        </div>
      </Link>
    );
  };

  return (
    <main className="landing-page">
      <section className="hero-section" style={{ backgroundImage: `url(${heroImg})` }}>
        <LandingNavbar />
        <div className="hero-copy">
          <h1 className="hero-typing" aria-label={heroHeadline}>
            <span className="hero-typing-reserve" aria-hidden="true">{heroHeadline}</span>
            <span className="hero-typing-live-wrap" aria-hidden="true">
              <span className="hero-typing-live">{typedHeadline}</span>
              <span className={`hero-typing-cursor ${isTypingDone ? 'is-idle' : ''}`}>|</span>
            </span>
          </h1>
          <p className="subtitle">Practice, Compete, and Succeed.</p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={onStartPracticing}>
              Start Practicing
            </button>
            <Link to="/login" className="btn btn-secondary">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      <section className="feature-grid" aria-label="Main platform features">
        {featureCards.map((item) => {
          const Icon = item.icon
          return (
            <Link to={item.route} className="feature-card" key={item.title}>
              <div className="feature-head">
                <span className="feature-art-wrap" aria-hidden="true">
                  <img src={item.image} alt="" className="feature-art" />
                  <span className="feature-icon">
                    <Icon size={13} />
                  </span>
                </span>
                <h3>{item.title}</h3>
              </div>
              <p>{item.desc}</p>
            </Link>
          )
        })}
      </section>

      <section className="challenge-section">
        <div className="section-head">
          <h2>
            <Sparkles size={20} aria-hidden="true" />
            Career Tracks
          </h2>
        </div>
        <div className="challenge-tracks-container">
          {challenges.map((challenge, index) => (
            <CareerTrackCard
              key={challenge.title}
              challenge={challenge}
              index={index}
            />
          ))}
        </div>
      </section>

      <section className="dual-cta">
        <article className="cta-card">
          <div>
            <h3>Take Mock Assessments</h3>
            <p>Simulate interview scenarios with timed coding tests.</p>
            <Link to="/login" className="btn cta-warm">
              Start Assessment
            </Link>
          </div>
          <img src={mockAssessmentIcon} alt="Mock assessment illustration" className="cta-art" />
        </article>

        <article className="cta-card">
          <div>
            <h3>Interactive Quizzes</h3>
            <p>Boost your knowledge with fun, tech quizzes.</p>
            <Link to="/login" className="btn btn-primary">
              Take a Quiz
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <img src={quizIcon} alt="Interactive quiz illustration" className="cta-art" />
        </article>
      </section>

      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand-block">
            <div className="footer-brand">
              <img src={homeLogo} alt="Nev Koder logo" className="footer-logo" />
            </div>
            <p>
              Build consistency with coding practice, smart assessments, and interview-ready quizzes.
            </p>
            <div className="footer-social" aria-label="Social links">
              <a href="#" aria-label="GitHub">
                <Github size={16} aria-hidden="true" />
              </a>
              <a href="#" aria-label="LinkedIn">
                <Linkedin size={16} aria-hidden="true" />
              </a>
              <a href="#" aria-label="Mail">
                <Mail size={16} aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="footer-links">
            <h4>Platform</h4>
            <a href="#">Practice Problems</a>
            <a href="#">Assessments</a>
            <a href="#">Quizzes</a>
            <a href="#">Leaderboard</a>
          </div>

          <div className="footer-links">
            <h4>Company</h4>
            <a href="#">About Us</a>
            <a href="#">Careers</a>
            <a href="#">Blog</a>
            <a href="#">Contact</a>
          </div>

          <div className="footer-contact">
            <h4>Get In Touch</h4>
            <p>
              <MapPin size={15} aria-hidden="true" />
              Bengaluru, India
            </p>
            <p>
              <Phone size={15} aria-hidden="true" />
              +91 98765 43210
            </p>
            <p>
              <Mail size={15} aria-hidden="true" />
              hello@nevkoder.com
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Nev Koder. All rights reserved.</p>
          <div>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Cookies</a>
          </div>
        </div>
      </footer>
    </main>
  )
}

export default HomePage
