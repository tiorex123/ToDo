// ==========================================================================
// SEIREITEI OPS // GOTEI 13 COMMAND SYSTEM
// JAVASCRIPT STATE ENGINE
// ==========================================================================

// Initial seed missions identical to the tactical screen
const INITIAL_MISSIONS = [
  {
    id: "TSK-001",
    title: "Interceptar Menos Grande em Karakura Norte",
    description: "Reiatsu densa detectada nas proximidades do Colégio Karakura. Fenda Garganta em expansão. Requer ativação imediata de Shikai e contenção de civis.",
    category: "capitao",
    badgeLabel: "NÍVEL CAPITÃO",
    badgeType: "tag-red",
    schedule: "18:00h (HOJE)",
    reward: 500,
    sector: "04-B",
    authorizer: "COMANDANTE YAMAMOTO",
    statusBadge: null,
    completed: false
  },
  {
    id: "TSK-004",
    title: "Coletar amostras de Reiatsu Quincy para o Laboratório",
    description: "Frascos espirituais isolados fornecidos pelo Capitão Kurotsuchi. Extrair resíduos espirituais de flechas deixadas nas imediações do Rio Onokoki.",
    category: "capitao",
    badgeLabel: "12ª DIVISÃO // P&D",
    badgeType: "tag-gray",
    schedule: null,
    reward: 300,
    sector: null,
    authorizer: "MAYURI KUROTSUCHI",
    statusBadge: "EM MONITORAMENTO",
    completed: false
  },
  {
    id: "TSK-002",
    title: "Eliminar bando de Hollows mascarados no Parque Mashiro",
    description: "3 Hollows tipo serpente perturbando almas errantes recém-desencarnadas. Área residencial densa, contenção de danos prioritária.",
    category: "andamento",
    badgeLabel: "PURIFICAÇÃO",
    badgeType: "tag-orange",
    schedule: "HOJE 21:00h",
    reward: 200,
    sector: null,
    authorizer: "SERPENTE-MASK",
    statusBadge: null,
    completed: false
  },
  {
    id: "TSK-003",
    title: "Realizar Konsō na alma de garoto no Santuário Naruki",
    description: "Toque cerimonial com a ponta da empunhadura da Zanpakutō para guiar a alma pacificada à Soul Society antes do surgimento da Corrente da Culpa.",
    category: "andamento",
    badgeLabel: "MUNDO DOS VIVOS",
    badgeType: "tag-cyan",
    schedule: null,
    reward: 150,
    sector: null,
    authorizer: "KUCHIKI RUKIA",
    statusBadge: "SANTUÁRIO NARUKI",
    completed: false
  },
  {
    id: "TSK-000",
    title: "Treinamento de Jinzen (Comunicação com a Zanpakutō)",
    description: "Sincronização com Zangetsu alcançada no mundo interior. Duração registrada: 4 horas de meditação sobre lâmina cruzada.",
    category: "concluida",
    badgeLabel: "MEDITAÇÃO // ZANPAKUTŌ",
    badgeType: "tag-orange",
    schedule: null,
    reward: 350,
    sector: null,
    authorizer: "KISUKE URAHARA • 11:42h",
    statusBadge: "REIATSU TRANSFERIDO (+350)",
    completed: true
  }
];

// App State
let missions = JSON.parse(localStorage.getItem('seireitei_missions')) || INITIAL_MISSIONS;
let selectedSector = "mundo-dos-vivos";
let selectedReward = 250;
let activeNavFilter = "all";
let searchQuery = "";

// DOM Elements
const listCapitao = document.getElementById('list-capitao');
const listAndamento = document.getElementById('list-andamento');
const listConcluidas = document.getElementById('list-concluidas');

const countCriticas = document.getElementById('count-criticas');
const countAndamento = document.getElementById('count-andamento');
const countConcluidas = document.getElementById('count-concluidas');

const missionForm = document.getElementById('new-mission-form');
const taskTitleInput = document.getElementById('task-title-input');
const sectorChips = document.querySelectorAll('#sector-chips .tag-chip');
const reiatsuChips = document.querySelectorAll('#reiatsu-chips .tag-chip');

