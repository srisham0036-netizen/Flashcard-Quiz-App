
/* Simple Flashcard Quiz App - localStorage-based */

const STORAGE_KEY = 'flashcard_decks_v1';
let decks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
let currentDeckId = null;
let quizState = null;

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

// Elements
const deckList = $('#deck-list');
const createDeckBtn = $('#create-deck');
const newDeckName = $('#new-deck-name');
const deckTitle = $('#deck-title');
const cardForm = $('#card-form');
const questionInput = $('#question');
const answerInput = $('#answer');
const addCardBtn = $('#add-card');
const cardsArea = $('#cards-area');
const startQuizBtn = $('#start-quiz');
const resetProgressBtn = $('#reset-progress');
const quizArea = $('#quiz-area');
const quizCard = $('#quiz-card');
const quizActions = $('#quiz-actions');
const showAnswerBtn = $('#show-answer');
const correctBtn = $('#correct');
const incorrectBtn = $('#incorrect');
const quizScore = $('#quiz-score');

function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

function renderDeckList(){
  deckList.innerHTML='';
  for(const id of Object.keys(decks)){
    const li = document.createElement('li');
    li.textContent = decks[id].name + ' (' + decks[id].cards.length + ')';
    li.dataset.id = id;
    if(id === currentDeckId) li.classList.add('active');
    const del = document.createElement('button');
    del.textContent='Delete';
    del.className='secondary';
    del.onclick = (e)=>{ e.stopPropagation(); if(confirm('Delete deck?')){ delete decks[id]; if(id===currentDeckId) currentDeckId=null; save(); render(); } };
    li.appendChild(del);
    li.onclick = ()=>{ currentDeckId = id; render(); };
    deckList.appendChild(li);
  }
}

function newId(){ return 'd_'+Math.random().toString(36).slice(2,9); }

function renderCards(){
  cardsArea.innerHTML='';
  if(!currentDeckId){ deckTitle.textContent='Select or create a deck'; cardForm.classList.add('hidden'); startQuizBtn.disabled=true; resetProgressBtn.disabled=true; return; }
  const deck = decks[currentDeckId];
  deckTitle.textContent = deck.name + ' — ' + deck.cards.length + ' cards';
  cardForm.classList.remove('hidden');
  startQuizBtn.disabled = deck.cards.length===0;
  resetProgressBtn.disabled = deck.cards.length===0;
  for(const [idx, c] of deck.cards.entries()){
    const card = document.createElement('div'); card.className='card';
    const qa = document.createElement('div'); qa.className='qa';
    qa.innerHTML = '<div class="small">Q</div><div>'+escapeHtml(c.q)+'</div><hr/><div class="small">A</div><div>'+escapeHtml(c.a)+'</div>';
    const actions = document.createElement('div'); actions.className='card-actions';
    const edit = document.createElement('button'); edit.textContent='Edit'; edit.onclick = ()=>{ questionInput.value=c.q; answerInput.value=c.a; addCardBtn.textContent='Save'; addCardBtn.dataset.edit = idx; window.scrollTo(0,0); };
    const del = document.createElement('button'); del.textContent='Delete'; del.className='secondary'; del.onclick = ()=>{ if(confirm('Delete card?')){ deck.cards.splice(idx,1); save(); render(); } };
    actions.appendChild(edit); actions.appendChild(del);
    card.appendChild(actions); card.appendChild(qa);
    cardsArea.appendChild(card);
  }
}

function renderQuizArea(){
  if(!currentDeckId){ quizArea.classList.add('hidden'); return; }
  const deck = decks[currentDeckId];
  if(deck.cards.length===0){ quizArea.classList.add('hidden'); return; }
  quizArea.classList.remove('hidden');
  quizCard.textContent = 'Press Start';
  quizActions.classList.add('hidden');
  quizScore.textContent = 'Progress: ' + (deck.progress ? (deck.progress.correct || 0) + '/' + (deck.progress.reviewed || 0) : '0/0');
}

function render(){
  renderDeckList();
  renderCards();
  renderQuizArea();
  save();
}

/* Event handlers */
createDeckBtn.onclick = ()=>{
  const name = newDeckName.value.trim() || 'Untitled Deck';
  const id = newId();
  decks[id] = { id, name, cards: [], progress: { reviewed:0, correct:0 } };
  currentDeckId = id;
  newDeckName.value='';
  render();
};

addCardBtn.onclick = ()=>{
  if(!currentDeckId) return alert('Select a deck first');
  const q = questionInput.value.trim();
  const a = answerInput.value.trim();
  if(!q || !a) return alert('Both question and answer are required');
  const deck = decks[currentDeckId];
  if(addCardBtn.dataset.edit){
    const idx = Number(addCardBtn.dataset.edit);
    deck.cards[idx] = { q,a };
    addCardBtn.textContent='Add Card';
    delete addCardBtn.dataset.edit;
  } else {
    deck.cards.push({ q,a });
  }
  questionInput.value=''; answerInput.value='';
  save(); render();
};

startQuizBtn.onclick = ()=>{
  const deck = decks[currentDeckId];
  quizState = { order: shuffle(Array.from(deck.cards.keys())), pos:0, showAnswer:false, correct:0, reviewed:0 };
  showNextQuizCard();
  quizActions.classList.remove('hidden');
  quizScore.textContent = `Progress: 0/${quizState.order.length}`;
};

resetProgressBtn.onclick = ()=>{
  if(!confirm('Reset deck progress?')) return;
  decks[currentDeckId].progress = { reviewed:0, correct:0 };
  save(); render();
};

showAnswerBtn.onclick = ()=>{
  const deck = decks[currentDeckId];
  const idx = quizState.order[quizState.pos];
  quizCard.textContent = deck.cards[idx].a;
};

correctBtn.onclick = ()=>{ mark(true); };
incorrectBtn.onclick = ()=>{ mark(false); };

function mark(isCorrect){
  const deck = decks[currentDeckId];
  if(quizState.pos >= quizState.order.length) return;
  quizState.reviewed++;
  if(isCorrect) quizState.correct++;
  // update deck persistent progress
  deck.progress = deck.progress || { reviewed:0, correct:0 };
  deck.progress.reviewed += 1;
  if(isCorrect) deck.progress.correct += 1;
  quizState.pos++;
  if(quizState.pos >= quizState.order.length){
    quizCard.textContent = `Quiz finished — Score: ${quizState.correct}/${quizState.reviewed}`;
    quizActions.classList.add('hidden');
  } else {
    showNextQuizCard();
  }
  quizScore.textContent = `Progress: ${quizState.reviewed}/${quizState.order.length}`;
  save();
}

function showNextQuizCard(){
  const deck = decks[currentDeckId];
  const idx = quizState.order[quizState.pos];
  quizCard.textContent = deck.cards[idx].q;
  quizActions.classList.remove('hidden');
  quizScore.textContent = `Progress: ${quizState.reviewed}/${quizState.order.length}`;
}

function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]];} return arr; }

function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Initial render
render();
