// ==========================================================================
// SEIREITEI OPS // GOTEI 13 COMMAND SYSTEM
// JAVASCRIPT STATE ENGINE: AUTHENTICATION & CLOUD FIRESTORE INTEGRATION
// ==========================================================================

// Configuração do Firebase (conectado ao projeto 'todo-1c7ba')
const firebaseConfig = {
  apiKey: "AIzaSy_SUA_CHAVE_AQUI", // Insira a API Key do console Firebase se necessário
  authDomain: "todo-1c7ba.firebaseapp.com",
  projectId: "todo-1c7ba",
  storageBucket: "todo-1c7ba.firebasestorage.app",
  messagingSenderId: "todo-1c7ba",
  appId: "todo-1c7ba"
};

// Referências aos serviços do Firebase
let db = null;
let auth = null;
let currentUser = null;
let isSignUpMode = false;

// Funções modulares do Cloud Firestore
let collection, doc, setDoc, getDocs, addDoc, updateDoc, deleteDoc;

// Funções modulares do Firebase Authentication
let getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged;

// Sementes iniciais de missões (atribuídas ao usuário no primeiro login caso sua coleção esteja vazia)
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
let missions = [];
let selectedSector = "mundo-dos-vivos";
let selectedReward = 250;
let activeNavFilter = "all";
let searchQuery = "";
let isLoadingMissions = false;

// DOM Elements: Autenticação & Perfil
const authGate = document.getElementById('auth-gate');
const protectedContent = document.getElementById('protected-content');
const authForm = document.getElementById('auth-form');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authErrorMsg = document.getElementById('auth-error-msg');
const btnAuthSubmit = document.getElementById('btn-auth-submit');
const btnAuthText = document.getElementById('btn-auth-text');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authTogglePrompt = document.getElementById('auth-toggle-prompt');
const btnAuthToggle = document.getElementById('btn-auth-toggle');
const btnLogout = document.getElementById('btn-logout');
const userDisplayName = document.getElementById('user-display-name');
const userDisplayRank = document.getElementById('user-display-rank');
const userAvatarBox = document.getElementById('user-avatar-box');

// DOM Elements: Quadro de Missões
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

// Badges in sidebar
const badgeMundoVivos = document.getElementById('badge-mundo-vivos');
const badgeHollows = document.getElementById('badge-hollows');
const badgeAlmas = document.getElementById('badge-almas');
const badgeCapitao = document.getElementById('badge-capitao');

// ==========================================================================
// INICIALIZAÇÃO DO FIREBASE (AUTH & FIRESTORE MODULAR)
// ==========================================================================

async function initFirebaseServices() {
  if (db && auth) return { db, auth };

  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js");
    const firestoreModule = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
    const authModule = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js");

    // Funções do Firestore
    collection = firestoreModule.collection;
    doc = firestoreModule.doc;
    setDoc = firestoreModule.setDoc;
    getDocs = firestoreModule.getDocs;
    addDoc = firestoreModule.addDoc;
    updateDoc = firestoreModule.updateDoc;
    deleteDoc = firestoreModule.deleteDoc;

    // Funções do Firebase Auth
    getAuth = authModule.getAuth;
    signInWithEmailAndPassword = authModule.signInWithEmailAndPassword;
    createUserWithEmailAndPassword = authModule.createUserWithEmailAndPassword;
    signOut = authModule.signOut;
    onAuthStateChanged = authModule.onAuthStateChanged;

    const app = initializeApp(firebaseConfig);
    db = firestoreModule.getFirestore(app);
    auth = getAuth(app);

    console.log("[SEIREITEI OPS] Firebase Auth e Cloud Firestore inicializados.");

    // Monitoramento reativo do estado de autenticação
    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      updateAuthUI(user);

      if (user) {
        console.log("[SEIREITEI AUTH] Oficial conectado:", user.email, "UID:", user.uid);
        await loadMissionsFromFirestore();
      } else {
        console.log("[SEIREITEI AUTH] Nenhum oficial conectado. Acesso restrito.");
        missions = [];
        renderMissions();
      }
    });

    return { db, auth };
  } catch (error) {
    console.error("[SEIREITEI OPS] Falha ao carregar módulos do Firebase:", error);
    showAuthError("Falha na conexão com os serviços do Firebase. Verifique a rede.");
    throw error;
  }
}

