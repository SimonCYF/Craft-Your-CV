import { HAS_METRIC, PAST, STRONG_VERBS } from './lexicon';

/* Helps turn a weak bullet into a strong one. It never invents facts: unknowns stay as [placeholders]. */

const LEAD = /^(?:i\s+)?(?:was\s+|were\s+)?(?:responsible for|in charge of|tasked with|duties (?:included|include)[:\s]*|helped(?: to)?|help(?: to)?|assisted(?: with| in)?|worked on|worked with|involved in|participated in)\s+(.+)$/i;

const IRREGULAR_BASE: Record<string, string> = { lead: 'led', build: 'built', run: 'ran', write: 'wrote', win: 'won', sell: 'sold', teach: 'taught', oversee: 'oversaw', grow: 'grew', make: 'made', hold: 'held', give: 'gave', bring: 'brought', set: 'set', drive: 'drove', take: 'took', keep: 'kept', find: 'found' };

/** True when the word looks like a present-tense verb ("Manage", "Manages", "Lead"), not past ("Managed"). */
export function isPresentVerb(word: string): boolean {
  const w = word.toLowerCase();
  if (w.length < 3 || STRONG_VERBS.has(w) || Object.values(IRREGULAR_BASE).includes(w)) return false;
  if (IRREGULAR_BASE[w]) return true;
  const bases = [w, w.endsWith('es') ? w.slice(0, -2) : '', w.endsWith('s') ? w.slice(0, -1) : '', w.endsWith('ies') ? w.slice(0, -3) + 'y' : ''].filter(Boolean);
  return bases.some((b) => IRREGULAR_BASE[b] || STRONG_VERBS.has(b + 'd') || STRONG_VERBS.has(b + 'ed') || STRONG_VERBS.has(b.replace(/y$/, 'ied')) || STRONG_VERBS.has(b + b.slice(-1) + 'ed'));
}

export function suggestRewrite(bullet: string): string | undefined {
  const m = bullet.trim().replace(/[.;]+$/, '').match(LEAD);
  const hasNumber = HAS_METRIC.test(bullet);
  const tail = hasNumber ? '' : ', resulting in [number or %: how much, how many, how fast?]';
  if (!m) return hasNumber ? undefined : `${bullet.trim().replace(/[.;]+$/, '')}${tail}`;
  const rest = m[1].trim();
  const [first, ...others] = rest.split(/\s+/);
  const past = PAST[first.toLowerCase()];
  if (past) return `${past} ${others.join(' ')}${tail}`;
  const verb = /^(?:helped|help|assisted|assist)/i.test(bullet.trim().replace(/^i\s+/i, '')) ? 'Supported' : '[Strong verb: led / built / improved]';
  return `${verb} ${rest}${tail}`;
}

/** Alternatives to verbs people overuse. */
export const SYNONYMS: Record<string, string[]> = {
  managed: ['led', 'directed', 'oversaw', 'coordinated'], developed: ['built', 'engineered', 'designed', 'created'], worked: ['collaborated', 'partnered', 'delivered'],
  responsible: ['owned', 'led', 'ran'], handled: ['resolved', 'processed', 'administered'], assisted: ['supported', 'enabled', 'contributed to'],
  helped: ['enabled', 'supported', 'guided'], created: ['designed', 'launched', 'established'], improved: ['optimised', 'strengthened', 'upgraded'],
  led: ['directed', 'spearheaded', 'headed'], implemented: ['deployed', 'rolled out', 'introduced'], maintained: ['sustained', 'monitored', 'upgraded'],
  supported: ['enabled', 'backed', 'served'], coordinated: ['organised', 'orchestrated', 'aligned'], prepared: ['drafted', 'compiled', 'produced'],
  ensured: ['verified', 'safeguarded', 'upheld'], conducted: ['ran', 'carried out', 'facilitated'], provided: ['delivered', 'supplied', 'offered'],
};
