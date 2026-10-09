import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { GrammarFusionModal } from '../src/components/dungeon/fusion/GrammarFusionModal';
createRoot(document.getElementById('r')!).render(<GrammarFusionModal onClose={()=>{document.title='closed'}} soundEnabled={false} />);