const missionSearchInput = document.getElementById('mission-search');
const navItems = document.querySelectorAll('.sidebar-nav .nav-item');

// Stats DOM Elements
const statHollows = document.getElementById('stat-hollows-vencidos');
const statKonso = document.getElementById('stat-konso-total');
const statAmeacas = document.getElementById('stat-ameacas-ativas');
const reiatsuCurrentVal = document.getElementById('reiatsu-current-val');
const reiatsuBarFill = document.getElementById('reiatsu-bar-fill');
const statCompletedSummary = document.getElementById('stat-completed-summary');

// Widget hollows count
const widgetHollowsCount = document.getElementById('widget-hollows-count');

// Badges in sidebar
const badgeMundoVivos = document.getElementById('badge-mundo-vivos');
const badgeHollows = document.getElementById('badge-hollows');
const badgeAlmas = document.getElementById('badge-almas');
const badgeCapitao = document.getElementById('badge-capitao');

// Save State
function saveMissions() {
  localStorage.setItem('seireitei_missions', JSON.stringify(missions));
}

// Generate unique ID
function generateTaskId() {
  const randNum = Math.floor(100 + Math.random() * 900);
  return `TSK-${randNum}`;
}

// Render missions list
function renderMissions() {
  listCapitao.innerHTML = '';
  listAndamento.innerHTML = '';
  listConcluidas.innerHTML = '';

  const filtered = missions.filter(m => {
    // Search query filter
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Sidebar navigation filter
    if (activeNavFilter === 'mundo-dos-vivos') return true; // default all
    if (activeNavFilter === 'purificacao') return m.category === 'andamento';
    if (activeNavFilter === 'almas-salvas') return m.completed;
    if (activeNavFilter === 'nivel-capitao') return m.category === 'capitao';

    return true;
  });

  const capitaoMissions = filtered.filter(m => !m.completed && m.category === 'capitao');
  const andamentoMissions = filtered.filter(m => !m.completed && m.category === 'andamento');
  const concluidasMissions = filtered.filter(m => m.completed);

  // Update Section Counters
  countCriticas.textContent = `${String(capitaoMissions.length).padStart(2, '0')} ATIVAS`;
  countAndamento.textContent = `${String(andamentoMissions.length).padStart(2, '0')} MISSÕES`;
  countConcluidas.textContent = `${String(concluidasMissions.length).padStart(2, '0')} CONFIRMADA${concluidasMissions.length !== 1 ? 'S' : ''}`;

  // Populate Groups
  capitaoMissions.forEach(m => listCapitao.appendChild(createMissionCard(m)));
  andamentoMissions.forEach(m => listAndamento.appendChild(createMissionCard(m)));
  concluidasMissions.forEach(m => listConcluidas.appendChild(createMissionCard(m)));

  // If empty messages
  if (capitaoMissions.length === 0) listCapitao.innerHTML = createEmptyMessage('Nenhuma ameaça de nível capitão ativa no momento.');
  if (andamentoMissions.length === 0) listAndamento.innerHTML = createEmptyMessage('Todas as purificações do setor foram executadas.');
  if (concluidasMissions.length === 0) listConcluidas.innerHTML = createEmptyMessage('Nenhum registro no arquivo da Soul Society hoje.');

  updateGlobalMetrics();
}

function createEmptyMessage(text) {
  return `<div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-dim); padding: 12px; border: 1px dashed var(--border-hairline); text-align: center;">${text}</div>`;
}

