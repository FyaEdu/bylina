/* ===================================================================
   BYLINA — App logic
   Vanilla JS, no dependencies.
   =================================================================== */

const TOTAL_PAGES = 12;

const JOURNEY_TITLES = [
  'Cover',
  'What is Bylina?',
  'The World of Bylina',
  'The Bogatyrs',
  'Alyosha Popovich',
  'Alyosha & Tugarin',
  'Enter the Tale',
  'Why Bylina Matters',
  'From Folklore to Fantasy',
  'Modern Echo',
  'Interactive Experience',
  'Ending'
];

let state = {
  currentPage: 1,
  gateLocked: {}, // pageNumber -> true if user must finish an interaction before leaving forward
};

/* -------------------------------------------------------------
   CORE NAVIGATION
   ------------------------------------------------------------- */

function goToPage(n, opts){
  opts = opts || {};
  if(n < 1 || n > TOTAL_PAGES) return;
  if(n === state.currentPage) return;
  if(n > state.currentPage && state.gateLocked[state.currentPage]){
    pulseGate(state.currentPage);
    return;
  }
  const from = state.currentPage;
  const to = n;
  const oldEl = document.getElementById('page-' + from);
  const newEl = document.getElementById('page-' + to);
  closeJourney();

  const sequential = !!opts.sequential && Math.abs(to - from) === 1 && oldEl && newEl;

  state.currentPage = to;
  updateNavUI();

  if(sequential){
    const direction = to > from ? 'next' : 'prev';
    const kind = transitionKind(from, to);
    animateTransition(oldEl, newEl, kind, direction);
  } else {
    // Plain jump (journey menu, restart, cover CTA to a non-adjacent page).
    // Defensively clear every page's animation state first: a rapidly
    // interrupted transition elsewhere can leave a held WAAPI effect
    // (fill: 'forwards') on a page that never got cancelled, which would
    // otherwise make it render blank forever even once .active is set.
    document.querySelectorAll('.page').forEach(p => {
      resetPageInlineState(p);
      p.classList.remove('active');
    });
    if(newEl) newEl.classList.add('active');
  }
  if(newEl) newEl.scrollTop = 0;
}

function nextPage(){ goToPage(state.currentPage + 1, { sequential: true }); }
function previousPage(){ goToPage(state.currentPage - 1, { sequential: true }); }

/** Decides which transition style connects two adjacent pages.
 *  Pages 1–9 and 11–12 read like a physical book (page-turn).
 *  Crossing the 9⇄10 or 10⇄11 boundary — into/out of the modern
 *  fantasy chapter — uses a distinct "digital" dissolve instead. */
function transitionKind(a, b){
  const inBook = p => p >= 1 && p <= 9;
  const inClosing = p => p === 11 || p === 12;
  if((inBook(a) && inBook(b)) || (inClosing(a) && inClosing(b))) return 'book';
  return 'digital';
}

/** Cancels any in-flight or held (fill:'forwards') WAAPI animations on an
 *  element and clears the inline styles they left behind, so plain CSS
 *  classes (.active etc.) fully control it again. Canceling is essential:
 *  a finished 'forwards' animation keeps overriding style until canceled,
 *  clearing el.style alone does not release that hold. */
function resetPageInlineState(el){
  if(!el) return;
  el.getAnimations().forEach(a => a.cancel());
  el.style.transform = '';
  el.style.filter = '';
  el.style.transformOrigin = '';
  el.style.opacity = '';
  el.classList.remove('js-animating');
}

/** Runs a directional page transition using the Web Animations API,
 *  then settles both elements back into plain CSS-controlled state. */