// ==========================================================================
// GERENCIAMENTO DA INTERFACE DE AUTENTICAÇÃO
// ==========================================================================

/**
 * Atualiza os elementos visuais conforme o estado autenticado ou deslogado.
 */
function updateAuthUI(user) {
  if (user) {
    // Oficial logado: exibe o painel de missões e o botão de sair
    if (authGate) authGate.style.display = 'none';
    if (protectedContent) protectedContent.style.display = 'grid';
    if (btnLogout) btnLogout.style.display = 'inline-flex';

    const emailName = user.email ? user.email.split('@')[0] : 'OFICIAL';
    if (userDisplayName) userDisplayName.textContent = emailName.toUpperCase();
    if (userDisplayRank) userDisplayRank.textContent = `UID: ${user.uid.slice(0, 8)}... // AUTORIZADO`;
    if (userAvatarBox) userAvatarBox.textContent = emailName.slice(0, 2).toUpperCase();
  } else {
    // Oficial deslogado: oculta o painel protegido e exibe o formulário de login
    if (authGate) authGate.style.display = 'flex';
    if (protectedContent) protectedContent.style.display = 'none';
    if (btnLogout) btnLogout.style.display = 'none';

    if (userDisplayName) userDisplayName.textContent = 'Não autenticado';
    if (userDisplayRank) userDisplayRank.textContent = 'ACESSO RESTRITO // BLOQUEADO';
    if (userAvatarBox) userAvatarBox.textContent = '--';
  }
}

/**
 * Alterna entre formulário de Login e formulário de Cadastro.
 */
if (btnAuthToggle) {
  btnAuthToggle.addEventListener('click', () => {
    isSignUpMode = !isSignUpMode;
    hideAuthError();

    if (isSignUpMode) {
      if (authTitle) authTitle.innerHTML = 'NOVO REGISTRO <span class="kanji-sub">// 登録</span>';
      if (authSubtitle) authSubtitle.textContent = 'Cadastre suas credenciais espirituais na Academia Shinigami para ingressar no Gotei 13';
      if (btnAuthText) btnAuthText.textContent = 'CADASTRAR NOVO OFICIAL';
      if (authTogglePrompt) authTogglePrompt.textContent = 'Já possui credencial espiritual?';
      if (btnAuthToggle) btnAuthToggle.textContent = 'Fazer Login';
    } else {
      if (authTitle) authTitle.innerHTML = 'PORTAL DE ACESSO <span class="kanji-sub">// 穿界門</span>';
      if (authSubtitle) authSubtitle.textContent = 'Autenticação de Oficial Espiritual para liberação do Quadro Tático de Missões';
      if (btnAuthText) btnAuthText.textContent = 'LIBERAR ACESSO (LOGIN)';
      if (authTogglePrompt) authTogglePrompt.textContent = 'Não possui registro espiritual?';
      if (btnAuthToggle) btnAuthToggle.textContent = 'Criar nova conta';
    }
  });
}

/**
 * Submissão do formulário de autenticação (Login / Cadastro).
 */
if (authForm) {
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthError();

    const email = authEmailInput ? authEmailInput.value.trim() : '';
    const password = authPasswordInput ? authPasswordInput.value : '';

    if (!email || !password) {
      showAuthError("Por favor, preencha todos os campos.");
      return;
    }

    if (password.length < 6) {
      showAuthError("A chave espiritual (senha) deve conter no mínimo 6 caracteres.");
      return;
    }

    setAuthButtonLoading(true);

    try {
      if (!auth) await initFirebaseServices();

      if (isSignUpMode) {
        // Criar novo usuário
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("[SEIREITEI AUTH] Oficial registrado:", userCredential.user.email);
      } else {
        // Login com e-mail e senha
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("[SEIREITEI AUTH] Oficial logado com sucesso:", userCredential.user.email);
      }

      if (authForm) authForm.reset();
    } catch (error) {
      console.error("[SEIREITEI AUTH] Erro na autenticação:", error);
      const friendlyMessage = getFriendlyAuthErrorMessage(error);
      showAuthError(friendlyMessage);
    } finally {
      setAuthButtonLoading(false);
    }
  });
}

/**
 * Ação de Logout (Sair da conta).
 */