// Create single Mission card DOM element
function createMissionCard(mission) {
  const card = document.createElement('article');
  let categoryClass = `cat-${mission.category}`;
  if (mission.completed) categoryClass = 'completed cat-concluida';

  card.className = `mission-card ${categoryClass}`;

  const checkMark = mission.completed ? '✓' : '';

  card.innerHTML = `
    <button class="card-check-btn" title="${mission.completed ? 'Reativar Missão' : 'Purificar / Concluir Missão'}" data-id="${mission.id}">
      ${checkMark}
    </button>
    <div class="card-content">
      <div class="card-top-row">
        <div class="card-badges">
          <span class="badge-tag ${mission.badgeType}">● ${mission.badgeLabel}</span>
          <span class="task-id">#${mission.id}</span>
        </div>
        ${mission.schedule ? `<div class="card-schedule">⏱ ${mission.schedule}</div>` : ''}
        ${mission.statusBadge ? `<div class="card-schedule">⚑ ${mission.statusBadge}</div>` : ''}
      </div>

      <h3 class="card-title">${escapeHTML(mission.title)}</h3>
      <p class="card-desc">${escapeHTML(mission.description)}</p>

      <div class="card-bottom-row">
        <div class="card-meta-left">
          <span class="reward-pill">RECOMPENSA: +${mission.reward} REIATSU</span>
          ${mission.sector ? `<span>SETOR: ${mission.sector}</span>` : ''}
          ${mission.authorizer ? `<span>DESPACHO: ${mission.authorizer}</span>` : ''}
        </div>
        <div class="card-actions">
          <button class="action-icon-btn edit-btn" title="Editar descrição" data-id="${mission.id}">✎</button>
          <button class="action-icon-btn delete-btn" title="Exorcizar / Remover" data-id="${mission.id}">🗑</button>
        </div>
      </div>
    </div>
    ${mission.completed ? '<div class="purified-stamp">浄化済み • PURIFIED</div>' : ''}
  `;

  // Checkbox action
  const checkBtn = card.querySelector('.card-check-btn');
  checkBtn.addEventListener('click', () => toggleMissionCompletion(mission.id));

  // Delete action
  const deleteBtn = card.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', () => deleteMission(mission.id));

  // Edit action
  const editBtn = card.querySelector('.edit-btn');
  editBtn.addEventListener('click', () => editMissionPrompt(mission.id));

  return card;
}

// Toggle Completed / In Progress
function toggleMissionCompletion(id) {
  missions = missions.map(m => {
    if (m.id === id) {
      const willComplete = !m.completed;
      return {
        ...m,
        completed: willComplete,
        category: willComplete ? 'concluida' : (m.reward >= 500 ? 'capitao' : 'andamento')
      };
    }
    return m;
  });
  saveMissions();
  renderMissions();
}

// Delete Mission
function deleteMission(id) {
  missions = missions.filter(m => m.id !== id);
  saveMissions();
  renderMissions();
}

// Edit Mission prompt
function editMissionPrompt(id) {
  const mission = missions.find(m => m.id === id);
  if (!mission) return;
  const newTitle = prompt('Editar título da missão espiritual:', mission.title);
  if (newTitle && newTitle.trim() !== '') {
    mission.title = newTitle.trim();
    saveMissions();
    renderMissions();
  }
}

// Add New Mission
missionForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = taskTitleInput.value.trim();
  if (!title) return;

  const isCaptainTier = selectedReward >= 500;
  let category = isCaptainTier ? 'capitao' : 'andamento';
  let badgeLabel = 'PURIFICAÇÃO';
  let badgeType = 'tag-orange';

  if (selectedSector === 'mundo-dos-vivos') {
    badgeLabel = 'MUNDO DOS VIVOS';
    badgeType = 'tag-cyan';
  } else if (selectedSector === 'nivel-capitao' || isCaptainTier) {
    badgeLabel = 'NÍVEL CAPITÃO';
    badgeType = 'tag-red';
    category = 'capitao';
  } else if (selectedSector === 'pesquisa-mayuri') {
    badgeLabel = '12ª DIVISÃO // P&D';
    badgeType = 'tag-gray';
  }

  const newMission = {
    id: generateTaskId(),
    title: title,
    description: `Ordem emitida pela Divisão Central para o Setor Karakura. Requer prontidão de lâmina e contenção sob diretriz Soul Society.`,
    category: category,
    badgeLabel: badgeLabel,
    badgeType: badgeType,
    schedule: 'HOJE ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + 'h',
    reward: selectedReward,
    sector: '04-K',
    authorizer: 'CENTRAL 46 / ICHIGO',
    statusBadge: null,
    completed: false
  };

  missions.unshift(newMission);
  saveMissions();
  taskTitleInput.value = '';
  renderMissions();
});

