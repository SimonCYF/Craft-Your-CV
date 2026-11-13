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
  id: 'ats' | 'impact' | 'content' | 'experience' | 'skills' | 'readability' | 'completeness';
  label: string;
  weight: number;            // share of the overall score, in percent
  score: number;             // 0-100
  verdict: string;           // one line
  findings: Finding[];       // why the score is what it is
  fixes: string[];           // what to do about it
  fixItems: { text: string; gain: number }[]; // the same fixes, with the overall points each could win back
  examples: Example[];       // the person's own weak lines, with a rewrite prompt
}
export interface Priority { text: string; category: string; gain: number }
export interface ScoreReport { overall: number; categories: CategoryScore[]; priorities: Priority[] }

/** One stop of the recruiter's eye during a quick scan. */
export interface ScanStop { order: number; seconds: number; area: string; saw: string; note: string; level: 'strong' | 'ok' | 'weak' | 'missed' }
export interface ScanReport {
  totalSeconds: number;
  seenPercent: number;       // share of the resume's words a recruiter would actually take in
  verdict: string;
  stops: ScanStop[];
  strengths: string[];
  weaknesses: string[];
  overlooked: { text: string; why: string }[];
  tips: string[];
}

/** A line the reviewer would change, with what is wrong and a proposed rewrite. */
export interface Suggestion {
  id: string;
  original: string;
  where: string;
  marks: { start: number; end: number; label: string }[];
  issues: string[];
  rewrite: string;           // rule-based proposal; may hold [placeholders] to fill in
}

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