if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    try {
      if (!auth) await initFirebaseServices();
      await signOut(auth);
      console.log("[SEIREITEI AUTH] Sessão encerrada com sucesso.");
    } catch (error) {
      console.error("[SEIREITEI AUTH] Erro ao encerrar sessão:", error);
      alert("Falha ao encerrar a sessão. Tente novamente.");
    }
  });
}

/**
 * Tradução de erros comuns do Firebase Auth para mensagens amigáveis.
 */
function getFriendlyAuthErrorMessage(error) {
  if (!error) return "Ocorreu um erro na autenticação.";
  const code = error.code || "";

  switch (code) {
    case "auth/invalid-email":
      return "Formato de e-mail inválido. Por favor, verifique a digitação.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Credenciais inválidas. Verifique seu e-mail e sua senha.";
    case "auth/email-already-in-use":
      return "Este e-mail já está registrado na Soul Society. Faça login ou utilize outro endereço.";
    case "auth/weak-password":
      return "A senha é muito fraca. Digite pelo menos 6 caracteres.";
    case "auth/missing-password":
      return "Por favor, digite sua senha de acesso.";
    case "auth/too-many-requests":
      return "Muitas tentativas sem sucesso. Acesso bloqueado temporariamente por segurança. Aguarde alguns instantes.";
    case "auth/network-request-failed":
      return "Falha de conexão com a rede. Verifique seu sinal de internet.";
    case "auth/operation-not-allowed":
      return "O login por e-mail e senha precisa estar ativado no console do Firebase.";
    default:
      return error.message || "Falha na autenticação. Verifique os dados e tente novamente.";
  }
}

function showAuthError(msg) {
  if (authErrorMsg) {
    authErrorMsg.textContent = `▲ [FALHA DE ACESSO]: ${msg}`;
    authErrorMsg.style.display = 'block';
  }
}

function hideAuthError() {
  if (authErrorMsg) {
    authErrorMsg.textContent = '';
    authErrorMsg.style.display = 'none';
  }
}

function setAuthButtonLoading(loading) {
  if (!btnAuthSubmit) return;
  btnAuthSubmit.disabled = loading;
  if (btnAuthText) {
    btnAuthText.textContent = loading 
      ? (isSignUpMode ? 'REGISTRANDO OFICIAL...' : 'VERIFICANDO CHAVE...') 
      : (isSignUpMode ? 'CADASTRAR NOVO OFICIAL' : 'LIBERAR ACESSO (LOGIN)');
  }
}

// ==========================================================================
// CAMADA DE DADOS FIRESTORE: ISOLADA POR USUÁRIO (auth.currentUser.uid)
// ==========================================================================

/**
 * Obtém a referência da subcoleção de missões do usuário atual:
 * Estrutura: /users/{currentUser.uid}/missions
 */
function getUserMissionsCollection() {
  if (!currentUser) throw new Error("Ação não permitida: Nenhum oficial autenticado.");
  return collection(db, "users", currentUser.uid, "missions");
}

/**
 * Obtém a referência de um documento de missão específico do usuário atual:
 * Estrutura: /users/{currentUser.uid}/missions/{missionId}
 */
function getUserMissionDoc(missionId) {
  if (!currentUser) throw new Error("Ação não permitida: Nenhum oficial autenticado.");
  return doc(db, "users", currentUser.uid, "missions", missionId);
}

/**
 * Carrega as missões pertencentes exclusivamente ao oficial autenticado.
 * Se a coleção estiver vazia (primeiro acesso), semeia as missões padrão associadas ao UID.
 */
async function loadMissionsFromFirestore() {
  if (!currentUser) return;

  setLoadingState(true);
  try {
    if (!db) await initFirebaseServices();
    const missionsCol = getUserMissionsCollection();
    const snapshot = await getDocs(missionsCol);

    if (snapshot.empty) {
      console.log(`[SEIREITEI OPS] Nenhuma missão encontrada para o usuário ${currentUser.uid}. Populando dados iniciais...`);
      // Semeia com vínculo explícito ao UID do usuário
      missions = INITIAL_MISSIONS.map(m => ({
        ...m,
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
      }));

      for (const m of missions) {
        await setDoc(getUserMissionDoc(m.id), m);
      }
    } else {
      missions = [];
      snapshot.forEach(docSnap => {
        missions.push({ id: docSnap.id, ...docSnap.data() });
      });
    }
    updateConnectionStatus("FIRESTORE CONECTADO");
  } catch (error) {
    console.error("[SEIREITEI OPS] Erro ao carregar missões do usuário:", error);
    updateConnectionStatus("CONTINGÊNCIA ATIVA");
    if (!missions || missions.length === 0) {
      missions = INITIAL_MISSIONS.map(m => ({ ...m, userId: currentUser.uid }));
    }
  } finally {
    setLoadingState(false);
    renderMissions();
  }
}

