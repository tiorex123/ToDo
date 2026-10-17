// ==========================================================================
// SEIREITEI OPS // GOTEI 13 COMMAND SYSTEM
// JAVASCRIPT STATE ENGINE: AUTHENTICATION & CLOUD FIRESTORE INTEGRATION
// ==========================================================================

// Configuração do Firebase (conectado ao projeto 'todo-1c7ba')
const firebaseConfig = {
  apiKey: "A", // API Key do console Firebase
  authDomain: "todo-1c7ba.firebaseapp.com",
  projectId: "todo-1c7ba",
  storageBucket: "todo-1c7ba.firebasestorage.app",
  messagingSenderId: "todo-1c7ba",
  appId: "todo-1c7ba"
};

// Nome da coleção no Firestore compatível com a regra de segurança:
// match /usuarios/{userId} { allow read, write: if request.auth != null && request.auth.uid == userId; }
const USERS_COLLECTION = "usuarios";

// Referências aos serviços do Firebase
let db = null;
let auth = null;
let currentUser = null;
let isSignUpMode = false;

// Funções modulares do Cloud Firestore
let getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot;

// Funções modulares do Firebase Authentication
let getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup;

// Sementes iniciais de missões (atribuídas ao usuário no primeiro login caso seu documento esteja vazio)
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
const btnGoogleAuth = document.getElementById('btn-google-auth');
const btnGoogleText = document.getElementById('btn-google-text');
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
    getFirestore = firestoreModule.getFirestore;
    collection = firestoreModule.collection;
    doc = firestoreModule.doc;
    setDoc = firestoreModule.setDoc;
    getDoc = firestoreModule.getDoc;
    getDocs = firestoreModule.getDocs;
    addDoc = firestoreModule.addDoc;
    updateDoc = firestoreModule.updateDoc;
    deleteDoc = firestoreModule.deleteDoc;
    onSnapshot = firestoreModule.onSnapshot;

    // Funções do Firebase Auth
    getAuth = authModule.getAuth;
    signInWithEmailAndPassword = authModule.signInWithEmailAndPassword;
    createUserWithEmailAndPassword = authModule.createUserWithEmailAndPassword;
    signOut = authModule.signOut;
    onAuthStateChanged = authModule.onAuthStateChanged;
    GoogleAuthProvider = authModule.GoogleAuthProvider;
    signInWithPopup = authModule.signInWithPopup;

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    console.log("[SEIREITEI OPS] Firebase Auth e Cloud Firestore inicializados com sucesso.");

    // Monitoramento reativo do estado de autenticação via onAuthStateChanged
    // Garante que busca e gravação ocorram SOMENTE após a confirmação do usuário
    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      updateAuthUI(user);

      if (user && user.uid) {
        console.log(`[SEIREITEI AUTH] Oficial confirmado no onAuthStateChanged: ${user.email} (UID: ${user.uid})`);
        // Dispara a leitura do documento /usuarios/{userId} somente após autenticação confirmada
        await loadMissionsFromFirestore();
      } else {
        console.log("[SEIREITEI AUTH] Nenhum oficial autenticado no onAuthStateChanged. Acesso bloqueado.");
        currentUser = null;
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

    const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'OFICIAL');
    const isGoogle = user.providerData && user.providerData.some(p => p.providerId === 'google.com');
    const providerTag = isGoogle ? 'GOOGLE // AUTORIZADO' : 'AUTORIZADO';

    if (userDisplayName) userDisplayName.textContent = displayName.toUpperCase();
    if (userDisplayRank) userDisplayRank.textContent = `UID: ${user.uid.slice(0, 8)}... // ${providerTag}`;
    if (userAvatarBox) userAvatarBox.textContent = displayName.slice(0, 2).toUpperCase();
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

/**
 * Autenticação via popup do Google utilizando GoogleAuthProvider e signInWithPopup.
 */
async function handleGoogleSignIn() {
  hideAuthError();
  setGoogleButtonLoading(true);

  try {
    if (!auth) await initFirebaseServices();

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    console.log("[SEIREITEI AUTH] Abrindo popup de autenticação com o Google...");
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    console.log(`[SEIREITEI AUTH] Login com Google efetuado com sucesso: ${user.email} (UID: ${user.uid})`);

    // Sincroniza estado e dispara busca/gravação na pasta /usuarios/{userId}
    currentUser = user;
    updateAuthUI(user);
    await loadMissionsFromFirestore();
  } catch (error) {
    console.error("[SEIREITEI AUTH] Erro ao autenticar com o Google:", error);
    handleGoogleAuthError(error);
  } finally {
    setGoogleButtonLoading(false);
  }
}

/**
 * Tratamento de erros e cancelamentos do popup do Google.
 */