function animateTransition(oldEl, newEl, kind, direction){
  // Cancel any leftover held animation from a previous, possibly
  // interrupted transition before starting a new one on these elements.
  resetPageInlineState(oldEl);
  resetPageInlineState(newEl);
  oldEl.classList.add('js-animating');
  newEl.classList.add('js-animating');

  let oldAnim, newAnim;

  function finalize(){
    // Cancel first so the held 'forwards' effect is released, then let
    // the CSS classes below take over — order matters here.
    if(oldAnim) oldAnim.cancel();
    if(newAnim) newAnim.cancel();
    oldEl.classList.remove('active', 'js-animating');
    newEl.classList.add('active');
    newEl.classList.remove('js-animating');
    [oldEl, newEl].forEach(el => {
      el.style.transform = '';
      el.style.filter = '';
      el.style.transformOrigin = '';
      el.style.opacity = '';
    });
  }

  if(kind === 'book'){
    const dur = 640;
    const oldOrigin = direction === 'next' ? '0% 50%' : '100% 50%';
    const newOrigin = oldOrigin;
    oldEl.style.transformOrigin = oldOrigin;
    newEl.style.transformOrigin = newOrigin;

    const oldFrames = direction === 'next'
      ? [{ transform: 'rotateY(0deg)', filter: 'brightness(1)' },
         { transform: 'rotateY(-98deg)', filter: 'brightness(0.5)' }]
      : [{ transform: 'rotateY(0deg)', filter: 'brightness(1)' },
         { transform: 'rotateY(98deg)', filter: 'brightness(0.5)' }];
    const newFrames = direction === 'next'
      ? [{ transform: 'rotateY(85deg)', filter: 'brightness(0.5)' },
         { transform: 'rotateY(0deg)', filter: 'brightness(1)' }]
      : [{ transform: 'rotateY(-85deg)', filter: 'brightness(0.5)' },
         { transform: 'rotateY(0deg)', filter: 'brightness(1)' }];

    oldAnim = oldEl.animate(oldFrames, { duration: dur, easing: 'cubic-bezier(.55,.06,.68,.19)', fill: 'forwards' });
    newAnim = newEl.animate(newFrames, { duration: dur, delay: dur * 0.32, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' });
    newAnim.onfinish = finalize;
  } else {
    const dur = 520;
    const oldFrames = [
      { opacity: 1, filter: 'blur(0px) brightness(1)', transform: 'scale(1)' },
      { opacity: 0, filter: 'blur(12px) brightness(1.9)', transform: 'scale(1.04)' }
    ];
    const newFrames = [
      { opacity: 0, filter: 'blur(12px) brightness(1.9)', transform: 'scale(0.96)' },
      { opacity: 1, filter: 'blur(0px) brightness(1)', transform: 'scale(1)' }
    ];
    oldAnim = oldEl.animate(oldFrames, { duration: dur, easing: 'ease-in', fill: 'forwards' });
    newAnim = newEl.animate(newFrames, { duration: dur, delay: dur * 0.3, easing: 'ease-out', fill: 'forwards' });
    newAnim.onfinish = finalize;
    spawnDigitalSweep(direction);
  }
}

/** A brief glowing scanline sweep layered over the whole viewport to
 *  sell the "futuristic" feel of the 9⇄10⇄11 transitions. Purely
 *  decorative and removes itself when done. */
function spawnDigitalSweep(direction){
  const sweep = document.createElement('div');
  sweep.className = 'digital-sweep' + (direction === 'prev' ? ' reverse' : '');
  document.body.appendChild(sweep);
  sweep.addEventListener('animationend', () => sweep.remove());
}

/** Toggles any tap-to-reveal element (used by the "What is Bylina?" cards). */
function reveal(el){
  if(!el) return;
  el.classList.toggle('open');
}

function completeMiniGame(){
  state.gateLocked[7] = false;
  const nextBtn = document.getElementById('nav-next');
  if(nextBtn) nextBtn.disabled = false;
}

function pulseGate(pageNum){
  const el = document.getElementById('page-' + pageNum);
  if(!el) return;
  el.animate([
    { transform: 'translateX(0)' },
    { transform: 'translateX(-8px)' },
    { transform: 'translateX(8px)' },
    { transform: 'translateX(0)' }
  ], { duration: 260 });
}

function updateNavUI(){
  document.getElementById('nav-prev').disabled = state.currentPage === 1;
  const nextBtn = document.getElementById('nav-next');
  nextBtn.disabled = !!state.gateLocked[state.currentPage] || state.currentPage === TOTAL_PAGES;
  document.getElementById('nav-position').textContent = `Page ${state.currentPage} / ${TOTAL_PAGES}`;
  document.querySelectorAll('.journey-item').forEach(item => {
    item.classList.toggle('current', Number(item.dataset.page) === state.currentPage);
  });
  const pageEl = document.getElementById('page-' + state.currentPage);
  const isFantasy = !!(pageEl && pageEl.classList.contains('layer-fantasy'));
  document.body.setAttribute('data-nav-theme', isFantasy ? 'fantasy' : 'default');
}

/* -------------------------------------------------------------
   JOURNEY MENU
   ------------------------------------------------------------- */

function buildJourneyMenu(){
  const list = document.getElementById('journey-list');
  list.innerHTML = '';
  JOURNEY_TITLES.forEach((title, idx) => {
    const n = idx + 1;
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'journey-item';
    btn.dataset.page = n;
    btn.innerHTML = `<span class="journey-num">${String(n).padStart(2,'0')}</span><span>${title}</span>`;
    btn.addEventListener('click', () => goToPage(n));
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function openJourney(){ document.getElementById('journey-overlay').classList.add('open'); }
function closeJourney(){ document.getElementById('journey-overlay').classList.remove('open'); }

/* -------------------------------------------------------------
   PAGE 2 — tap cards
   ------------------------------------------------------------- */
function initTapCards(){
  document.querySelectorAll('.tap-card').forEach(card => {
    card.addEventListener('click', () => reveal(card));
  });
}

/* -------------------------------------------------------------
   PAGE 3 — map hotspots
   ------------------------------------------------------------- */
function initMap(){
  const infoTitle = document.querySelector('#page-3 .map-info-title');
  const infoText = document.querySelector('#page-3 .map-info-text');
  document.querySelectorAll('#page-3 .hotspot').forEach(spot => {
    spot.addEventListener('click', () => {
      infoTitle.textContent = spot.dataset.title;
      infoText.textContent = spot.dataset.text;
    });
  });
}

/* -------------------------------------------------------------
   PAGE 4 — bogatyr lineup
   ------------------------------------------------------------- */
function initHeroes(){
  const detail = document.querySelector('#page-4 .hero-detail');
  document.querySelectorAll('#page-4 .hero-card').forEach(card => {
    card.addEventListener('click', () => {
      detail.innerHTML = `<strong>${card.dataset.name}</strong> — ${card.dataset.role}<br>${card.dataset.text}`;
    });
  });
}

/* -------------------------------------------------------------
   PAGE 5 — Alyosha traits
   ------------------------------------------------------------- */
function initTraits(){
  const answer = document.querySelector('#page-5 .trait-answer');
  document.querySelectorAll('#page-5 .trait-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#page-5 .trait-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      answer.textContent = chip.dataset.text;
    });
  });
}

/* -------------------------------------------------------------
   PAGE 6 — story sequence with a branching choice
   ------------------------------------------------------------- */
function showScene(n){
  document.querySelectorAll('#page-6 .scene-block').forEach(b => b.classList.remove('active'));
  document.getElementById('scene-' + n).classList.add('active');
}

function initStorySequence(){
  document.querySelectorAll('#page-6 [data-next-scene]').forEach(btn => {
    btn.addEventListener('click', () => showScene(btn.dataset.nextScene));
  });
  const outcome = document.getElementById('choice-outcome');
  document.querySelectorAll('#page-6 .btn-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      outcome.textContent = btn.dataset.outcome;
      outcome.style.display = 'block';
    });
  });
}

