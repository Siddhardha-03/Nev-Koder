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
import { Link } from 'react-router-dom'
import LandingNavbar from '../components/LandingNavbar'
import compilerIcon from '../assets/compiler_icon.png'
import heroImg from '../assets/hero.png'
import mockAssessmentIcon from '../assets/mock_assesment_icon.png'
import quizIcon from '../assets/quiz_icon.png'
import solveChallengesIcon from '../assets/solve_challenges.png'
import '../App.css'

function HomePage() {
  const featureCards = [
    {
      title: 'Solve Coding Challenges',
      desc: 'Sharpen your skills with a wide range of coding problems.',
      icon: Braces,
      image: solveChallengesIcon,
    },
    {
      title: 'Online Code Compiler',
      desc: 'Write, run, and debug code in our online editor.',
      icon: Code2,
      image: compilerIcon,
    },
    {
      title: 'Mock Assessments',
      desc: 'Take timed tests to prepare for real interviews.',
      icon: TimerReset,
      image: mockAssessmentIcon,
    },
    {
      title: 'Fun Quizzes',
      desc: 'Test your knowledge with interactive quizzes.',
      icon: HelpCircle,
      image: quizIcon,
    },
  ]

  const challenges = [
    {
      title: 'Binary Search',
      tag: 'Algorithms',
      difficulty: 'Medium',
      info: 'Write, run, and debug search logic efficiently.',
    },
    {
      title: 'Tree Traversal',
      tag: 'Data Structures',
      difficulty: 'Easy',
      info: 'Practice traversing binary trees with confidence.',
    },
    {
      title: 'String Anagrams',
      tag: 'Strings',
      difficulty: 'Hard',
      info: 'Find all anagram pairs in a string with optimized logic.',
    },
  ]

  return (
    <main className="landing-page">
      <LandingNavbar />

      <section className="hero-section" style={{ backgroundImage: `url(${heroImg})` }}>
        <div className="hero-copy">
          <h1>Level Up Your Coding Skills</h1>
          <p className="subtitle">Practice, Compete, and Succeed.</p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary">
              Start Practicing
            </Link>
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
            <article className="feature-card" key={item.title}>
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
            </article>
          )
        })}
      </section>

      <section className="challenge-section">
        <div className="section-head">
          <h2>
            <Sparkles size={20} aria-hidden="true" />
            Featured Challenges
          </h2>
        </div>
        <div className="challenge-grid">
          {challenges.map((challenge) => (
            <article className="challenge-card" key={challenge.title}>
              <h3>{challenge.title}</h3>
              <p className="challenge-tag">{challenge.tag}</p>
              <p className={`difficulty difficulty-${challenge.difficulty.toLowerCase()}`}>
                Difficulty: <span>{challenge.difficulty}</span>
              </p>
              <p className="challenge-info">{challenge.info}</p>
              <Link to="/login" className="btn btn-primary small">
                Solve Now
              </Link>
            </article>
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
              <img src="/Logo_nev.svg" alt="Nev Koder logo" className="footer-logo" />
              <span className="footer-brand-name">Koder</span>
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
