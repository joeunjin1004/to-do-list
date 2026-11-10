// LocalStorage 키 상수
const STORAGE_KEY = 'todo_list_items';
const THEME_KEY = 'todo_list_theme';

// DOM 요소 선택
const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const searchInput = document.getElementById('search-input');
const todoList = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const totalCount = document.getElementById('total-count');
const activeCount = document.getElementById('active-count');
const completedCount = document.getElementById('completed-count');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const themeToggleBtn = document.getElementById('theme-toggle');

// 상태 변수
let todos = loadTodos();
let currentFilter = 'all';
let searchQuery = '';
let draggedItemId = null;

// --- 테마 관리 ---
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    if (themeToggleBtn) themeToggleBtn.textContent = '☀️';
  } else {
    document.body.classList.remove('dark-mode');
    if (themeToggleBtn) themeToggleBtn.textContent = '🌙';
  }
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  if (themeToggleBtn) {
    themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
  }
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', toggleTheme);
}

// 날짜 포맷 함수
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}월 ${day}일 ${hours}:${minutes}`;
}

// 1. LocalStorage에서 불러오기
function loadTodos() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('LocalStorage 데이터를 읽는 중 오류가 발생했습니다:', error);
    return [];
  }
}

// 2. LocalStorage에 저장하기
function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (error) {
    console.error('LocalStorage에 저장하는 중 오류가 발생했습니다:', error);
  }
}

// 3. 통계 및 빈 상태 UI 업데이트
function updateStatsAndEmptyState(filteredTodosCount) {
  const total = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  const active = total - completed;

  totalCount.textContent = total;
  activeCount.textContent = active;
  completedCount.textContent = completed;

  if (total === 0) {
    emptyState.textContent = '등록된 할 일이 없습니다. 새로운 할 일을 추가해보세요!';
    emptyState.style.display = 'block';
  } else if (filteredTodosCount === 0) {
    if (searchQuery.trim() !== '') {
      emptyState.textContent = `'${searchQuery}'에 대한 검색 결과가 없습니다.`;
    } else if (currentFilter === 'active') {
      emptyState.textContent = '진행 중인 할 일이 없습니다. 모두 완료했습니다! 🎉';
    } else if (currentFilter === 'completed') {
      emptyState.textContent = '완료된 할 일이 아직 없습니다.';
    }
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
  }
}

// 4. 할 일 목록 화면 렌더링
function renderTodos() {
  todoList.innerHTML = '';

  // 필터 및 검색어 적용
  const filteredTodos = todos.filter((todo) => {
    // 상태 필터링
    if (currentFilter === 'active' && todo.completed) return false;
    if (currentFilter === 'completed' && !todo.completed) return false;

    // 검색어 필터링
    if (searchQuery.trim() !== '') {
      return todo.text.toLowerCase().includes(searchQuery.toLowerCase());
    }

    return true;
  });

  filteredTodos.forEach((todo) => {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    li.dataset.id = todo.id;
    li.setAttribute('draggable', 'true');

    // 드래그 앤 드롭 이벤트 등록
    li.addEventListener('dragstart', (e) => {
      draggedItemId = todo.id;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      draggedItemId = null;
      document.querySelectorAll('.todo-item').forEach((item) => {
        item.classList.remove('drag-over');
      });
    });

    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (draggedItemId && draggedItemId !== todo.id) {
        li.classList.add('drag-over');
      }
    });

    li.addEventListener('dragleave', () => {
      li.classList.remove('drag-over');
    });

    li.addEventListener('drop', (e) => {
      e.preventDefault();
      li.classList.remove('drag-over');

      if (!draggedItemId || draggedItemId === todo.id) return;

      const fromIndex = todos.findIndex((t) => t.id === draggedItemId);
      const toIndex = todos.findIndex((t) => t.id === todo.id);

      if (fromIndex !== -1 && toIndex !== -1) {
        const [movedItem] = todos.splice(fromIndex, 1);
        todos.splice(toIndex, 0, movedItem);
        saveTodos();
        renderTodos();
      }
    });

    // 본문 컨테이너 (체크박스 + 텍스트 & 날짜)
    const content = document.createElement('div');
    content.className = 'todo-content';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = todo.completed;

    const details = document.createElement('div');
    details.className = 'todo-details';

    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = todo.text;
    span.title = '더블 클릭하여 수정할 수 있습니다';

    const dateSpan = document.createElement('span');
    dateSpan.className = 'todo-date';
    dateSpan.textContent = todo.createdAt ? formatDate(todo.createdAt) : '';

    details.appendChild(span);
    if (todo.createdAt) {
      details.appendChild(dateSpan);
    }

    // 체크박스 클릭
    checkbox.addEventListener('change', () => {
      toggleTodo(todo.id);
    });

    // 텍스트 클릭 시 완료 토글
    span.addEventListener('click', () => {
      toggleTodo(todo.id);
    });

    // 버튼 그룹 (수정 / 삭제)
    const actions = document.createElement('div');
    actions.className = 'todo-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = '수정';
    editBtn.type = 'button';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '삭제';
    deleteBtn.type = 'button';

    // 인라인 수정 모드 진입
    function enterEditMode() {
      if (li.classList.contains('editing')) return;
      li.classList.add('editing');
      li.setAttribute('draggable', 'false'); // 수정 중에는 드래그 방지

      const editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.className = 'edit-input';
      editInput.value = todo.text;

      details.replaceChild(editInput, span);
      editInput.focus();

      let isSaved = false;

      function handleSave() {
        if (isSaved) return;
        isSaved = true;

        const updatedText = editInput.value.trim();
        if (updatedText === '') {
          alert('할 일 내용을 입력해주세요.');
          isSaved = false;
          editInput.focus();
          return;
        }

        updateTodoText(todo.id, updatedText);
      }

      function handleCancel() {
        if (isSaved) return;
        isSaved = true;
        renderTodos();
      }

      editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') handleCancel();
      });

      editInput.addEventListener('blur', handleSave);
    }

    span.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      enterEditMode();
    });

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      enterEditMode();
    });

    deleteBtn.addEventListener('click', () => {
      deleteTodo(todo.id);
    });

    content.appendChild(checkbox);
    content.appendChild(details);

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(content);
    li.appendChild(actions);

    todoList.appendChild(li);
  });

  updateStatsAndEmptyState(filteredTodos.length);
}

// 5. 할 일 추가
function addTodo() {
  const text = todoInput.value.trim();

  if (text === '') {
    alert('할 일을 입력해주세요!');
    todoInput.focus();
    return;
  }

  const newTodo = {
    id: Date.now().toString(),
    text: text,
    completed: false,
    createdAt: Date.now(),
  };

  todos.unshift(newTodo);
  saveTodos();
  renderTodos();

  todoInput.value = '';
  todoInput.focus();
}

// 6. 할 일 완료/미완료 토글
function toggleTodo(id) {
  todos = todos.map((todo) => {
    if (todo.id === id) {
      return { ...todo, completed: !todo.completed };
    }
    return todo;
  });
  saveTodos();
  renderTodos();
}

// 7. 할 일 내용 수정
function updateTodoText(id, newText) {
  todos = todos.map((todo) => {
    if (todo.id === id) {
      return { ...todo, text: newText };
    }
    return todo;
  });
  saveTodos();
  renderTodos();
}

// 8. 할 일 삭제
function deleteTodo(id) {
  todos = todos.filter((todo) => todo.id !== id);
  saveTodos();
  renderTodos();
}

// 9. 완료된 항목 일괄 삭제
clearCompletedBtn.addEventListener('click', () => {
  const completedCount = todos.filter((t) => t.completed).length;

  if (completedCount === 0) {
    alert('삭제할 완료 항목이 없습니다.');
    return;
  }

  if (confirm(`완료된 항목 ${completedCount}개를 모두 삭제하시겠습니까?`)) {
    todos = todos.filter((t) => !t.completed);
    saveTodos();
    renderTodos();
  }
});

// 검색창 입력 이벤트 (실시간 필터링)
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderTodos();
  });
}

// 이벤트 리스너 등록
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addTodo();
  }
});

filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTodos();
  });
});

// 초기 실행
initTheme();
renderTodos();