// Sector chips selector
sectorChips.forEach(chip => {
  chip.addEventListener('click', () => {
    sectorChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    selectedSector = chip.dataset.sector;
  });
});

// Reiatsu chips selector
reiatsuChips.forEach(chip => {
  chip.addEventListener('click', () => {
    reiatsuChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    selectedReward = parseInt(chip.dataset.reward, 10);
  });
});

// Search input
missionSearchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderMissions();
});

// Sidebar nav filtering
navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    activeNavFilter = item.dataset.filter || 'all';
    renderMissions();
  });
});

// Update Header, Sidebar and Hero Metrics
function updateGlobalMetrics() {
  const totalCompleted = missions.filter(m => m.completed).length;
  const totalMissions = missions.length;
  const criticalCount = missions.filter(m => !m.completed && m.category === 'capitao').length;

  statAmeacas.textContent = String(criticalCount).padStart(2, '0');
  
  // Reiatsu calc
  const baseReiatsu = 450;
  const earnedReiatsu = missions.filter(m => m.completed).reduce((acc, m) => acc + m.reward, 0);
  const currentReiatsu = Math.min(1000, baseReiatsu + earnedReiatsu);
  const pct = ((currentReiatsu / 1000) * 100).toFixed(1);

  reiatsuCurrentVal.textContent = currentReiatsu;
  reiatsuBarFill.style.width = `${pct}%`;
  statCompletedSummary.textContent = `(${totalCompleted}/${totalMissions} MISSÕES CUMPRIDAS)`;

  // Global reserve display
  document.getElementById('global-reiatsu-pct').textContent = `${pct}% [NOMINAL]`;

  // Sidebar badge updates
  badgeCapitao.textContent = criticalCount;
  badgeAlmas.textContent = totalCompleted;
  badgeHollows.textContent = missions.filter(m => !m.completed && m.category === 'andamento').length;
  badgeMundoVivos.textContent = missions.filter(m => !m.completed).length;
}

// Escape HTML for security
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// ==========================================================================
// POMODORO ESPIRITUAL (MODO ZANPAKUTO) WIDGET LOGIC
// ==========================================================================
let pomodoroTimer = null;
let pomodoroSecondsLeft = 25 * 60;
let isTimerRunning = false;

const timerDisplay = document.getElementById('timer-display');
const btnTimerStart = document.getElementById('btn-timer-start');
const btnTimerPause = document.getElementById('btn-timer-pause');
const btnTimerReset = document.getElementById('btn-timer-reset');
const timerStatusText = document.getElementById('timer-status-text');

function updateTimerDisplay() {
  const m = Math.floor(pomodoroSecondsLeft / 60);
  const s = pomodoroSecondsLeft % 60;
  timerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

btnTimerStart.addEventListener('click', () => {
  if (isTimerRunning) return;
  isTimerRunning = true;
  btnTimerStart.classList.add('active-action');
  timerStatusText.textContent = 'FOCO ESPIRITUAL ATIVO // MEDITANDO NA LÂMINA';

  pomodoroTimer = setInterval(() => {
    if (pomodoroSecondsLeft > 0) {
      pomodoroSecondsLeft--;
      updateTimerDisplay();
    } else {
      clearInterval(pomodoroTimer);
      isTimerRunning = false;
      alert('Sincronização Zanpakutō concluída! Reiatsu renovado.');
    }
  }, 1000);
});

btnTimerPause.addEventListener('click', () => {
  if (!isTimerRunning) return;
  clearInterval(pomodoroTimer);
  isTimerRunning = false;
  btnTimerStart.classList.remove('active-action');
  timerStatusText.textContent = 'MEDITAÇÃO PAUSADA // AGUARDANDO COMANDO';
});

btnTimerReset.addEventListener('click', () => {
  clearInterval(pomodoroTimer);
  isTimerRunning = false;
  pomodoroSecondsLeft = 25 * 60;
  updateTimerDisplay();
  btnTimerStart.classList.remove('active-action');
  timerStatusText.textContent = 'FOCO ESPIRITUAL INATIVO';
});

// Initial boot
renderMissions();
updateTimerDisplay();