/* -------------------------------------------------------------
   PAGE 7 — mini-game: find the hero
   ------------------------------------------------------------- */
function initMiniGame(){
  state.gateLocked[7] = true;
  const feedback = document.getElementById('game-feedback');
  document.querySelectorAll('.figure-target').forEach(figure => {
    figure.addEventListener('click', () => {
      if(figure.dataset.correct === 'true'){
        feedback.textContent = 'You found Alyosha.';
        feedback.classList.add('success');
        completeMiniGame();
      } else {
        feedback.textContent = 'Look again.';
        feedback.classList.remove('success');
      }
    });
  });
}

/* -------------------------------------------------------------
   PAGE 8 — timeline
   ------------------------------------------------------------- */
function initTimeline(){
  const detail = document.querySelector('#page-8 .timeline-detail');
  document.querySelectorAll('#page-8 .timeline-stage').forEach(stage => {
    stage.addEventListener('click', () => {
      document.querySelectorAll('#page-8 .timeline-stage').forEach(s => s.classList.remove('active'));
      stage.classList.add('active');
      detail.textContent = stage.dataset.text;
    });
  });
}

/* -------------------------------------------------------------
   PAGE 11 — showcase panel links to other pages
   ------------------------------------------------------------- */
function initShowcase(){
  document.querySelectorAll('#page-11 .showcase-card').forEach(card => {
    card.addEventListener('click', () => {
      if(card.dataset.gotoPage){
        goToPage(Number(card.dataset.gotoPage));
      }
    });
  });
}

/* -------------------------------------------------------------
   PAGE 12 — ending actions
   ------------------------------------------------------------- */
function initEnding(){
  document.getElementById('restart-btn').addEventListener('click', () => goToPage(1));
  const refBtn = document.getElementById('references-btn');
  const refPanel = document.getElementById('references-panel');
  refBtn.addEventListener('click', () => refPanel.classList.toggle('open'));
}

/* -------------------------------------------------------------
   NAV BAR + KEYBOARD
   ------------------------------------------------------------- */
function initNav(){
  document.getElementById('nav-prev').addEventListener('click', previousPage);
  document.getElementById('nav-next').addEventListener('click', nextPage);
  document.getElementById('nav-journey').addEventListener('click', openJourney);
  document.getElementById('journey-close').addEventListener('click', closeJourney);
  document.getElementById('journey-overlay').addEventListener('click', (e) => {
    if(e.target.id === 'journey-overlay') closeJourney();
  });
  window.addEventListener('keydown', (e) => {
    if(e.key === 'ArrowRight') nextPage();
    if(e.key === 'ArrowLeft') previousPage();
    if(e.key === 'Escape') closeJourney();
  });
}

/* -------------------------------------------------------------
   INIT
   ------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  buildJourneyMenu();
  initNav();
  initTapCards();
  initMap();
  initHeroes();
  initTraits();
  initStorySequence();
  initMiniGame();
  initTimeline();
  initShowcase();
  initEnding();
  updateNavUI();
});