/**
 * Salva uma nova missão vinculada ao UID do oficial autenticado.
 * Utiliza: doc, setDoc.
 */
async function saveMissionToFirestore(newMission) {
  if (!db) await initFirebaseServices();
  const missionRef = getUserMissionDoc(newMission.id);
  await setDoc(missionRef, newMission);
}

/**
 * Alternativa para adicionar documento com ID autogerado vinculado ao usuário.
 * Utiliza: collection, addDoc.
 */
async function addMissionWithAutoId(missionData) {
  if (!db) await initFirebaseServices();
  const colRef = getUserMissionsCollection();
  const dataWithUid = { ...missionData, userId: currentUser.uid };
  const docRef = await addDoc(colRef, dataWithUid);
  return docRef.id;
}

/**
 * Atualiza campos específicos da missão do usuário atual.
 * Utiliza: doc, updateDoc.
 */
async function updateMissionInFirestore(missionId, updates) {
  if (!db) await initFirebaseServices();
  const missionRef = getUserMissionDoc(missionId);
  await updateDoc(missionRef, updates);
}

/**
 * Deleta uma missão específica pertencente ao usuário atual.
 * Utiliza: doc, deleteDoc.
 */
async function deleteMissionFromFirestore(missionId) {
  if (!db) await initFirebaseServices();
  const missionRef = getUserMissionDoc(missionId);
  await deleteDoc(missionRef);
}

// ==========================================================================
// FEEDBACK VISUAL E ESTADOS DE CARREGAMENTO
// ==========================================================================

function setLoadingState(loading) {
  isLoadingMissions = loading;
  if (loading) {
    const loadingHtml = createEmptyMessage('⚡ [SINCRONIZANDO COM A SOUL SOCIETY // CLOUD FIRESTORE...]');
    if (listCapitao) listCapitao.innerHTML = loadingHtml;
    if (listAndamento) listAndamento.innerHTML = loadingHtml;
    if (listConcluidas) listConcluidas.innerHTML = loadingHtml;
  }
}

function updateConnectionStatus(statusText) {
  const statusSubline = document.querySelector('.status-subline');
  if (statusSubline) {
    statusSubline.textContent = `[SHIKAI ATIVO // ${statusText}]`;
  }
}

// Generate unique ID
function generateTaskId() {
  const randNum = Math.floor(100 + Math.random() * 900);
  return `TSK-${randNum}`;
}

// Render missions list
function renderMissions() {
  if (isLoadingMissions) return;

  if (listCapitao) listCapitao.innerHTML = '';
  if (listAndamento) listAndamento.innerHTML = '';
  if (listConcluidas) listConcluidas.innerHTML = '';

  const filtered = missions.filter(m => {
    // Search query filter
    const matchesSearch = (m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (m.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (m.id || '').toLowerCase().includes(searchQuery.toLowerCase());
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
  if (countCriticas) countCriticas.textContent = `${String(capitaoMissions.length).padStart(2, '0')} ATIVAS`;
  if (countAndamento) countAndamento.textContent = `${String(andamentoMissions.length).padStart(2, '0')} MISSÕES`;
  if (countConcluidas) countConcluidas.textContent = `${String(concluidasMissions.length).padStart(2, '0')} CONFIRMADA${concluidasMissions.length !== 1 ? 'S' : ''}`;

  // Populate Groups
  if (listCapitao) capitaoMissions.forEach(m => listCapitao.appendChild(createMissionCard(m)));
  if (listAndamento) andamentoMissions.forEach(m => listAndamento.appendChild(createMissionCard(m)));
  if (listConcluidas) concluidasMissions.forEach(m => listConcluidas.appendChild(createMissionCard(m)));

  // If empty messages
  if (listCapitao && capitaoMissions.length === 0) listCapitao.innerHTML = createEmptyMessage('Nenhuma ameaça de nível capitão ativa no momento.');
  if (listAndamento && andamentoMissions.length === 0) listAndamento.innerHTML = createEmptyMessage('Todas as purificações do setor foram executadas.');
  if (listConcluidas && concluidasMissions.length === 0) listConcluidas.innerHTML = createEmptyMessage('Nenhum registro no arquivo da Soul Society hoje.');

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

      <h3 class="card-title">${escapeHTML(mission.title || '')}</h3>
      <p class="card-desc">${escapeHTML(mission.description || '')}</p>

      <div class="card-bottom-row">
        <div class="card-meta-left">
          <span class="reward-pill">RECOMPENSA: +${mission.reward || 0} REIATSU</span>
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
  checkBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMissionCompletion(mission.id, checkBtn);
  });

  // Delete action
  const deleteBtn = card.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteMission(mission.id, deleteBtn);
  });

  // Edit action
  const editBtn = card.querySelector('.edit-btn');
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    editMissionPrompt(mission.id, editBtn);
  });

  return card;
}

