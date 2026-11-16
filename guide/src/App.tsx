import { useEffect, useState } from 'react';
import { CalendarDays, Compass, House, Map as MapIcon, Moon, Sun, UserRound } from 'lucide-react';
import Home from './pages/Home';
import Discover from './pages/Discover';
import Learn from './pages/Learn';
import Planner from './pages/Planner';
import Journey from './pages/Journey';
import Account from './pages/Account';
import { useTheme } from './lib/theme';
import { PRODUCT } from './products';

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
  { to: '/', label: 'Beranda', icon: House, show: true },
  { to: '/discover', label: 'Materi', icon: Compass, show: true },
  { to: '/planner', label: 'Rencana', icon: CalendarDays, show: PRODUCT.features.planner },
  { to: '/journey', label: 'Perjalananku', icon: MapIcon, show: PRODUCT.features.journey },
].filter(n => n.show);

export default function App() {
  const [route, go] = useRoute();
  const [theme, toggleTheme] = useTheme();
  const [path, query = ''] = route.split('?');
  const parts = path.split('/').filter(Boolean);
  const section = parts[0] ?? '';

  return (
    <div className="min-h-dvh flex flex-col bg-bg-page text-text-primary overflow-x-hidden">
      <div className="sticky top-0 z-20 px-3 pt-3 pb-2 pt-safe">
        <header className="skeuo-header max-w-4xl mx-auto !flex-wrap gap-2">
          <a href="#/" className="crumb font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-text-primary no-underline relative z-10">
            SevnQuest <span className="text-gold">Guide</span>
          </a>
          <nav aria-label="Navigasi utama" className="flex gap-1.5 relative z-10 flex-wrap">
            {NAV.map(n => (
              <a key={n.to} href={`#${n.to}`} className={`notebook-filter-tab !text-xs !py-2 !px-3 gap-1.5 no-underline ${section === n.to.slice(1) ? 'active' : ''}`}>
                <n.icon size={14} aria-hidden /> <span>{n.label}</span>
              </a>
            ))}
          </nav>
          <div className="flex gap-1.5 relative z-10">
            <button className="skeuo-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}>
              {theme === 'dark' ? <Sun size={14} aria-hidden /> : <Moon size={14} aria-hidden />}
            </button>
            {PRODUCT.features.account && <a href="#/account" className="skeuo-btn gap-1.5 no-underline"><UserRound size={14} aria-hidden /> MASUK</a>}
          </div>
        </header>
      </div>
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 pb-12">
        {section === '' && <Home go={go} />}
        {section === 'discover' && <Discover go={go} />}
        {section === 'learn' && <Learn lessonId={parts[1]} go={go} />}
        {section === 'planner' && PRODUCT.features.planner && <Planner query={query} />}
        {section === 'journey' && PRODUCT.features.journey && <Journey go={go} />}
        {section === 'account' && PRODUCT.features.account && <Account />}
      </main>
      <footer className="text-center text-text-muted text-xs font-mono py-6 pb-safe">
        Pahami logikanya. Latih dengan tujuan.
      </footer>
    </div>
  );
}
