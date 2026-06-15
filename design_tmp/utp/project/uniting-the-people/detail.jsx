/* Issue detail view for Uniting the People */
const { useMemo: useMemoD } = React;

function VotePanel({ issue, vote, onVote, signedIn, onSignIn }) {
  const opts = [
    { k: 'for', cls: 'for-opt', label: 'For', pct: issue.for, ico: 'up' },
    { k: 'against', cls: 'against-opt', label: 'Against', pct: issue.against, ico: 'down' },
    { k: 'unsure', cls: 'unsure-opt', label: 'Unsure', pct: issue.unsure, ico: 'question' },
  ];
  return (
    <div className="panel panel-pad votecard">
      <h3 className="panel-title">Cast your voice</h3>
      <p className="panel-sub">Non-binding shadow vote · one voice per verified account</p>
      <div className="vopts">
        {opts.map(o => (
          <button key={o.k} className={'vopt ' + o.cls + (vote === o.k ? ' sel' : '')}
            onClick={() => signedIn ? onVote(issue.id, o.k) : onSignIn()}>
            <i className="fillbar" style={{ width: o.pct + '%' }} />
            <span className="vleft"><span className="vico"><Icon name={o.ico} size={16} stroke={2.4} /></span>{o.label}</span>
            <span className="vpct">{o.pct}%</span>
          </button>
        ))}
      </div>
      {vote
        ? <div className="voted-note"><Icon name="check" size={15} stroke={2.4} /> Your voice is counted as <b>{vote}</b> · change anytime</div>
        : signedIn
          ? <p className="signin-note">Select an option above to add your voice.</p>
          : <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 14 }} onClick={onSignIn}>Sign in with email to vote</button>}
      {!signedIn && <p className="signin-note"><Icon name="shield" size={13} stroke={1.9} /> No wallet, no crypto — email or OAuth only</p>}
    </div>
  );
}

function AiDebate({ issue }) {
  return (
    <div className="panel panel-pad">
      <div className="digest-head">
        <span className="digest-badge"><Icon name="spark" size={16} stroke={1.8} /></span>
        <div>
          <h3 className="panel-title">AI Citizen Digest</h3>
          <p className="panel-sub">Neutral, citation-grounded — generated, then human-reviewed</p>
        </div>
      </div>

      <div className="digest-tldr">
        <span className="tldr-tag">TL;DR</span>
        <span dangerouslySetInnerHTML={{ __html: issue.tldr }} />
      </div>

      <div className="debate-cols">
        <div className="debate-col for">
          <h4><Icon name="up" size={15} stroke={2.4} /> Arguments For</h4>
          {issue.argsFor.map((a, i) => (
            <div className="arg" key={i}>
              <span className="marker">{i + 1}</span>
              <span>{a.t}<a className="cite" title={'Source: ' + a.cite}><Icon name="external" size={11} stroke={2} />{a.cite}</a></span>
            </div>
          ))}
        </div>
        <div className="debate-col against">
          <h4><Icon name="down" size={15} stroke={2.4} /> Arguments Against</h4>
          {issue.argsAgainst.map((a, i) => (
            <div className="arg" key={i}>
              <span className="marker">{i + 1}</span>
              <span>{a.t}<a className="cite" title={'Source: ' + a.cite}><Icon name="external" size={11} stroke={2} />{a.cite}</a></span>
            </div>
          ))}
        </div>
      </div>

      <div className="digest-foot">
        <span className="conf-pill">
          <Icon name="shield" size={14} stroke={1.9} /> Grounding confidence
          <span className="conf-track"><i style={{ width: Math.round(issue.confidence * 100) + '%' }} /></span>
          <span className="mono">{Math.round(issue.confidence * 100)}%</span>
        </span>
        <span className="digest-note">Every claim links to a registered source.</span>
      </div>
    </div>
  );
}

function SourcesWidget({ issue }) {
  return (
    <div className="widget">
      <h4 className="widget-title"><Icon name="shield" size={13} stroke={2} /> Source Registry</h4>
      {issue.sources.map((s, i) => (
        <div className="source" key={i}>
          <span className="favd"><Icon name={s.ico} size={17} stroke={1.8} /></span>
          <span className="sbody">
            <div className="sname">{s.name}</div>
            <div className="smeta">{s.meta}</div>
          </span>
          <span className="health" title={s.health}><span className="hdot" style={{ background: s.health === 'Healthy' ? 'var(--for)' : 'var(--accent)' }} />{s.health}</span>
        </div>
      ))}
    </div>
  );
}