// Toggle Completed / In Progress (Async / Firestore)
async function toggleMissionCompletion(id, triggerBtn) {
  const mission = missions.find(m => m.id === id);
  if (!mission) return;

  const prevCompleted = mission.completed;
  const prevCategory = mission.category;

  const willComplete = !mission.completed;
  const newCategory = willComplete ? 'concluida' : ((mission.reward || 0) >= 500 ? 'capitao' : 'andamento');

  // Atualização otimista imediata na UI
  mission.completed = willComplete;
  mission.category = newCategory;
  renderMissions();

  if (triggerBtn) triggerBtn.disabled = true;

  try {
    await updateMissionInFirestore(id, {
      completed: willComplete,
      category: newCategory
    });
  } catch (error) {
    console.error(`[SEIREITEI OPS] Falha ao atualizar missão ${id} no Firestore:`, error);
    // Reverte em caso de falha de rede/permissão
    mission.completed = prevCompleted;
    mission.category = prevCategory;
    renderMissions();
    alert("Falha ao sincronizar alteração com o Cloud Firestore. O estado anterior foi restaurado.");
  } finally {
    if (triggerBtn) triggerBtn.disabled = false;
  }
}

// Delete Mission (Async / Firestore)
async function deleteMission(id, triggerBtn) {
  const confirmExorcism = confirm(`Deseja realmente exorcizar e remover a missão #${id}?`);
  if (!confirmExorcism) return;

  const previousMissions = [...missions];
  missions = missions.filter(m => m.id !== id);
  renderMissions();

  if (triggerBtn) triggerBtn.disabled = true;

  try {
    await deleteMissionFromFirestore(id);
  } catch (error) {
    console.error(`[SEIREITEI OPS] Falha ao deletar missão ${id} no Firestore:`, error);
    // Restaura lista local em caso de erro
    missions = previousMissions;
    renderMissions();
    alert("Falha ao remover a missão no Cloud Firestore. Ela foi restaurada na interface.");
  } finally {
    if (triggerBtn) triggerBtn.disabled = false;
  }
}

// Edit Mission prompt (Async / Firestore)
async function editMissionPrompt(id, triggerBtn) {
  const mission = missions.find(m => m.id === id);
  if (!mission) return;

  const newTitle = prompt('Editar título da missão espiritual:', mission.title);
  if (!newTitle || newTitle.trim() === '' || newTitle.trim() === mission.title) return;

  const prevTitle = mission.title;
  mission.title = newTitle.trim();
  renderMissions();

  if (triggerBtn) triggerBtn.disabled = true;

  try {
    await updateMissionInFirestore(id, {
      title: mission.title
    });
  } catch (error) {
    console.error(`[SEIREITEI OPS] Falha ao atualizar título da missão ${id} no Firestore:`, error);
    mission.title = prevTitle;
    renderMissions();
    alert("Falha ao salvar edição no Cloud Firestore. O título anterior foi restaurado.");
  } finally {
    if (triggerBtn) triggerBtn.disabled = false;
  }
}

