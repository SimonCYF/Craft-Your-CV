import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ClipboardPaste, Copy, Download, FileUp, FolderOpen, Info, PencilLine, RotateCcw, TriangleAlert, X } from 'lucide-react';
import type { Resume, StoredResume } from '@/model/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { LanguageSelect, useT, type Translate } from '@/i18n';
import { loadResumeFile, loadResumeText, UnreadableError, type Loaded } from '@/review/extract';
import { scoreResume } from '@/review/score';
import { matchJob } from '@/review/jobmatch';
import { proofread } from '@/review/proofread';
import { generateCoverLetter } from '@/review/coverLetter';
import { slug } from '@/lib/files';
import { PROOF_CATEGORIES, type CategoryScore, type Issue, type MatchReport, type Severity } from '@/review/types';

interface Props {
  list: StoredResume[];
  initialId: string | null;
  onBack: () => void;
  onCreate: (resume: Resume, name: string, open?: boolean) => string;
}

type Source = 'saved' | 'upload' | 'paste';
type Tab = 'score' | 'match' | 'proof' | 'letter';

const bandClass = (n: number) => (n >= 80 ? 'bg-ink text-paper' : n >= 60 ? 'bg-accent text-ink' : 'bg-paper text-ink border-ink');
const SEVERITY: Record<Severity, { label: string; cls: string }> = {
  error: { label: 'Fix now', cls: 'bg-ink text-paper' },
  warn: { label: 'Should fix', cls: 'bg-accent text-ink' },
  tip: { label: 'Tip', cls: 'bg-tint text-ink border border-rule' },
};

