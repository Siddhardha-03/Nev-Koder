import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar';
import { isAuthenticated } from '../services/authService';
import './InterviewPrepPage.css';

function InterviewPrepPage() {
  const navigate = useNavigate();
  const [interviews] = useState([
    {
      id: 1,
      company: 'Tech Giants',
      title: 'Google Interview Prep',
      description: 'Prepare for Google interviews with curated problems',
      difficulty: 'Hard',
      problems: 50,
      completed: 12,
      icon: '🔵',
      avgSalary: '150-200k'
    },
    {
      id: 2,
      company: 'Meta/Facebook',
      title: 'Meta Interview Prep',
      description: 'Master Meta interview patterns and questions',
      difficulty: 'Hard',
      problems: 45,
      completed: 8,
      icon: '👍',
      avgSalary: '140-190k'
    },
    {
      id: 3,
      company: 'Amazon',
      title: 'Amazon Interview Prep',
      description: 'Excel in Amazon coding and system design',
      difficulty: 'Hard',
      problems: 48,
      completed: 15,
      icon: '📦',
      avgSalary: '130-180k'
    },
    {
      id: 4,
      company: 'Microsoft',
      title: 'Microsoft Interview Prep',
      description: 'Ace your Microsoft technical interviews',
      difficulty: 'Hard',
      problems: 42,
      completed: 20,
      icon: '🪟',
      avgSalary: '135-185k'
    },
    {
      id: 5,
      company: 'Apple',
      title: 'Apple Interview Prep',
      description: 'Prepare for Apple-style technical challenges',
      difficulty: 'Hard',
      problems: 35,
      completed: 5,
      icon: '🍎',
      avgSalary: '145-195k'
    },
    {
      id: 6,
      company: 'Startup Track',
      title: 'Startup Interview Prep',
      description: 'Master skills for fast-growing startups',
      difficulty: 'Medium',
      problems: 30,
      completed: 18,
      icon: '🚀',
      avgSalary: '80-150k'
    },
    {
      id: 7,
      company: 'System Design',
      title: 'System Design Mastery',
      description: 'Learn to design scalable systems',
      difficulty: 'Hard',
      problems: 20,
      completed: 6,
      icon: '🏗️',
      avgSalary: '150-250k'
    },
    {
      id: 8,
      company: 'Behavioral',
      title: 'Behavioral Interview',
      description: 'Master the non-technical interview rounds',
      difficulty: 'Easy',
      problems: 15,
      completed: 14,
      icon: '💬',
      avgSalary: 'All levels'
    }
  ]);

  const handleStartPrep = (interviewId) => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    // Navigate to interview prep content
  };

  return (
    <section>
      <LandingNavbar />

      <main className="interview-shell">
        <header className="interview-header">
          <h1>Interview Preparation</h1>
          <p>Get hired at top tech companies with structured interview prep</p>
        </header>
      </main>
    </section>
  );
}

export default InterviewPrepPage;
