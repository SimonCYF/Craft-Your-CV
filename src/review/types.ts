export type Severity = 'error' | 'warn' | 'tip';
export type ProofCategory =
  | 'Spelling and grammar' | 'Dates' | 'Employment gaps' | 'Repeated verbs' | 'Weak descriptions'
  | 'Length' | 'Personal information' | 'Contact details' | 'Formatting';

export const PROOF_CATEGORIES: ProofCategory[] = [
  'Spelling and grammar', 'Dates', 'Employment gaps', 'Repeated verbs', 'Weak descriptions', 'Length', 'Personal information', 'Contact details', 'Formatting',
];

export interface Issue {
  category: ProofCategory;
  severity: Severity;
  message: string;     // what is wrong
  where?: string;      // where it is (entry, field)
  quote?: string;      // the offending text
  fix?: string;        // how to fix it
}

export interface Finding { ok: boolean; text: string }
export interface Example { quote: string; where: string; rewrite?: string }
export interface CategoryScore {
  id: 'summary' | 'experience' | 'impact' | 'skills' | 'ats';
  label: string;
  score: number;             // 0-100
  verdict: string;           // one line
  findings: Finding[];       // why the score is what it is
  fixes: string[];           // what to do about it
  examples: Example[];       // the person's own weak lines, with a rewrite prompt
}
export interface ScoreReport { overall: number; categories: CategoryScore[] }

export interface MatchTerm { term: string; kind: 'technical' | 'tool' | 'keyword' | 'soft'; required: boolean; count: number }
export interface MatchReport {
  percent: number;
  requiredPercent: number;
  matched: MatchTerm[];
  missingTechnical: MatchTerm[];
  missingKeywords: MatchTerm[];
  highlight: { text: string; where: string; terms: string[] }[];
  unmentioned: { term: string; why: string; fix: string }[];
  gaps: { title: string; detail: string; severity: Severity }[];
  title: string;
}
