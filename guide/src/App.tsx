import { useEffect, useState } from 'react';
import { BookOpen, CalendarDays, Compass, Map as MapIcon, UserRound } from 'lucide-react';
import Home from './pages/Home';
import Discover from './pages/Discover';
import Learn from './pages/Learn';
import Planner from './pages/Planner';
import Journey from './pages/Journey';
import Account from './pages/Account';


function useRoute(): [string, (to: string) => void] {
  const get = () => window.location.hash.replace(/^#/, '') || '/';
  const [route, setRoute] = useState(get);
  useEffect(() => {
    const on = () => { setRoute(get()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [route, (to: string) => { window.location.hash = to; }];
}

const NAV = [
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/learn', label: 'Learn', icon: BookOpen },
  { to: '/planner', label: 'Planner', icon: CalendarDays },
  { to: '/journey', label: 'My Journey', icon: MapIcon },
];

export default function App() {
  const [route, go] = useRoute();
  const [path, query = ''] = route.split('?');
  const parts = path.split('/').filter(Boolean);
  const section = parts[0] ?? '';

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/">SEVNQUEST <span>GUIDE</span></a>
        <nav className="nav" aria-label="Navigasi utama">
          {NAV.map(n => (
            <a key={n.to} href={`#${n.to}`} className={section === n.to.slice(1) ? 'active' : ''}>
              <n.icon size={16} aria-hidden /> <span>{n.label}</span>
            </a>
          ))}
        </nav>
        <a className="login" href="#/account"><UserRound size={16} aria-hidden /> Login</a>
      </header>
      <main>
        {section === '' && <Home go={go} />}
        {section === 'discover' && <Discover go={go} />}
        {section === 'learn' && <Learn lessonId={parts[1]} go={go} />}
        {section === 'planner' && <Planner query={query} />}
        {section === 'journey' && <Journey go={go} />}
        {section === 'account' && <Account />}
      </main>
      <footer className="footer">SevnQuest Guide: Learn with understanding. Practice with purpose.</footer>
    </div>
  );
}
