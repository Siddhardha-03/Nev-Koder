import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar';
import { isAuthenticated } from '../services/authService';
import './PracticeSheetsPage.css';

function PracticeSheetsPage() {
  const navigate = useNavigate();
  const [sheets] = useState([
    {
      id: 1,
      title: 'Array Manipulation',
      description: 'Master array operations and algorithms',
      difficulty: 'Easy',
      problems: 15,
      solved: 8,
      icon: '📊'
    },
    {
      id: 2,
      title: 'Linked Lists',
      description: 'Perfect your linked list implementation skills',
      difficulty: 'Medium',
      problems: 20,
      solved: 12,
      icon: '⛓️'
    },
    {
      id: 3,
      title: 'Dynamic Programming',
      description: 'Solve complex problems with memoization',
      difficulty: 'Hard',
      problems: 25,
      solved: 5,
      icon: '🎓'
    },
    {
      id: 4,
      title: 'Graph Theory',
      description: 'Master graph algorithms and traversals',
      difficulty: 'Hard',
      problems: 22,
      solved: 3,
      icon: '🔗'
    },
    {
      id: 5,
      title: 'String Manipulation',
      description: 'Advanced string processing techniques',
      difficulty: 'Easy',
      problems: 18,
      solved: 14,
      icon: '📝'
    },
    {
      id: 6,
      title: 'Recursion & Backtracking',
      description: 'Conquer recursive algorithms',
      difficulty: 'Medium',
      problems: 17,
      solved: 7,
      icon: '🔄'
    },
    {
      id: 7,
      title: 'Sorting & Searching',
      description: 'Master fundamental sorting algorithms',
      difficulty: 'Easy',
      problems: 12,
      solved: 12,
      icon: '🔍'
    },
    {
      id: 8,
      title: 'Binary Trees',
      description: 'Traverse and manipulate tree structures',
      difficulty: 'Medium',
      problems: 21,
      solved: 9,
      icon: '🌳'
    }
  ]);

  const handlePracticeBtnClick = (sheetId) => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    // Navigate to practice sheet
  };

  return (
    <section>
      <LandingNavbar />

      <main className="practice-shell">
        <header className="practice-header">
          <h1>Practice Sheets</h1>
          <p>Curated problem collections to strengthen your skills</p>
        </header>
      </main>
    </section>
  );
}

export default PracticeSheetsPage;