function RelatedWidget({ issues, onOpen }) {
  return (
    <div className="widget">
      <h4 className="widget-title"><Icon name="layers" size={13} stroke={2} /> Related issues</h4>
      <div className="related">
        {issues.map(r => (
          <div className="rel" key={r.id} onClick={() => onOpen(r.id)}>
            <span className="rel-thumb"><Flag cc={r.cc} size={20} /></span>
            <span className="rq">{r.question}</span>
            <span className="rpct">{r.for}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityWidget({ issue }) {
  const acts = useMemoD(() => window.makeActivity(issue), [issue.id]);
  const ico = { for: 'up', against: 'down', unsure: 'question' };
  return (
    <div className="widget">
      <h4 className="widget-title"><span className="live-dot" /> Live activity</h4>
      {acts.map((a, i) => (
        <div className="act" key={i}>
          <span className={'adot a-' + a.v}><Icon name={ico[a.v]} size={13} stroke={2.4} /></span>
          <span><b>{a.name}</b> {a.verb}</span>
          <span className="atime">{a.time}</span>
        </div>
      ))}
    </div>
  );
}

function DetailView({ issue, votes, onVote, signedIn, onSignIn, onOpen, onBack, showChart }) {
  const sm = window.scaleMeta(issue.scale);
  const vote = votes[issue.id];
  const related = useMemoD(
    () => window.ISSUES.filter(i => i.id !== issue.id && (i.category === issue.category || i.scale === issue.scale)).slice(0, 4),
    [issue.id]
  );
  const delta = issue.deltaWeek;

  return (
    <div className="detail">
      {/* hero banner with photo */}
      <div className="dhero">
        <Media id={issue.img} cat={issue.category} ratio="auto">
          <div className="dhero-inner">
            <a className="backlink" onClick={onBack}><Icon name="arrowLeft" size={16} stroke={2} /> All issues</a>
            <div className="dhero-chips">
              <span className="mchip solid"><Icon name={sm.ico} size={13} stroke={2} />{sm.label}</span>
              <span className="mchip solid"><Icon name={issue.category} size={13} stroke={2} />{issue.category}</span>
              <span className="mchip solid"><Flag cc={issue.cc} size={15} />{issue.region}</span>
              {issue.scope && <span className="mchip solid"><Icon name="doc" size={13} stroke={2} />{issue.scope}</span>}
              <span className="mchip live"><span className="live-dot" />Live</span>
            </div>
            <h1 className="dtitle">{issue.question}</h1>
            {issue.billNo && <div className="dbill mono">{issue.billNo}</div>}
          </div>
        </Media>
      </div>

      <div className="dmeta">
        <div className="m"><span className="k">Voices</span><span className="v">{window.fmt(issue.voices)}</span></div>
        <div className="m"><span className="k">Lean For</span><span className="v" style={{ color: 'var(--for)' }}>{issue.for}%</span></div>
        <div className="m"><span className="k">7-day shift</span><span className={'v ' + (delta >= 0 ? 'trend-up' : 'trend-down')}><Icon name={delta >= 0 ? 'up' : 'down'} size={14} stroke={2.4} />{Math.abs(delta)} pts</span></div>
        <div className="m"><span className="k">Status</span><span className="v vstatus">{issue.deadline}</span></div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          {showChart && (
            <div className="panel panel-pad">
              <div className="senthead">
                <span className="num">{issue.for}<span className="num-sym">%</span></span>
                <span className="cap">
                  <b>lean toward For</b>
                  <span className={delta >= 0 ? 'trend-up' : 'trend-down'}><Icon name={delta >= 0 ? 'trending' : 'down'} size={14} stroke={2.2} /> {Math.abs(delta)} pts this week</span>
                </span>
              </div>
              <TrendChart data={issue.history} />
              <div className="chart-legend">
                <span className="lg"><span className="sw" style={{ background: 'var(--for)' }} /> Share voting For over time</span>
                <span className="lg" style={{ marginLeft: 'auto' }}><Icon name="clock" size={13} stroke={1.9} /> Updated continuously</span>
              </div>
            </div>
          )}

          <div className="panel panel-pad" style={{ marginTop: 20 }}>
            <h3 className="panel-title">Where people stand</h3>
            <p className="panel-sub">{window.fmt(issue.voices)} verified voices so far</p>
            <SentimentBar issue={issue} />
          </div>

          <div style={{ marginTop: 20 }}><AiDebate issue={issue} /></div>
        </div>

        <aside className="detail-side">
          <VotePanel issue={issue} vote={vote} onVote={onVote} signedIn={signedIn} onSignIn={onSignIn} />
          <SourcesWidget issue={issue} />
          <ActivityWidget issue={issue} />
          <RelatedWidget issues={related} onOpen={onOpen} />
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { DetailView });