function handleGoogleAuthError(error) {
  if (!error) return;
  const code = error.code || "";

  switch (code) {
    case "auth/popup-closed-by-user":
      showAuthError("A janela do Google foi fechada antes de concluir a autorização. O acesso não foi liberado.");
      break;
    case "auth/cancelled-popup-request":
      showAuthError("A solicitação de login com o Google foi cancelada.");
      break;
    case "auth/popup-blocked":
      showAuthError("O popup do Google foi bloqueado pelo seu navegador. Habilite popups para este site e tente novamente.");
      break;
    case "auth/account-exists-with-different-credential":
      showAuthError("Já existe uma conta registrada com este e-mail através de outro método. Entre utilizando suas credenciais anteriores.");
      break;
    case "auth/network-request-failed":
      showAuthError("Falha de conexão com os servidores do Google. Verifique seu sinal de internet.");
      break;
    case "auth/operation-not-allowed":
      showAuthError("O provedor Google precisa ser ativado no Firebase Console (Authentication > Sign-in method).");
      break;
    default:
      showAuthError(error.message || "Não foi possível concluir o login com o Google. Tente novamente.");
      break;
  }
}

function setGoogleButtonLoading(loading) {
  if (!btnGoogleAuth) return;
  btnGoogleAuth.disabled = loading;
  if (btnGoogleText) {
    btnGoogleText.textContent = loading ? "CONECTANDO AO GOOGLE..." : "ENTRAR COM O GOOGLE";
  }
}

// Event listener para o botão de Login com o Google
if (btnGoogleAuth) {
  btnGoogleAuth.addEventListener('click', handleGoogleSignIn);
}

// ==========================================================================
// CAMADA DE DADOS FIRESTORE: COMPATÍVEL COM match /usuarios/{userId}
// ==========================================================================

/**
 * Retorna a referência do documento do usuário: /usuarios/{userId}
 * Utiliza o ID do usuário autenticado (auth.currentUser.uid).
 */
function getUserDocRef(userId) {
  const targetUid = userId || (currentUser ? currentUser.uid : null);
  if (!targetUid) {
    throw new Error("Ação não permitida: Nenhum oficial autenticado no sistema.");
  }
  return doc(db, USERS_COLLECTION, targetUid);
}

/**
 * Lê diretamente o documento correspondente ao userId do usuário logado: doc(db, "usuarios", userId)
 * Utiliza: doc, getDoc
 * Executada SOMENTE após a confirmação de que o usuário está autenticado no onAuthStateChanged.
 */
