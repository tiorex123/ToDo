// Seleção dos elementos do DOM
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');
const dateDisplay = document.getElementById('date-display');
const counter = document.getElementById('counter');
const clearCompletedBtn = document.getElementById('clear-completed');
const filterBtns = document.querySelectorAll('.filter-btn');

// Estado da aplicação
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let currentFilter = 'all';

// Exibir data formatada
function displayCurrentDate() {
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  const today = new Date();
  dateDisplay.textContent = today.toLocaleDateString('pt-BR', options);
}

// Salvar no LocalStorage
function saveTodos() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

// Atualizar contador de pendências
function updateCounter() {
  const pendingCount = todos.filter(t => !t.completed).length;
  counter.textContent = `${pendingCount} tarefa${pendingCount !== 1 ? 's' : ''} restante${pendingCount !== 1 ? 's' : ''}`;
}

// Renderizar lista de tarefas
function renderTodos() {
  todoList.innerHTML = '';

  const filteredTodos = todos.filter(todo => {
    if (currentFilter === 'pending') return !todo.completed;
    if (currentFilter === 'completed') return todo.completed;
    return true;
  });

  if (filteredTodos.length === 0) {
    const emptyMsg = document.createElement('li');
    emptyMsg.className = 'empty-msg';
    emptyMsg.textContent = 'Nenhuma tarefa encontrada.';
    todoList.appendChild(emptyMsg);
  } else {
    filteredTodos.forEach(todo => {
      const li = document.createElement('li');
      li.className = `todo-item ${todo.completed ? 'completed' : ''}`;

      const contentDiv = document.createElement('div');
      contentDiv.className = 'todo-content';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-checkbox';
      checkbox.checked = todo.completed;
      checkbox.addEventListener('change', () => toggleTodo(todo.id));

      const span = document.createElement('span');
      span.className = 'todo-text';
      span.textContent = todo.text;
      contentDiv.addEventListener('click', (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          toggleTodo(todo.id);
        }
      });

      contentDiv.appendChild(checkbox);
      contentDiv.appendChild(span);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.setAttribute('aria-label', 'Remover tarefa');
      deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      `;
      deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

      li.appendChild(contentDiv);
      li.appendChild(deleteBtn);
      todoList.appendChild(li);
    });
  }

  updateCounter();
}

// Adicionar tarefa
function addTodo(text) {
  const newTodo = {
    id: Date.now(),
    text: text.trim(),
    completed: false
  };

  todos.unshift(newTodo);
  saveTodos();
  renderTodos();
}

// Alternar status da tarefa
function toggleTodo(id) {
  todos = todos.map(todo => {
    if (todo.id === id) {
      return { ...todo, completed: !todo.completed };
    }
    return todo;
  });
  saveTodos();
  renderTodos();
}

// Remover tarefa
function deleteTodo(id) {
  todos = todos.filter(todo => todo.id !== id);
  saveTodos();
  renderTodos();
}

// Limpar concluídas
function clearCompleted() {
  todos = todos.filter(todo => !todo.completed);
  saveTodos();
  renderTodos();
}

// Event Listeners
todoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = todoInput.value;
  if (text.trim() !== '') {
    addTodo(text);
    todoInput.value = '';
    todoInput.focus();
  }
});

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTodos();
  });
});

clearCompletedBtn.addEventListener('click', clearCompleted);

// Inicialização
displayCurrentDate();
renderTodos();