export default function Review({ list, initialId, onBack, onCreate }: Props) {
  const t = useT();
  const say = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<Source>(initialId || list.length ? 'saved' : 'upload');
  const [savedId, setSavedId] = useState<string>(initialId && list.some((r) => r.id === initialId) ? initialId : (list[0]?.id ?? ''));
  const [file, setFile] = useState<{ name: string; loaded: Loaded } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pasted, setPasted] = useState('');
  const [ad, setAd] = useState('');
  const [tab, setTab] = useState<Tab>('score');
  const [company, setCompany] = useState<string | null>(null);   // null = use the name found in the advert
  const [manager, setManager] = useState('');
  const [edited, setEdited] = useState<string | null>(null);      // the person's own edits to the letter

  const deferredPaste = useDeferredValue(pasted);
  const deferredAd = useDeferredValue(ad);

  const subject = useMemo<{ resume: Resume; name: string; from: Source; how: 'exact' | 'parsed' } | null>(() => {
    if (source === 'saved') { const r = list.find((x) => x.id === savedId); return r ? { resume: r.resume, name: r.name, from: 'saved', how: 'exact' } : null; }
    if (source === 'upload') return file ? { resume: file.loaded.resume, name: file.name, from: 'upload', how: file.loaded.how } : null;
    return deferredPaste.trim().length > 40 ? { resume: loadResumeText(deferredPaste).resume, name: '', from: 'paste', how: 'parsed' } : null;
  }, [source, list, savedId, file, deferredPaste]);

  const match = useMemo(() => (subject ? matchJob(subject.resume, deferredAd) : null), [subject, deferredAd]);
  const score = useMemo(() => (subject ? scoreResume(subject.resume, match ?? undefined) : null), [subject, match]);
  const issues = useMemo(() => (subject ? proofread(subject.resume) : []), [subject]);
  const letter = useMemo(() => (subject ? generateCoverLetter(subject.resume, deferredAd, match, { company: company ?? undefined, manager }) : null), [subject, deferredAd, match, company, manager]);

  async function pick(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    try {
      setFile({ name: f.name.replace(/\.[a-z0-9]+$/i, ''), loaded: await loadResumeFile(f) });
    } catch (err) {
      const why = err instanceof UnreadableError ? err.message : '';
      say(t(why === 'scanned' ? 'This PDF has no selectable text (it looks like a scan). Export a text PDF, or paste the text instead.' : why === 'empty' ? 'That file has almost no text in it. Try another file or paste the text.' : 'The file could not be opened. Try a PDF, Word (.docx), HTML or text file.'));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  const counts = { error: issues.filter((i) => i.severity === 'error').length, warn: issues.filter((i) => i.severity === 'warn').length, tip: issues.filter((i) => i.severity === 'tip').length };

  return (
    <div className="min-h-screen bg-tint">
      <header className="on-ink flex flex-wrap items-center gap-3 bg-ink px-3 py-2 text-paper sm:px-5">
        <Button variant="ghost" size="sm" className="text-paper hover:bg-ink-hover" onClick={onBack}><ArrowLeft />{t('My resumes')}</Button>
        <h1 className="flex-1 text-lg font-extrabold"><span className="text-accent">CV</span> {t('Resume review')}</h1>
        <LanguageSelect className="min-h-9 rounded-sm border border-ink-hover bg-ink-hover px-2 text-sm font-semibold text-paper" />
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <aside className="grid content-start gap-5">
          <section className="rounded-sm border-2 border-ink bg-paper p-4" aria-labelledby="src-h">
            <h2 id="src-h" className="text-xl font-extrabold">{t('1. Your resume')}</h2>
            <div role="tablist" aria-label={t('Where is your resume?')} className="mt-3 grid grid-cols-3 gap-1">
              {([['saved', FolderOpen, 'Saved'], ['upload', FileUp, 'Upload'], ['paste', ClipboardPaste, 'Paste']] as const).map(([id, Icon, name]) => (
                <button key={id} role="tab" aria-selected={source === id} onClick={() => setSource(id)}
                  className={cn('flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-sm border-2 text-sm font-bold [&_svg]:size-4', source === id ? 'border-ink bg-ink text-paper' : 'border-rule bg-paper hover:border-ink')}>
                  <Icon />{t(name)}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {source === 'saved' && (list.length ? (
                <>
                  <label htmlFor="saved-pick" className="text-sm font-bold">{t('Choose one of your resumes')}</label>
                  <select id="saved-pick" value={savedId} onChange={(e) => setSavedId(e.target.value)} className="mt-1 min-h-11 w-full rounded-sm border-2 border-ink bg-paper px-2 font-semibold">
                    {list.map((r) => <option key={r.id} value={r.id}>{r.name || t('Untitled resume')}</option>)}
                  </select>
                </>
              ) : <p className="text-[15px] text-muted">{t('You have no saved resumes yet. Upload or paste one instead.')}</p>)}

              {source === 'upload' && (
                <>
                  <Button variant="primary" className="w-full" disabled={busy} onClick={() => fileInput.current?.click()}><FileUp />{busy ? t('Reading…') : file ? t('Choose another file') : t('Upload your resume')}</Button>
                  <input ref={fileInput} type="file" accept=".pdf,.docx,.html,.htm,.json,.txt,.md,text/plain,application/pdf" className="sr-only" aria-label={t('Upload a resume file')} onChange={(e) => pick(e.target.files?.[0])} />
                  <p className="mt-2 text-sm text-muted">{file ? t('Loaded: {name}', { name: file.name }) : t('PDF, Word (.docx), HTML, text, or a file downloaded from this site.')}</p>
                </>
              )}

              {source === 'paste' && (
                <>
                  <label htmlFor="paste-box" className="text-sm font-bold">{t('Paste your resume text')}</label>
                  <textarea id="paste-box" value={pasted} onChange={(e) => setPasted(e.target.value)} rows={10} placeholder={t('Name, contact details, then sections such as Experience, Education, Skills…')}
                    className="mt-1 w-full rounded-sm border-2 border-ink bg-paper p-2 text-[15px]" />
                </>
              )}
            </div>
            <p className="mt-3 flex gap-2 text-sm text-muted"><Info className="mt-0.5 size-4 shrink-0" />{t('Everything is checked inside your browser. Nothing is uploaded.')}</p>
          </section>

          <section className="rounded-sm border-2 border-ink bg-paper p-4" aria-labelledby="ad-h">
            <h2 id="ad-h" className="text-xl font-extrabold">{t('2. Job advert (optional)')}</h2>
            <label htmlFor="ad-box" className="mt-1 block text-[15px] text-muted">{t('Paste the whole advert to see how well your resume fits it.')}</label>
            <textarea id="ad-box" value={ad} onChange={(e) => setAd(e.target.value)} rows={9} placeholder={t('Job title, requirements, responsibilities…')} className="mt-2 w-full rounded-sm border-2 border-ink bg-paper p-2 text-[15px]" />
            {ad && <Button size="sm" variant="ghost" className="mt-1" onClick={() => setAd('')}><X />{t('Clear')}</Button>}
          </section>
        </aside>

        <main>
          {!subject || !score ? (
            <div className="rounded-sm border-2 border-dashed border-ink bg-paper p-8">
              <h2 className="text-2xl font-extrabold">{t('Get a professional assessment')}</h2>
              <p className="mt-2 max-w-[58ch] text-muted">{t('Choose, upload or paste a resume on the left. You get a score for each part, the exact reasons it is weak, how to fix it, a comparison with any job advert, and a full proofread.')}</p>
            </div>
          ) : (
            <>
              <div role="tablist" aria-label={t('Review results')} className="flex flex-wrap gap-2">
                {([['score', 'Score', null], ['match', 'Job match', match ? `${match.percent}%` : null], ['proof', 'Proofread', issues.length ? String(issues.length) : '✓'], ['letter', 'Cover letter', null]] as const).map(([id, name, badge]) => (
                  <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                    className={cn('min-h-11 rounded-sm border-2 px-4 font-bold', tab === id ? 'border-ink bg-ink text-paper' : 'border-ink bg-paper hover:bg-tint')}>
                    {t(name)}{badge && <span className={cn('ml-2 rounded-sm px-1.5 text-sm', tab === id ? 'bg-accent text-ink' : 'bg-ink text-paper')}>{badge}</span>}
                  </button>
                ))}
              </div>

              {subject.how === 'parsed' && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-sm border-2 border-ink bg-sand p-3 text-[15px]">
                  <p className="min-w-60 flex-1">{t('This resume was read from plain text, so a few details may have landed in the wrong place. Open it in the editor to check it and fix the issues below.')}</p>
                  <Button size="sm" variant="primary" onClick={() => { onCreate(subject.resume, subject.name || subject.resume.profile.fullName || t('Imported resume'), true); say(t('Added to “My resumes”.')); }}><PencilLine />{t('Open in editor')}</Button>
                </div>
              )}

              <div className="mt-5" role="tabpanel">
                {tab === 'score' && <ScoreTab t={t} overall={score.overall} categories={score.categories} hasAd={!!match} />}
                {tab === 'match' && <MatchTab t={t} match={match} hasAd={ad.trim().length > 0} />}
                {tab === 'proof' && <ProofTab t={t} issues={issues} counts={counts} />}
                {tab === 'letter' && letter && (
                  <LetterTab t={t} letter={letter} hasAd={ad.trim().length > 0} company={company ?? letter.company} onCompany={setCompany} manager={manager} onManager={setManager}
                    text={edited ?? letter.text} edited={edited !== null} onEdit={setEdited} fileName={slug(subject.resume.profile.fullName || 'cover') + '-cover-letter.txt'} say={say} />
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ── Score ── */

function ScoreTab({ t, overall, categories, hasAd }: { t: Translate; overall: number; categories: CategoryScore[]; hasAd: boolean }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-5 rounded-sm border-2 border-ink bg-paper p-5">
        <p className={cn('grid size-24 shrink-0 place-items-center rounded-sm border-2 border-ink text-4xl font-extrabold', bandClass(overall))}>{overall}</p>
        <div className="min-w-56 flex-1">
          <h2 className="text-2xl font-extrabold">{t('Overall score')}: {overall}/100</h2>
          <p className="mt-1 text-muted">{overall >= 80 ? t('Strong. A few polish items remain.') : overall >= 60 ? t('Decent, but clear gaps will cost you interviews.') : overall >= 40 ? t('Weak. Work through the fixes below, starting with the lowest scores.') : t('This resume needs a rewrite before you apply.')}</p>
          {!hasAd && <p className="mt-1 text-sm text-muted">{t('Add a job advert to include skills relevance for a specific role.')}</p>}
        </div>
      </div>
      {categories.map((c) => (
        <article key={c.id} className="rounded-sm border-2 border-ink bg-paper p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-extrabold">{t(c.label)}</h3>
            <p className={cn('rounded-sm border-2 border-ink px-2 text-lg font-extrabold', bandClass(c.score))}>{c.score}/100</p>
          </div>
          <div className="mt-2 h-2.5 rounded-sm bg-rule" role="img" aria-label={`${c.score} / 100`}><div className="h-full rounded-sm bg-ink" style={{ width: `${c.score}%` }} /></div>
          <p className="mt-2 font-semibold">{t(c.verdict)}</p>

          <h4 className="mt-4 text-sm font-extrabold uppercase tracking-wide text-muted">{t('Why this score')}</h4>
          <ul className="mt-1 grid gap-1.5">
            {c.findings.map((f, i) => (
              <li key={i} className="flex gap-2 text-[15px]">
                {f.ok ? <Check className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-label={t('Good')} /> : <X className="mt-0.5 size-4 shrink-0 text-red-700" aria-label={t('Problem')} />}
                <span>{t(f.text)}</span>
              </li>
            ))}
          </ul>

          {c.examples.length > 0 && (
            <>
              <h4 className="mt-4 text-sm font-extrabold uppercase tracking-wide text-muted">{t('From your resume')}</h4>
              <ul className="mt-1 grid gap-3">
                {c.examples.map((e, i) => (
                  <li key={i} className="border-l-4 border-accent pl-3 text-[15px]">
                    <p className="italic">“{e.quote}”</p>
                    <p className="text-sm text-muted">{e.where}</p>
                    {e.rewrite && <p className="mt-1"><span className="font-bold">{t('Try')}:</span> {e.rewrite}</p>}
                  </li>
                ))}
              </ul>
            </>
          )}

          {c.fixes.length > 0 && (
            <>
              <h4 className="mt-4 text-sm font-extrabold uppercase tracking-wide text-muted">{t('How to improve it')}</h4>
              <ol className="mt-1 grid list-decimal gap-1.5 pl-5 text-[15px]">{c.fixes.map((x, i) => <li key={i}>{t(x)}</li>)}</ol>
            </>
          )}
        </article>
      ))}
    </div>
  );
}

/* ── Job match ── */

const Chip = ({ children, strong }: { children: React.ReactNode; strong?: boolean }) => (
  <li className={cn('rounded-sm border px-2 py-0.5 text-[15px] font-semibold', strong ? 'border-ink bg-accent' : 'border-rule bg-tint')}>{children}</li>
);

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border-2 border-ink bg-paper p-5">
      <h3 className="text-xl font-extrabold">{title}</h3>
      {hint && <p className="mt-1 text-[15px] text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function MatchTab({ t, match, hasAd }: { t: Translate; match: MatchReport | null; hasAd: boolean }) {
  if (!match) {
    return (
      <div className="rounded-sm border-2 border-dashed border-ink bg-paper p-8">
        <h2 className="text-2xl font-extrabold">{t('Compare with a job advert')}</h2>
        <p className="mt-2 max-w-[58ch] text-muted">{hasAd ? t('That advert is too short to analyse. Paste the full text.') : t('Paste a job advert in box 2 and this page will show the skills and keywords you are missing, the experience to highlight, qualifications you have but did not mention, and gaps for the role.')}</p>
      </div>
    );
  }
  const none = <p className="text-[15px] text-muted">{t('Nothing to report here.')}</p>;
  return (
    <div className="grid gap-4">
      <div className="rounded-sm border-2 border-ink bg-paper p-5">
        <div className="flex flex-wrap items-center gap-5">
          <p className={cn('grid size-24 shrink-0 place-items-center rounded-sm border-2 border-ink text-3xl font-extrabold', bandClass(match.percent))}>{match.percent}%</p>
          <div className="min-w-56 flex-1">
            <h2 className="text-2xl font-extrabold">{match.title ? t('Match for “{title}”', { title: match.title }) : t('Match with this job')}</h2>
            <p className="mt-1 text-muted">{t('{a}% of the required skills and keywords are on your resume. {n} terms already match.', { a: match.requiredPercent, n: match.matched.length })}</p>
          </div>
        </div>
        {match.matched.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-[15px] font-bold">{t('Already matching')} ({match.matched.length})</summary>
            <ul className="mt-2 flex flex-wrap gap-2">{match.matched.map((m) => <Chip key={m.term}>{m.term}</Chip>)}</ul>
          </details>
        )}
      </div>

      <Block title={`${t('Missing technical skills')} (${match.missingTechnical.length})`} hint={t('Highlighted ones are listed as required. Add only what you genuinely have.')}>
        {match.missingTechnical.length ? <ul className="flex flex-wrap gap-2">{match.missingTechnical.map((m) => <Chip key={m.term} strong={m.required}>{m.term}{m.required ? ` · ${t('required')}` : ''}</Chip>)}</ul> : none}
      </Block>

      <Block title={`${t('Missing industry keywords')} (${match.missingKeywords.length})`} hint={t('Words the advert repeats. ATS software and recruiters scan for them.')}>
        {match.missingKeywords.length ? <ul className="flex flex-wrap gap-2">{match.missingKeywords.map((m) => <Chip key={m.term} strong={m.required}>{m.term}</Chip>)}</ul> : none}
      </Block>

      <Block title={t('Relevant experience to highlight')} hint={t('Move these to the top of their role and make them more specific.')}>
        {match.highlight.length ? (
          <ul className="grid gap-3">
            {match.highlight.map((h, i) => (
              <li key={i} className="border-l-4 border-accent pl-3 text-[15px]">
                <p>“{h.text}”</p>
                <p className="text-sm text-muted">{h.where}</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">{h.terms.map((x) => <Chip key={x}>{x}</Chip>)}</ul>
              </li>
            ))}
          </ul>
        ) : <p className="text-[15px] text-muted">{t('No bullet uses the advert’s language yet. Rewrite your strongest bullets with these terms where true.')}</p>}
      </Block>

      <Block title={t('You have this, but did not say so')} hint={t('Qualifications and skills the resume implies without naming them.')}>
        {match.unmentioned.length ? (
          <ul className="grid gap-3">
            {match.unmentioned.map((u) => (
              <li key={u.term} className="text-[15px]"><p className="font-bold">{u.term}</p><p>{u.why}</p><p className="text-muted"><span className="font-bold">{t('Fix')}:</span> {u.fix}</p></li>
            ))}
          </ul>
        ) : none}
      </Block>

      <Block title={`${t('Potential gaps')} (${match.gaps.length})`} hint={t('Where a recruiter may see a mismatch with the role.')}>
        {match.gaps.length ? (
          <ul className="grid gap-3">
            {match.gaps.map((g, i) => (
              <li key={i} className="flex gap-2 text-[15px]">
                <TriangleAlert className={cn('mt-0.5 size-4 shrink-0', g.severity === 'warn' ? 'text-red-700' : 'text-muted')} aria-hidden />
                <div><p className="font-bold">{g.title}</p><p>{g.detail}</p></div>
              </li>
            ))}
          </ul>
        ) : none}
      </Block>
    </div>
  );
}

/* ── Proofread ── */

function ProofTab({ t, issues, counts }: { t: Translate; issues: Issue[]; counts: Record<Severity, number> }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-sm border-2 border-ink bg-paper p-5">
        <h2 className="text-2xl font-extrabold">{issues.length ? t('{n} things to look at', { n: issues.length }) : t('No problems found')}</h2>
        <p className="mt-1 text-muted">{t('{a} to fix now · {b} should be fixed · {c} tips', { a: counts.error, b: counts.warn, c: counts.tip })}</p>
        <p className="mt-2 text-sm text-muted">{t('This is a rule-based check, not a full dictionary. Your browser’s spell-check will still catch other typos.')}</p>
      </div>
      {PROOF_CATEGORIES.map((cat) => {
        const items = issues.filter((i) => i.category === cat);
        return (
          <section key={cat} className="rounded-sm border-2 border-ink bg-paper p-5">
            <h3 className="flex items-center gap-2 text-xl font-extrabold">
              {items.length ? <span className="rounded-sm bg-ink px-2 text-base text-paper">{items.length}</span> : <Check className="size-5 text-emerald-700" aria-label={t('Clear')} />}
              {t(cat)}
            </h3>
            {items.length ? (
              <ul className="mt-3 grid gap-4">
                {items.map((i, k) => (
                  <li key={k} className="text-[15px]">
                    <p><span className={cn('mr-2 rounded-sm px-1.5 py-0.5 text-xs font-extrabold uppercase', SEVERITY[i.severity].cls)}>{t(SEVERITY[i.severity].label)}</span><span className="font-bold">{i.message}</span></p>
                    {(i.where || i.quote) && <p className="mt-1 border-l-4 border-rule pl-2 text-muted">{i.where && <span className="font-semibold">{i.where}</span>}{i.where && i.quote ? ': ' : ''}{i.quote && <em>“{i.quote}”</em>}</p>}
                    {i.fix && <p className="mt-1"><span className="font-bold">{t('Fix')}:</span> {i.fix}</p>}
                  </li>
                ))}
              </ul>
            ) : <p className="mt-1 text-[15px] text-muted">{t('Nothing found.')}</p>}
          </section>
        );
      })}
    </div>
  );
}

/* ── Cover letter ── */

function LetterTab({ t, letter, hasAd, company, onCompany, manager, onManager, text, edited, onEdit, fileName, say }: {
  t: Translate; letter: ReturnType<typeof generateCoverLetter>; hasAd: boolean; company: string; onCompany: (v: string) => void; manager: string; onManager: (v: string) => void;
  text: string; edited: boolean; onEdit: (v: string | null) => void; fileName: string; say: (m: string) => void;
}) {
  const copy = async () => { try { await navigator.clipboard.writeText(text); say(t('Copied. Paste it into your email or application.')); } catch { say(t('Could not copy. Select the text and copy it by hand.')); } };
  const save = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const field = 'mt-1 min-h-11 w-full rounded-sm border-2 border-ink bg-paper px-2';
  return (
    <div className="grid gap-4">
      <div className="rounded-sm border-2 border-ink bg-paper p-5">
        <h2 className="text-2xl font-extrabold">{t('Cover letter')}</h2>
        <p className="mt-1 text-muted">{hasAd ? t('A first draft built from your resume and the advert. It only claims what your resume shows. Edit it freely.') : t('Paste a job advert in box 2 to tailor the letter. Until then this is a general draft.')}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><label htmlFor="cl-company" className="text-sm font-bold">{t('Company')}</label><input id="cl-company" className={field} value={company} onChange={(e) => onCompany(e.target.value)} placeholder={t('Company name')} /></div>
          <div><label htmlFor="cl-manager" className="text-sm font-bold">{t('Hiring manager (optional)')}</label><input id="cl-manager" className={field} value={manager} onChange={(e) => onManager(e.target.value)} placeholder={t('For example: Ms Lim')} /></div>
        </div>
      </div>
      <div className="rounded-sm border-2 border-ink bg-paper p-5">
        <label htmlFor="cl-text" className="sr-only">{t('Cover letter text')}</label>
        <textarea id="cl-text" value={text} onChange={(e) => onEdit(e.target.value)} rows={18} className="w-full rounded-sm border-2 border-rule bg-paper p-3 text-[15px] leading-relaxed focus:border-ink" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" onClick={copy}><Copy />{t('Copy')}</Button>
          <Button size="sm" onClick={save}><Download />{t('Download .txt')}</Button>
          {edited && <Button size="sm" variant="ghost" onClick={() => onEdit(null)}><RotateCcw />{t('Rewrite from my resume')}</Button>}
          <span className="ml-auto text-sm text-muted">{t('{n} words', { n: text.split(/\s+/).filter(Boolean).length })}</span>
        </div>
        {edited && <p className="mt-2 text-sm text-muted">{t('Your edits are kept. Changing the company or advert will not overwrite them until you press “Rewrite from my resume”.')}</p>}
      </div>
      <div className="rounded-sm border-2 border-ink bg-paper p-5">
        <h3 className="text-xl font-extrabold">{t('Check before you send')}</h3>
        <ul className="mt-2 grid list-disc gap-1.5 pl-5 text-[15px]">{letter.notes.map((n, i) => <li key={i}>{t(n)}</li>)}</ul>
      </div>
    </div>
  );
}