async function loadMissionsFromFirestore() {
  if (!currentUser || !currentUser.uid) {
    console.warn("[SEIREITEI OPS] Leitura cancelada: Usuário não autenticado no momento.");
    return;
  }

  setLoadingState(true);
  try {
    if (!db) await initFirebaseServices();

    const userDocRef = getUserDocRef(currentUser.uid);
    console.log(`[SEIREITEI OPS] Consultando documento /${USERS_COLLECTION}/${currentUser.uid}...`);

    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      missions = Array.isArray(data.missions) ? data.missions : [];
      console.log(`[SEIREITEI OPS] Documento /${USERS_COLLECTION}/${currentUser.uid} carregado com sucesso (${missions.length} missões).`);
    } else {
      console.log(`[SEIREITEI OPS] Documento /${USERS_COLLECTION}/${currentUser.uid} ainda não existe. Criando novo registro...`);
      // Inicializa com as missões padrão associadas ao UID
      missions = INITIAL_MISSIONS.map(m => ({
        ...m,
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
      }));

      // Criação inicial do documento com setDoc
      await setDoc(userDocRef, {
        userId: currentUser.uid,
        email: currentUser.email || '',
        missions: missions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`[SEIREITEI OPS] Documento /${USERS_COLLECTION}/${currentUser.uid} inicializado via setDoc.`);
    }

    updateConnectionStatus("FIRESTORE CONECTADO");
  } catch (error) {
    handleFirestoreError(error, "ao carregar missões do usuário");
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
 * Salva ou atualiza a lista de missões no documento /usuarios/{userId}.
 * Utiliza: doc(db, "usuarios", userId) e setDoc com merge: true
 * Garante que a gravação só ocorra se o usuário estiver autenticado.
 */
async function saveUserMissionsToFirestore(updatedMissions) {
  if (!currentUser || !currentUser.uid) {
    throw new Error("Ação não permitida: Oficial não autenticado.");
  }
  if (!db) await initFirebaseServices();

  const userDocRef = getUserDocRef(currentUser.uid);

  await setDoc(userDocRef, {
    userId: currentUser.uid,
    email: currentUser.email || '',
    missions: updatedMissions,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  console.log(`[SEIREITEI OPS] Dados salvos em /${USERS_COLLECTION}/${currentUser.uid} via setDoc.`);
}

/**
 * Opcional: Escuta em tempo real as alterações no documento /usuarios/{userId} via onSnapshot.
 */
function subscribeToUserDoc(userId, callback) {
  if (!db) return null;
  const targetUid = userId || (currentUser ? currentUser.uid : null);
  if (!targetUid) return null;

  const userDocRef = getUserDocRef(targetUid);
  return onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (typeof callback === 'function') callback(data);
    }
  }, (err) => {
    handleFirestoreError(err, "na escuta em tempo real (onSnapshot)");
  });
}

/**
 * Tratamento centralizado de erros do Cloud Firestore com mensagem amigável para 'permission-denied'.
 */
function handleFirestoreError(error, actionContext = "na operação") {
  console.error(`[SEIREITEI OPS] Falha ${actionContext}:`, error);

  const errorCode = error ? (error.code || '') : '';
  const errorMessage = error ? (error.message || '') : '';

  if (errorCode === 'permission-denied' || errorMessage.includes('permission-denied') || errorMessage.includes('insufficient permissions')) {
    const deniedMsg = `▲ [ACESSO NEGADO // PERMISSION-DENIED]:
Você não possui permissão para ler ou gravar em /${USERS_COLLECTION}/${currentUser ? currentUser.uid : '{userId}'}.
Certifique-se de que a regra do Firestore está ativa no console do Firebase:
match /usuarios/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}`;
    console.error(deniedMsg);
    alert(deniedMsg);
    updateConnectionStatus("PERMISSÃO NEGADA");
    return;
  }

  if (errorCode === 'unavailable') {
    alert("▲ [FIRESTORE INDISPONÍVEL]: O banco de dados está inacessível no momento. Verifique sua conexão à internet.");
    return;
  }

  alert(`▲ [ERRO NO BANCO]: Ocorreu uma falha ${actionContext}. Os dados foram mantidos localmente na tela.`);
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

// Toggle Completed / In Progress (Async / Firestore no documento /usuarios/{userId})
async function toggleMissionCompletion(id, triggerBtn) {
  if (!currentUser || !currentUser.uid) {
    alert("Acesso restrito: Oficial não autenticado.");
    return;
  }

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
    await saveUserMissionsToFirestore(missions);
  } catch (error) {
    handleFirestoreError(error, `ao atualizar status da missão #${id}`);
    // Reverte em caso de falha de rede/permissão
    mission.completed = prevCompleted;
    mission.category = prevCategory;
    renderMissions();
  } finally {
    if (triggerBtn) triggerBtn.disabled = false;
  }
}

// Delete Mission (Async / Firestore no documento /usuarios/{userId})
async function deleteMission(id, triggerBtn) {
  if (!currentUser || !currentUser.uid) {
    alert("Acesso restrito: Oficial não autenticado.");
    return;
  }

  const confirmExorcism = confirm(`Deseja realmente exorcizar e remover a missão #${id}?`);
  if (!confirmExorcism) return;

  const previousMissions = [...missions];
  missions = missions.filter(m => m.id !== id);
  renderMissions();

  if (triggerBtn) triggerBtn.disabled = true;

  try {
    await saveUserMissionsToFirestore(missions);
  } catch (error) {
    handleFirestoreError(error, `ao deletar a missão #${id}`);
    // Restaura lista local em caso de erro
    missions = previousMissions;
    renderMissions();
  } finally {
    if (triggerBtn) triggerBtn.disabled = false;
  }
}

// Edit Mission prompt (Async / Firestore no documento /usuarios/{userId})
async function editMissionPrompt(id, triggerBtn) {
  if (!currentUser || !currentUser.uid) {
    alert("Acesso restrito: Oficial não autenticado.");
    return;
  }

  const mission = missions.find(m => m.id === id);
  if (!mission) return;

  const newTitle = prompt('Editar título da missão espiritual:', mission.title);
  if (!newTitle || newTitle.trim() === '' || newTitle.trim() === mission.title) return;

  const prevTitle = mission.title;
  mission.title = newTitle.trim();
  renderMissions();

  if (triggerBtn) triggerBtn.disabled = true;

  try {
    await saveUserMissionsToFirestore(missions);
  } catch (error) {
    handleFirestoreError(error, `ao editar o título da missão #${id}`);
    mission.title = prevTitle;
    renderMissions();
  } finally {
    if (triggerBtn) triggerBtn.disabled = false;
  }
}

// Add New Mission (Async / Firestore no documento /usuarios/{userId})
if (missionForm) {
  missionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = taskTitleInput ? taskTitleInput.value.trim() : '';
    if (!title) return;

    // Confirmação de usuário autenticado antes de salvar
    if (!currentUser || !currentUser.uid) {
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
      userId: currentUser.uid, // Vínculo explícito com o UID do usuário autenticado
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

      // Adiciona na memória local e salva no documento do usuário /usuarios/{userId}
      missions.unshift(newMission);
      await saveUserMissionsToFirestore(missions);

      if (taskTitleInput) taskTitleInput.value = '';
      renderMissions();
    } catch (error) {
      handleFirestoreError(error, "ao salvar nova missão");
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
