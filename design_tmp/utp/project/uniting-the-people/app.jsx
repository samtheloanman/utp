/* Main app — Uniting the People civic polling */
const { useState: useStateA, useMemo: useMemoA, useEffect: useEffectA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "civic",
  "density": "comfortable",
  "display": "grotesk",
  "showChart": true,
  "showPhotos": true
}/*EDITMODE-END*/;

function FeedView({ scale, setScale, cat, setCat, query, votes, onVote, onOpen, counts, totalVoices }) {
  const showHero = scale === 'all' && cat === 'All' && !query;
  return (
    <React.Fragment>
      <div className="scalebar">
        <div className="scalebar-inner">
          {window.SCALES.map(s => (
            <button key={s.key} className={'scaletab' + (scale === s.key ? ' active' : '')} onClick={() => setScale(s.key)}>
              <span className="ico"><Icon name={s.ico} size={17} stroke={1.9} /></span>{s.label}
              <span className="cnt">{counts[s.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="catrow">
        <span className="catrow-lead"><Icon name="filter" size={14} stroke={1.9} /></span>
        {window.CATEGORIES.map(c => (
          <button key={c} className={'catchip' + (cat === c ? ' active' : '')} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      <div className="wrap">
        {showHero && (
          <div className="hero">
            <div className="hero-photo" />
            <div className="hero-veil" />
            <div className="hero-content">
              <span className="hero-eyebrow"><span className="live-dot" /> {window.fmt(totalVoices)} voices · {window.ISSUES.length} live issues</span>
              <h1>Vote on what shapes your world</h1>
              <p>From your city council to the United Nations, weigh in on the decisions that matter — every claim backed by neutral, citation-grounded evidence.</p>
              <div className="hstats">
                <span className="hstat"><b>{window.fmt(totalVoices)}</b><span><Icon name="users" size={13} stroke={1.9} /> Voices cast</span></span>
                <span className="hstat"><b>{window.ISSUES.length}</b><span><Icon name="layers" size={13} stroke={1.9} /> Open issues</span></span>
                <span className="hstat"><b>4</b><span><Icon name="global" size={13} stroke={1.9} /> Local → global</span></span>
                <span className="hstat"><b className="accent-num">100%</b><span><Icon name="shield" size={13} stroke={1.9} /> Sources cited</span></span>
              </div>
            </div>
          </div>
        )}

        <div className="section-head">
          <h2>{scale === 'all' ? 'Trending now' : window.scaleMeta(scale).label + ' issues'}</h2>
          <span className="sub">{counts[scale]} {counts[scale] === 1 ? 'issue' : 'issues'}{cat !== 'All' ? ' · ' + cat : ''}{query ? ' · “' + query + '”' : ''}</span>
        </div>

        {counts._filtered.length === 0
          ? <div className="empty"><Icon name="search" size={28} stroke={1.6} /><p>No issues match. Try a different scale or category.</p></div>
          : <div className="feed-grid">
              {counts._filtered.map(issue => (
                <IssueCard key={issue.id} issue={issue} vote={votes[issue.id]} onVote={onVote} onOpen={onOpen} />
              ))}
            </div>}
      </div>
    </React.Fragment>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [scale, setScale] = useStateA('all');
  const [cat, setCat] = useStateA('All');
  const [query, setQuery] = useStateA('');
  const [openId, setOpenId] = useStateA(null);
  const [signedIn, setSignedIn] = useStateA(false);
  const [votes, setVotes] = useStateA(() => {
    try { return JSON.parse(localStorage.getItem('utp_votes') || '{}'); } catch { return {}; }
  });

  useEffectA(() => {
    const r = document.documentElement;
    r.setAttribute('data-palette', t.palette);
    r.setAttribute('data-density', t.density);
    r.setAttribute('data-display', t.display);
    r.setAttribute('data-photos', t.showPhotos ? 'on' : 'off');
  }, [t.palette, t.density, t.display, t.showPhotos]);

  const onVote = (id, v) => {
    if (!signedIn) setSignedIn(true);
    setVotes(prev => {
      const next = { ...prev, [id]: prev[id] === v ? undefined : v };
      if (next[id] === undefined) delete next[id];
      try { localStorage.setItem('utp_votes', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const counts = useMemoA(() => {
    const byScale = { all: window.ISSUES.length };
    window.SCALES.forEach(s => { if (s.key !== 'all') byScale[s.key] = window.ISSUES.filter(i => i.scale === s.key).length; });
    const q = query.trim().toLowerCase();
    const filtered = window.ISSUES.filter(i =>
      (scale === 'all' || i.scale === scale) &&
      (cat === 'All' || i.category === cat) &&
      (!q || (i.question + ' ' + i.region + ' ' + i.category).toLowerCase().includes(q))
    );
    return { ...byScale, _filtered: filtered };
  }, [scale, cat, query]);

  const totalVoices = useMemoA(() => window.ISSUES.reduce((s, i) => s + i.voices, 0), []);
  const openIssue = openId ? window.ISSUES.find(i => i.id === openId) : null;

  const goOpen = (id) => { setOpenId(id); window.scrollTo({ top: 0 }); };
  const goHome = () => { setOpenId(null); setScale('all'); setCat('All'); setQuery(''); };

  const palToHex = { civic: '#17A6C8', btc: '#F7931A', forest: '#0E7C5A' };
  const hexToPal = { '#17A6C8': 'civic', '#F7931A': 'btc', '#0E7C5A': 'forest' };

  return (
    <div className="app">
      <TopBar query={query} onQuery={(v) => { setQuery(v); if (openId) setOpenId(null); }}
        signedIn={signedIn} onSignIn={() => setSignedIn(true)} onHome={goHome} />

      {openIssue
        ? <DetailView issue={openIssue} votes={votes} onVote={onVote} signedIn={signedIn}
            onSignIn={() => setSignedIn(true)} onOpen={goOpen} onBack={() => setOpenId(null)} showChart={t.showChart} />
        : <FeedView scale={scale} setScale={setScale} cat={cat} setCat={setCat} query={query}
            votes={votes} onVote={onVote} onOpen={goOpen} counts={counts} totalVoices={totalVoices} />}

      <TweaksPanel>
        <TweakSection label="Look & feel" />
        <TweakColor label="Palette" value={palToHex[t.palette]} options={['#17A6C8', '#F7931A', '#0E7C5A']}
          onChange={(v) => setTweak('palette', hexToPal[v] || 'civic')} />
        <TweakRadio label="Headings" value={t.display} options={['grotesk', 'bebas']}
          onChange={(v) => setTweak('display', v)} />
        <TweakRadio label="Density" value={t.density} options={['comfortable', 'compact']}
          onChange={(v) => setTweak('density', v)} />
        <TweakSection label="Content" />
        <TweakToggle label="Photography" value={t.showPhotos} onChange={(v) => setTweak('showPhotos', v)} />
        <TweakToggle label="Trend chart on detail" value={t.showChart} onChange={(v) => setTweak('showChart', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
