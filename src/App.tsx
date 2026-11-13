import { useCallback, useEffect, useRef, useState } from 'react';
import type { Resume, StoredResume } from '@/model/types';
import { loadAll, saveAll } from '@/model/store';
import { newId } from '@/model/normalize';
import { ToastProvider, useToast } from '@/lib/toast';
import { COPY } from '@/copy';
import { useT } from '@/i18n';
import Home from '@/pages/Home';
import Editor from '@/pages/Editor';
import Review from '@/pages/Review';

export type SaveState = 'saved' | 'saving' | 'failed';

const routeId = () => (location.hash.startsWith('#/edit/') ? location.hash.slice(7) : null);
/** null when not on the review page; otherwise the resume to review ('' for none picked) */
const reviewRoute = () => (/^#\/review(\/|$)/.test(location.hash) ? location.hash.slice(9) : null);
//locatcontiion
function Shell() {
  const say = useToast();
  const t = useT();
  const [list, setList] = useState<StoredResume[] | null>(null); // null while loading
  const [openId, setOpenId] = useState<string | null>(routeId());
  const [reviewId, setReviewId] = useState<string | null>(reviewRoute());
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const loaded = useRef(false);
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    loadAll().then((l) => {
      setList(l);
    });
  }, []);
  useEffect(() => {
    const onHash = () => {
      setOpenId(routeId());
      setReviewId(reviewRoute());
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  /* Autosave shortly after every change */
  useEffect(() => {
    if (list === null) return;
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    setSaveState('saving');
    const timer = window.setTimeout(async () => {
      const ok = await saveAll(list);
      setSaveState(ok ? 'saved' : 'failed');
      if (!ok) say(tRef.current(COPY.storageFailed));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [list, say]);

  const go = (id: string | null) => {
    location.hash = id ? '#/edit/' + id : '#/';
    window.scrollTo(0, 0);
  };
  const goReview = (id?: string) => {
    location.hash = id ? '#/review/' + id : '#/review';
    window.scrollTo(0, 0);
  };

  const create = useCallback((resume: Resume, name: string, open = true, extra?: Pick<StoredResume, 'masterId' | 'target'>) => {
    const item: StoredResume = { id: newId(), name, updatedAt: Date.now(), resume, ...extra };
    setList((l) => [item, ...(l ?? [])]);
    if (open) go(item.id);
    return item.id;
  }, []);
  const update = useCallback(
    (id: string, patch: Partial<Pick<StoredResume, 'name' | 'resume'>>) => {
      setList((l) =>
        (l ?? []).map((r) => (r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r)),
      );
    },
    [],
  );
  const remove = useCallback(
    (id: string) => setList((l) => (l ?? []).filter((r) => r.id !== id)),
    [],
  );

  if (list === null) return <p className="p-8 text-muted">{t('Loading your resumes…')}</p>;

  if (reviewId !== null) {
    return <Review list={list} initialId={reviewId || null} onBack={() => go(null)} onCreate={create} onUpdate={update} />;
  }

  const current = openId ? list.find((r) => r.id === openId) : undefined;
  if (openId && !current) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {t('This resume is not on this device')}
        </h1>
        <p className="mt-3 text-muted">
          {t(
            'It may have been deleted, or made in another browser. Resumes are kept in the browser they were made in.',
          )}
        </p>
        <button
          className="mt-6 min-h-11 rounded-sm border-2 border-ink bg-ink px-4 font-bold text-paper"
          onClick={() => go(null)}
        >
          {t('Back to My resumes')}
        </button>
      </div>
    );
  }
  return current ? (
    <Editor
      key={current.id}
      item={current}
      saveState={saveState}
      onChange={(patch) => update(current.id, patch)}
      onBack={() => go(null)}
      onReview={() => goReview(current.id)}
    />
  ) : (
    <Home list={list} onCreate={create} onOpen={go} onRemove={remove} onReview={goReview} />
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}
