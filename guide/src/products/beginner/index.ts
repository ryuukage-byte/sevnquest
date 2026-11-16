import type { Lesson } from '../../engine/lessonSchema';
import type { Product } from '../types';
import { config } from './config';

const modules = import.meta.glob('./lessons/*.json', { eager: true, import: 'default' }) as Record<string, Lesson>;
const lessons = Object.values(modules).sort((a, b) => a.id.localeCompare(b.id));

export const product: Product = { config, lessons };
