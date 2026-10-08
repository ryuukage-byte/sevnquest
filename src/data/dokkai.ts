import { DokkaiItem } from '../types/content';
import dokkaiData from './db/dokkai.json';

const db: Record<string, DokkaiItem> = { ...(dokkaiData as Record<string, DokkaiItem>) };

// Ensure dokkai_001 exists for N5 Training Ground and other stages
const firstEntry = Object.values(db)[0];
if (firstEntry && !db['dokkai_001']) {
  db['dokkai_001'] = {
    ...firstEntry,
    id: 'dokkai_001',
    title: 'Dokkai Permulaan: Wacana & Percakapan Dasar (N5)',
    category: 'Wacana Singkat',
    vocabularyList: firstEntry.vocabularyList || []
  };
}

export const DOKKAI_DATABASE: Record<string, DokkaiItem> = db;
