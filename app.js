const $ = id => document.getElementById(id);
const PRESETS = {
  email: {p: `[\\w.+-]+@[\\w-]+\\.[\\w.-]+`, f: 'g', t: 'Contact us at hello@example.com or support+help@sub.example.co.uk.\nNot an email: foo@bar'},
  url: {p: `https?://[^\\s]+`, f: 'g', t: 'Visit https://github.com/Sanjays2402 or http://localhost:3000/path?q=1#frag.'},
  ipv4: {p: `\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b`, f: 'g', t: 'Server IPs: 192.168.1.1, 10.0.0.42 and 255.255.255.255'},
  phone: {p: `\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}`, f: 'g', t: 'Call (425) 881-6325 or 555-123-4567 or 800.555.0100'},
  date: {p: `\\d{4}-\\d{2}-\\d{2}`, f: 'g', t: 'Today is 2026-04-16. Next release: 2026-05-01.'},
  hex: {p: `#(?:[A-Fa-f0-9]{3}){1,2}\\b`, f: 'g', t: 'Brand colors: #7c3aed, #a855f7, #f4f4f5 and shorthand #fff.'},
  uuid: {p: `[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}`, f: 'gi', t: 'id=550e8400-e29b-41d4-a716-446655440000\nid=7c9e6679-7425-40de-944b-e07fc1f90ae7'},
  word: {p: `\\b\\w+\\b`, f: 'g', t: 'Count the words in this sentence — punctuation gets stripped.'},
};

// Load from URL
const params = new URLSearchParams(location.hash.slice(1));
if(params.has('p')) $('pattern').value = params.get('p');
if(params.has('f')) $('flags').value = params.get('f');
if(params.has('t')) $('input').value = params.get('t');

function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function run(){
  const pattern = $('pattern').value;
  const flags = $('flags').value;
  const text = $('input').value;
  const errEl = $('error');
  const input = $('regex-input') || document.querySelector('.regex-input');
  input.classList.remove('error');
  errEl.textContent = '';

  if(!pattern){
    $('highlight').innerHTML = esc(text).replace(/\n/g,'<br>');
    $('matches').innerHTML = '<div class="match-empty">Enter a pattern above.</div>';
    $('match-count').textContent = '0 matches';
    $('replace-output').textContent = text;
    return;
  }

  let re;
  try{ re = new RegExp(pattern, flags); }
  catch(e){
    input.classList.add('error');
    errEl.textContent = e.message;
    $('match-count').textContent = '—';
    return;
  }

  // Matches
  const matches = [];
  let m, rx = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
  while((m = rx.exec(text)) !== null){
    matches.push({match: m[0], index: m.index, groups: m.slice(1)});
    if(m[0] === '') rx.lastIndex++;
    if(matches.length > 5000) break;
  }

  $('match-count').textContent = matches.length + ' match' + (matches.length===1?'':'es');

  // Highlight
  let html = '', cur = 0;
  for(const mm of matches){
    html += esc(text.slice(cur, mm.index));
    html += `<mark>${esc(mm.match)}</mark>`;
    cur = mm.index + mm.match.length;
  }
  html += esc(text.slice(cur));
  $('highlight').innerHTML = html.replace(/\n/g,'<br>') + '<br>';

  // Matches list
  $('matches').innerHTML = matches.length
    ? matches.slice(0, 500).map((mm,i) => `
      <div class="match">
        <div class="idx">#${i+1} · pos ${mm.index}</div>
        <div class="text">${esc(mm.match) || '<em>(empty)</em>'}</div>
        ${mm.groups.length ? `<div class="groups">${mm.groups.map((g,j) => `<div class="group"><b>$${j+1}</b>${esc(g ?? '')}</div>`).join('')}</div>` : ''}
      </div>
    `).join('') + (matches.length > 500 ? `<div class="match-empty">(${matches.length-500} more hidden)</div>` : '')
    : '<div class="match-empty">No matches.</div>';

  // Replace
  try{
    const out = text.replace(re, $('replacement').value);
    $('replace-output').textContent = out;
  }catch(e){ $('replace-output').textContent = 'Error: ' + e.message; }
}

['pattern','flags','input','replacement'].forEach(id => $(id).addEventListener('input', run));

document.querySelectorAll('.preset').forEach(b => b.onclick = () => {
  const p = PRESETS[b.dataset.p];
  $('pattern').value = p.p;
  $('flags').value = p.f;
  $('input').value = p.t;
  run();
});

document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  $('tab-'+t.dataset.tab).classList.add('active');
});

// Sync scroll between textarea and highlight
$('input').addEventListener('scroll', () => { $('highlight').scrollTop = $('input').scrollTop; });

// Saved presets
const DB = 'rx:saved';
const getSaved = () => JSON.parse(localStorage.getItem(DB)||'[]');
const setSaved = a => localStorage.setItem(DB, JSON.stringify(a));
function renderSaved(){
  const s = getSaved();
  const list = $('saved-list');
  if(!s.length){ list.innerHTML='<div class="saved-empty">No saved patterns yet.</div>'; return; }
  list.innerHTML = s.map((x,i) => `
    <div class="saved-item" data-i="${i}">
      <span class="p">/${esc(x.p)}/${esc(x.f)}</span>
      <button class="rm" data-i="${i}">×</button>
    </div>
  `).join('');
  list.querySelectorAll('.saved-item').forEach(el => {
    el.onclick = e => {
      if(e.target.classList.contains('rm')) return;
      const x = getSaved()[+el.dataset.i];
      $('pattern').value = x.p; $('flags').value = x.f; if(x.t) $('input').value = x.t;
      run();
    };
  });
  list.querySelectorAll('.rm').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const a = getSaved(); a.splice(+b.dataset.i,1); setSaved(a); renderSaved();
  });
}
$('save-btn').onclick = () => {
  if(!$('pattern').value) return;
  const s = getSaved();
  s.unshift({p: $('pattern').value, f: $('flags').value, t: $('input').value});
  setSaved(s.slice(0,30));
  renderSaved();
};
$('share-btn').onclick = async () => {
  const p = new URLSearchParams({p:$('pattern').value, f:$('flags').value, t:$('input').value});
  const url = location.origin + location.pathname + '#' + p.toString();
  try{ await navigator.clipboard.writeText(url); $('share-btn').textContent='Copied!'; setTimeout(()=>$('share-btn').textContent='Share link',1200); }catch{}
};

renderSaved(); run();
