import { TryOutData } from '../../types/content';
import n1_001 from './n1_001.json';
import n2_001 from './n2_001.json';
import n2_002 from './n2_002.json';
import n2_003 from './n2_003.json';
import n3_001 from './n3_001.json';
import n3_002 from './n3_002.json';
import n4_001 from './n4_001.json';
import n4_002 from './n4_002.json';
import n5_001 from './n5_001.json';
import jft_001 from './jft_001.json';
import { OFFICIAL_TRYOUTS } from './official';


export interface TryOutMeta {
  id: string;
  level: 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | 'JFT';
  title: string;
  code: string; // '001', '002', etc. (future packages continue: 003, 004, ...)
  totalQuestions: number;
  data: TryOutData;
}

export const ALL_TRYOUTS: TryOutMeta[] = [
  {
    id: 'n5_001',
    level: 'N5',
    title: 'Simulasi N5 — Paket 001',
    code: '001',
    totalQuestions: n5_001.sections.mojiGoi.questions.length + n5_001.sections.bunpouDokkai.questions.length,
    data: n5_001 as unknown as TryOutData
  },
  {
    id: 'n4_001',
    level: 'N4',
    title: 'Simulasi N4 — Paket 001',
    code: '001',
    totalQuestions: n4_001.sections.mojiGoi.questions.length + n4_001.sections.bunpouDokkai.questions.length,
    data: n4_001 as unknown as TryOutData
  },
  {
    id: 'n4_002',
    level: 'N4',
    title: 'Simulasi N4 — Paket 002',
    code: '002',
    totalQuestions: n4_002.sections.mojiGoi.questions.length + n4_002.sections.bunpouDokkai.questions.length,
    data: n4_002 as unknown as TryOutData
  },
  {
    id: 'n3_001',
    level: 'N3',
    title: 'Simulasi N3 — Paket 001',
    code: '001',
    totalQuestions: n3_001.sections.mojiGoi.questions.length + n3_001.sections.bunpouDokkai.questions.length,
    data: n3_001 as unknown as TryOutData
  },
  {
    id: 'n3_002',
    level: 'N3',
    title: 'Simulasi N3 — Paket 002',
    code: '002',
    totalQuestions: n3_002.sections.mojiGoi.questions.length + n3_002.sections.bunpouDokkai.questions.length,
    data: n3_002 as unknown as TryOutData
  },
  {
    id: 'n2_001',
    level: 'N2',
    title: 'Simulasi N2 — Paket 001',
    code: '001',
    totalQuestions: n2_001.sections.mojiGoi.questions.length + n2_001.sections.bunpouDokkai.questions.length,
    data: n2_001 as unknown as TryOutData
  },
  {
    id: 'n2_002',
    level: 'N2',
    title: 'Simulasi N2 — Paket 002',
    code: '002',
    totalQuestions: n2_002.sections.mojiGoi.questions.length + n2_002.sections.bunpouDokkai.questions.length,
    data: n2_002 as unknown as TryOutData
  },
  {
    id: 'n2_003',
    level: 'N2',
    title: 'Simulasi N2 — Paket 003',
    code: '003',
    totalQuestions: n2_003.sections.mojiGoi.questions.length + n2_003.sections.bunpouDokkai.questions.length,
    data: n2_003 as unknown as TryOutData
  },
  {
    id: 'n1_001',
    level: 'N1',
    title: 'Simulasi N1 — Paket 001',
    code: '001',
    totalQuestions: n1_001.sections.mojiGoi.questions.length + n1_001.sections.bunpouDokkai.questions.length,
    data: n1_001 as unknown as TryOutData
  },
  {
    id: 'jft_001',
    level: 'JFT',
    title: 'Simulasi JFT-Basic — Paket 001',
    code: '001',
    totalQuestions: jft_001.sections.mojiGoi.questions.length + jft_001.sections.bunpouDokkai.questions.length + jft_001.sections.choukai.questions.length,
    data: jft_001 as unknown as TryOutData
  },
  ...OFFICIAL_TRYOUTS
];


export const DEFAULT_TRYOUT = (ALL_TRYOUTS.find(t => t.id === 'n3_002') || ALL_TRYOUTS[0]).data;

