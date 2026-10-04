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
    const description = 'JUDGE SHARED SYNTHETIC LAB · Private data stays on the company-controlled host. One editing session at a time (three-minute lease). Six shared AI compositions / twelve saves maximum; the original cumulative allowance also applies. Administrator settings are read-only here. This demo depends on the host being online.';
    const boundaries = document.createElement('details'), summary = document.createElement('summary'), limits = document.createElement('p');
    summary.textContent = 'Demo boundaries and shared allowance'; limits.textContent = description; boundaries.append(summary, limits);
    const onboarding = document.createElement('ol'); onboarding.setAttribute('aria-label', 'Three steps to explore ProofGate');
    for (const instruction of ['Inspect the retained AI method and the actual public inputs sent to the models.', 'Change a synthetic private quote, choose Apply private records, then Rebind locally.', 'Compare the new brief and provider-attempt difference. Try external export refusal, then save internally and inspect exact read-back.']) {
      const step = document.createElement('li'); step.textContent = instruction; onboarding.append(step);
    }
    document.querySelector('.connection').after(banner, onboarding, boundaries);
    for (const node of [document.querySelector('label[for="token"]'),get('token'),get('connect'),get('token-note')]) node.hidden = true;
    get('connection-status').textContent = 'Connecting to the public judge demo…';
    get('controls-open').textContent = 'Inspect accepted controls';
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
