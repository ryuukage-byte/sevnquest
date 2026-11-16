// Produk aktif dipilih saat build lewat VITE_PRODUCT (alias `@product` di vite.config.ts), sehingga
// bundle sebuah sub-situs hanya berisi materi produknya sendiri.
import { product } from '@product/index';
import type { Lesson } from '../engine/lessonSchema';

export const { config: PRODUCT, lessons: LESSONS } = product;
export const getLesson = (id: string): Lesson | undefined => LESSONS.find(l => l.id === id);
