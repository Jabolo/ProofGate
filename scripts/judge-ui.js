(() => {
  const fragment = new URLSearchParams(location.hash.slice(1));
  if (fragment.has('judge')) {
    history.replaceState(history.state, '', location.pathname + location.search);
  }
  const session = crypto.randomUUID();
  const originalFetch = window.fetch.bind(window);
  let retainedRun = null;
  window.fetch = (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.origin === location.origin && url.pathname.startsWith('/api/')) {
      const headers = new Headers(options.headers ?? (typeof input !== 'string' ? input.headers : undefined));
      headers.set('X-Proofgate-Session', session);
      options = {...options, headers};
    }
    return originalFetch(input, options);
  };
  window.addEventListener('DOMContentLoaded', () => {
    const get = id => document.getElementById(id);
    const banner = document.createElement('p'); banner.className = 'panel-intro'; banner.setAttribute('role','note');
    banner.textContent = 'Judge demo · Synthetic company data · Start with the retained AI method; edit a quote and rebind.';
    const description = 'JUDGE SHARED SYNTHETIC LAB · Private data stays on the company-controlled host. One editing session at a time (30-second lease). Six shared AI compositions / twelve saves maximum; the original cumulative allowance also applies. Administrator settings are read-only here. This demo runs on the team’s dedicated GCP host; no laptop setup is required.';
    const boundaries = document.createElement('details'), summary = document.createElement('summary'), limits = document.createElement('p');
    summary.textContent = 'Demo boundaries and shared allowance'; limits.textContent = description; boundaries.append(summary, limits);
    const onboarding = document.createElement('ol'); onboarding.setAttribute('aria-label', 'Three steps to explore ProofGate');
    for (const instruction of ['Inspect the retained AI method and the actual public inputs sent to the models.', 'Click Try a private quote change (+$100) to apply the private change and rebind locally.', 'Compare the new brief and provider-attempt difference. Try external export refusal, then save internally and inspect exact read-back.']) {
      const step = document.createElement('li'); step.textContent = instruction; onboarding.append(step);
    }
    document.querySelector('.connection').after(banner, onboarding, boundaries);
    const quickQuote = document.createElement('button');
    quickQuote.id = 'judge-private-quote'; quickQuote.type = 'button'; quickQuote.className = 'primary';
    quickQuote.textContent = 'Try a private quote change (+$100)'; quickQuote.disabled = true;
    const quickFeedback = document.createElement('p'); quickFeedback.id = 'judge-quick-feedback';
    quickFeedback.className = 'panel-intro'; quickFeedback.setAttribute('role','status'); quickFeedback.setAttribute('aria-live','polite');
    quickFeedback.textContent = 'Controlled synthetic action: increase the middle supplier quote, apply privately, then rebind the retained AI method locally.';
    onboarding.after(quickQuote, quickFeedback);
    let changingQuote = false;
    const quoteAvailability = () => {
      quickQuote.disabled = changingQuote || get('blind-rebind').disabled || get('blind-apply-records').disabled;
    };
    const quoteObserver = new MutationObserver(quoteAvailability);
    for (const id of ['blind-rebind','blind-apply-records']) quoteObserver.observe(get(id), {attributes:true, attributeFilter:['disabled']});
    quickQuote.onclick = async () => {
      if (changingQuote || quickQuote.disabled || get('blind-rebind').disabled || get('blind-apply-records').disabled) return;
      const recordsInput = get('blind-records');
      let records;
      try {
        records = JSON.parse(recordsInput.value);
        const middle = Array.isArray(records) && records.find(record => record?.id === 'middle');
        if (!middle || !Number.isSafeInteger(middle.quoteCents) || middle.quoteCents < 0 || middle.quoteCents > 99990000) {
          quickFeedback.textContent = 'This quick action needs a valid middle supplier in the synthetic worksheet. Records were not changed; use the private editor instead.';
          return;
        }
        if (typeof recordsInput.oninput !== 'function' || typeof get('blind-apply-records').onclick !== 'function' || typeof get('blind-rebind').onclick !== 'function') {
          quickFeedback.textContent = 'The existing private worksheet controls are not ready yet. Records were not changed.';
          return;
        }
        changingQuote = true; quoteAvailability();
        middle.quoteCents += 10000;
        quickFeedback.textContent = 'Applying the synthetic private quote through the existing governed controls…';
        recordsInput.value = JSON.stringify(records, null, 2);
        recordsInput.oninput();
        await get('blind-apply-records').onclick();
        if (get('blind-rebind').disabled) {
          quickFeedback.textContent = 'Local rebind is unavailable. Check the worksheet status below; no new AI composition was requested.';
          return;
        }
        await get('blind-rebind').onclick();
        quickFeedback.textContent = get('blind-result').getAttribute('data-result-state') === 'current'
          ? 'Private quote increased by $100 and the retained method was recomputed locally. Inspect the actual brief and measured provider-attempt difference below.'
          : 'Local recomputation did not produce a current result. Check the worksheet status below.';
      } catch {
        quickFeedback.textContent = 'The quick action could not complete. Check the private worksheet and its status below.';
      } finally {changingQuote = false; quoteAvailability();}
    };
    quoteAvailability();
    for (const node of [document.querySelector('label[for="token"]'),get('token'),get('connect'),get('token-note')]) node.hidden = true;
    get('connection-status').textContent = 'Connecting to the public judge demo…';
    get('controls-open').textContent = 'Inspect accepted controls';
    const resources = document.createElement('nav'); resources.setAttribute('aria-label','Judge resources'); resources.className = 'panel-intro';
    for (const [label, url] of [
      ['Source & project description','https://github.com/Jabolo/ProofGate'],
      ['English slides · PDF','https://raw.githubusercontent.com/Jabolo/ProofGate/main/submission/presentation.pdf'],
      ['49-second backup · paced actual captures','https://raw.githubusercontent.com/Jabolo/ProofGate/main/submission/backup.mp4']
    ]) {const link = document.createElement('a'); link.textContent = label; link.href = url; link.target = '_blank'; link.rel = 'noopener'; resources.append(link, document.createTextNode(' · '));}
    boundaries.after(resources);
    get('release-support').hidden = true;
    const lock = () => {
      for (const id of ['policy-fields','save-feed','feed']) if (!get(id).disabled) get(id).disabled = true;
    };
    new MutationObserver(lock).observe(get('configuration'), {subtree:true, attributes:true, attributeFilter:['disabled']});
    get('policy-form').addEventListener('submit', event => {event.preventDefault(); event.stopImmediatePropagation();}, true);
    get('save-feed').addEventListener('click', event => {event.preventDefault(); event.stopImmediatePropagation();}, true);
    const prior = get('connect').onclick;
    get('connect').onclick = async (...args) => {
      const accessCode = get('token').value;
      await prior(...args); lock();
      if (!get('connection-status').textContent.startsWith('Connected')) return;
      try {
        const status = await originalFetch('/api/judge/status', {headers:{Authorization:'Bearer '+accessCode}, cache:'no-store'});
        if (!status.ok) return;
        const value = await status.json(); retainedRun = value.retainedRun;
        limits.textContent = description+' Remaining shared capacity: '+value.compositionsRemaining+' compositions / '+value.savesRemaining+' saves.';
        get('connection-status').textContent = 'Connected · public guest · bounded judge laboratory';
        if (retainedRun && !get('blind-inspect').disabled) { get('blind-inspect-id').value = retainedRun; get('blind-inspect').click(); }
      } catch { /* Existing connect status remains authoritative. */ }
    };
    lock();
    void (async () => {
      try {
        const response = await originalFetch('/api/judge/access', {cache:'no-store'});
        if (!response.ok) throw new Error('PUBLIC_DEMO_UNAVAILABLE');
        const access = await response.json();
        if (access.identity !== 'public_guest' || typeof access.judgeCode !== 'string') throw new Error('PUBLIC_DEMO_UNAVAILABLE');
        get('token').value = access.judgeCode;
        await get('connect').onclick();
      } catch {get('connection-status').textContent = 'Public judge demo unavailable. Ask the team at B25 to check the host.';}
    })();
  });
})();