// Add New Mission (Async / Firestore vinculado ao usuário)
if (missionForm) {
  missionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = taskTitleInput ? taskTitleInput.value.trim() : '';
    if (!title) return;

    if (!currentUser) {
      alert("Acesso negado: Conecte-se como Oficial para despachar novas missões.");
      return;
    }

    const submitBtn = missionForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : '';

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
      userId: currentUser.uid, // Vinculação expressa ao UID do usuário autenticado
      title: title,
      description: `Ordem emitida pela Divisão Central para o Setor Karakura. Requer prontidão de lâmina e contenção sob diretriz Soul Society.`,
      category: category,
      badgeLabel: badgeLabel,
      badgeType: badgeType,
      schedule: 'HOJE ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + 'h',
      reward: selectedReward,
      sector: '04-K',
      authorizer: 'CENTRAL 46 / ' + (currentUser.email ? currentUser.email.split('@')[0].toUpperCase() : 'ICHIGO'),
      statusBadge: null,
      completed: false,
      createdAt: new Date().toISOString()
    };

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'TRANSMITINDO...';
      }

      // Salva a nova missão no Cloud Firestore sob a coleção do usuário
      await saveMissionToFirestore(newMission);

      missions.unshift(newMission);
      if (taskTitleInput) taskTitleInput.value = '';
      renderMissions();
    } catch (error) {
      console.error("[SEIREITEI OPS] Falha ao persistir nova missão no Firestore:", error);
      alert("Aviso: Falha ao transmitir a missão para a nuvem. A missão foi registrada temporariamente na interface.");
      missions.unshift(newMission);
      if (taskTitleInput) taskTitleInput.value = '';
      renderMissions();
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  });
}

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
if (missionSearchInput) {
  missionSearchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderMissions();
  });
}

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

  if (statAmeacas) statAmeacas.textContent = String(criticalCount).padStart(2, '0');
  
  // Reiatsu calc
  const baseReiatsu = 450;
  const earnedReiatsu = missions.filter(m => m.completed).reduce((acc, m) => acc + (m.reward || 0), 0);
  const currentReiatsu = Math.min(1000, baseReiatsu + earnedReiatsu);
  const pct = ((currentReiatsu / 1000) * 100).toFixed(1);

  if (reiatsuCurrentVal) reiatsuCurrentVal.textContent = currentReiatsu;
  if (reiatsuBarFill) reiatsuBarFill.style.width = `${pct}%`;
  if (statCompletedSummary) statCompletedSummary.textContent = `(${totalCompleted}/${totalMissions} MISSÕES CUMPRIDAS)`;

  // Global reserve display
  const globalPct = document.getElementById('global-reiatsu-pct');
  if (globalPct) globalPct.textContent = `${pct}% [NOMINAL]`;

  // Sidebar badge updates
  if (badgeCapitao) badgeCapitao.textContent = criticalCount;
  if (badgeAlmas) badgeAlmas.textContent = totalCompleted;
  if (badgeHollows) badgeHollows.textContent = missions.filter(m => !m.completed && m.category === 'andamento').length;
  if (badgeMundoVivos) badgeMundoVivos.textContent = missions.filter(m => !m.completed).length;
}

// Escape HTML for security
function escapeHTML(str) {
  return String(str).replace(/[&<>'"]/g, 
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
  if (timerDisplay) {
    timerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}

if (btnTimerStart) {
  btnTimerStart.addEventListener('click', () => {
    if (isTimerRunning) return;
    isTimerRunning = true;
    btnTimerStart.classList.add('active-action');
    if (timerStatusText) {
      timerStatusText.textContent = 'FOCO ESPIRITUAL ATIVO // MEDITANDO NA LÂMINA';
    }

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
}

if (btnTimerPause) {
  btnTimerPause.addEventListener('click', () => {
    if (!isTimerRunning) return;
    clearInterval(pomodoroTimer);
    isTimerRunning = false;
    if (btnTimerStart) btnTimerStart.classList.remove('active-action');
    if (timerStatusText) {
      timerStatusText.textContent = 'MEDITAÇÃO PAUSADA // AGUARDANDO COMANDO';
    }
  });
}

if (btnTimerReset) {
  btnTimerReset.addEventListener('click', () => {
    clearInterval(pomodoroTimer);
    isTimerRunning = false;
    pomodoroSecondsLeft = 25 * 60;
    updateTimerDisplay();
    if (btnTimerStart) btnTimerStart.classList.remove('active-action');
    if (timerStatusText) {
      timerStatusText.textContent = 'FOCO ESPIRITUAL INATIVO';
    }
  });
}

// ==========================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================================================
updateTimerDisplay();
initFirebaseServices();
