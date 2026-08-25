const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function selectTab(name) {
  $$('.titlebar nav button').forEach(x => x.classList.toggle('active', x.dataset.tab === name));
  $$('.tab').forEach(x => x.classList.toggle('active', x.id === name));
}

$$('[data-tab]').forEach(button => button.addEventListener('click', () => selectTab(button.dataset.tab)));

// Native Electron window controls.
$('.close')?.addEventListener('mouseenter', e => e.currentTarget.classList.add('hovered'));
$('.min')?.addEventListener('mouseenter', e => e.currentTarget.classList.add('hovered'));
$('.max')?.addEventListener('mouseenter', e => e.currentTarget.classList.add('hovered'));
$$('.traffic button').forEach(b => b.addEventListener('mouseleave', () => b.classList.remove('hovered')));
$('.close')?.addEventListener('click', () => window.fluxStudio?.close());
$('.min')?.addEventListener('click', () => window.fluxStudio?.minimize());
$('.max')?.addEventListener('click', () => window.fluxStudio?.maximize());

const code = $('#code');
const preview = $('#preview');
const consoleEl = $('#console');

function run() {
  const src = code.value;
  preview.replaceChildren();
  preview.style.background = '';
  const bg = src.match(/ui background\s+["'](.+?)["']/i);
  if (bg) preview.style.background = bg[1];
  const win = src.match(/ui window\s+["'](.+?)["']/i);
  if (win) { const h = document.createElement('h2'); h.textContent = win[1]; preview.appendChild(h); }
  for (const m of src.matchAll(/ui text\s+["'](.+?)["']/gi)) { const p=document.createElement('p'); p.textContent=m[1]; preview.appendChild(p); }
  for (const m of src.matchAll(/ui button\s+["'](.+?)["']/gi)) {
    const b=document.createElement('button'); b.textContent=m[1];
    b.addEventListener('click',()=>consoleEl.textContent += `\n${m[1]} clicked`);
    preview.appendChild(b);
  }
  const says=[...src.matchAll(/say\s+["'](.+?)["']/gi)];
  consoleEl.textContent=says.map(x=>x[1]).join('\n') || 'Flux visual preview ready.';
}

$('#run')?.addEventListener('click', run);
code?.addEventListener('input', run);
run();

$('#newProject')?.addEventListener('click', () => {
  code.value='ui window "My Flux Project"\nui background "#0a0d14"\nui text "Welcome to Flux."\nui button "Start"\n    colour "#8b5cf6"\ndone\n\nsay "Flux is running!"';
  selectTab('playground');
  run();
});

// Local appearance preferences.
const savedAccent = localStorage.getItem('fluxAccent') || '#8b5cf6';
document.documentElement.style.setProperty('--accent', savedAccent);
const savedTheme = localStorage.getItem('fluxTheme') || 'dark';
document.documentElement.dataset.theme = savedTheme;

function addAppearanceControls() {
  const appearance = $$('.cards article')[0];
  if (!appearance || appearance.querySelector('#themeSelect')) return;
  const select=document.createElement('select');
  select.id='themeSelect';
  select.innerHTML='<option value="dark">Dark glass</option><option value="light">Light glass</option><option value="system">System</option>';
  select.value=savedTheme;
  select.addEventListener('change',()=>{localStorage.setItem('fluxTheme',select.value);document.documentElement.dataset.theme=select.value;});
  appearance.appendChild(select);
  const label=document.createElement('label'); label.textContent=' Accent'; label.htmlFor='accentPicker';
  const picker=document.createElement('input'); picker.type='color'; picker.id='accentPicker'; picker.value=savedAccent;
  picker.addEventListener('input',()=>{localStorage.setItem('fluxAccent',picker.value);document.documentElement.style.setProperty('--accent',picker.value);});
  appearance.append(label,picker);
}
addAppearanceControls();

// Extension account gate. This remains a local prototype until real OAuth is connected.
function showExtensionStudio(){
  const name=sessionStorage.getItem('fluxExtensionUser');
  $('#extensionLoggedOut').hidden=!!name;
  $('#extensionLoggedIn').hidden=!name;
  if(name){$('#accountName').textContent=name;renderExtensions();}
}
function renderExtensions(){
  const list=$('#extensionList'); if(!list)return;
  const items=JSON.parse(localStorage.getItem('fluxExtensions')||'[]');
  list.replaceChildren();
  if(!items.length){const p=document.createElement('p');p.textContent='No extensions yet. Create your first one.';list.appendChild(p);}
  items.forEach(x=>{const d=document.createElement('div');d.className='extension-card';const b=document.createElement('b');b.textContent=x.name;const s=document.createElement('span');s.textContent=x.description||'FluxStudio extension';d.append(b,s);list.appendChild(d);});
}
$$('.authbuttons button').forEach(btn=>btn.addEventListener('click',()=>{sessionStorage.setItem('fluxExtensionUser',btn.dataset.provider+' Creator');showExtensionStudio();}));
$('#signout')?.addEventListener('click',()=>{sessionStorage.removeItem('fluxExtensionUser');showExtensionStudio();});
$('#createExtension')?.addEventListener('click',()=>{const name=prompt('Extension name');if(!name)return;const description=prompt('What does your extension do?')||'';const items=JSON.parse(localStorage.getItem('fluxExtensions')||'[]');items.push({name,description});localStorage.setItem('fluxExtensions',JSON.stringify(items));renderExtensions();});
showExtensionStudio();

// Release checker. It tells the user where the new installer is; automatic installation will be added after this release.
$('#updateButton')?.addEventListener('click', async()=>{
  const status=$('#updateStatus'); status.textContent='Checking GitHub Releases…';
  try{
    const r=await fetch('https://api.github.com/repos/JoelEngelman/Flux-Studio/releases/latest',{headers:{Accept:'application/vnd.github+json'}});
    if(!r.ok)throw Error('GitHub request failed');
    const data=await r.json();
    const current='0.1.1';
    if(data.tag_name && data.tag_name !== 'v'+current){status.textContent=`Update available: ${data.tag_name}`;window.fluxStudio?.openLatestRelease();}
    else status.textContent=`You are up to date (${current}).`;
  }catch(e){status.textContent='Could not check for updates right now.';}
});
