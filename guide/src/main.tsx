import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './sevnquest.css';
import './guide.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
