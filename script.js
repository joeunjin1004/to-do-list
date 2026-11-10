// LocalStorage 키 상수
const STORAGE_KEY = 'todo_list_items';
const THEME_KEY = 'todo_list_theme';

// DOM 요소 선택
const currentDateText = document.getElementById('current-date-text');
const calendarToggleBtn = document.getElementById('calendar-toggle-btn');
const calendarModal = document.getElementById('calendar-modal');
const closeCalendarBtn = document.getElementById('close-calendar-btn');
const calendarMonthYear = document.getElementById('calendar-month-year');
const calendarDays = document.getElementById('calendar-days');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const todayBtn = document.getElementById('today-btn');
const selectedDateInfo = document.getElementById('selected-date-info');

const weatherForecastGrid = document.getElementById('weather-forecast-grid');

const todoInput = document.getElementById('todo-input');
const prioritySelect = document.getElementById('priority-select');
const addBtn = document.getElementById('add-btn');
const searchInput = document.getElementById('search-input');
const todoList = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const totalCount = document.getElementById('total-count');
const activeCount = document.getElementById('active-count');
const completedCount = document.getElementById('completed-count');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const themeToggleBtn = document.getElementById('theme-toggle');

// 상태 변수
let todos = loadTodos();
let currentFilter = 'all';
let searchQuery = '';
let draggedItemId = null;

// 달력 조회 상태
const realToday = new Date();
let currentViewDate = new Date();

// ==========================================
// 1. 오늘의 날짜 표시
// ==========================================
function renderCurrentDate() {
  const daysOfWeek = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const dayName = daysOfWeek[now.getDay()];

  if (currentDateText) {
    currentDateText.textContent = `${year}년 ${month}월 ${date}일 ${dayName}`;
  }
}

// ==========================================
// 2. 3일 날씨 예보 기능
// ==========================================
// WMO 날씨 코드 해석
function interpretWeatherCode(code) {
  if (code === 0) return { icon: '☀️', desc: '맑음' };
  if (code === 1 || code === 2) return { icon: '🌤️', desc: '대체로 맑음' };
  if (code === 3) return { icon: '☁️', desc: '흐림' };
  if (code === 45 || code === 48) return { icon: '🌫️', desc: '안개' };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { icon: '🌧️', desc: '비' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: '❄️', desc: '눈' };
  if ([95, 96, 99].includes(code)) return { icon: '⛈️', desc: '뇌우' };
  return { icon: '⛅', desc: '구름 조금' };
}

async function fetchWeatherForecast() {
  if (!weatherForecastGrid) return;

  const dayLabels = ['오늘', '내일', '모레'];

  // 기본 Fallback 데이터 (네트워크 지연/오류 시 사용)
  const fallbackForecast = [
    { label: '오늘', icon: '☀️', desc: '맑음', min: 4, max: 15, dateStr: '오늘' },
    { label: '내일', icon: '🌤️', desc: '대체로 맑음', min: 5, max: 16, dateStr: '내일' },
    { label: '모레', icon: '☁️', desc: '구름 많음', min: 6, max: 14, dateStr: '모레' },
  ];

  try {
    // 서울 위도/경도 기본값으로 3일치 예보 조회
    const lat = 37.5665;
    const lon = 126.9780;
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4초 타임아웃

    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('날씨 API 응답 실패');

    const data = await response.json();
    const daily = data.daily;

    const forecastList = [];
    for (let i = 0; i < 3; i++) {
      const code = daily.weathercode[i];
      const weather = interpretWeatherCode(code);
      const maxTemp = Math.round(daily.temperature_2m_max[i]);
      const minTemp = Math.round(daily.temperature_2m_min[i]);
      const dateParts = daily.time[i].split('-'); // "2026-11-10"
      const dateStr = `${parseInt(dateParts[1])}.${parseInt(dateParts[2])}`;

      forecastList.push({
        label: `${dayLabels[i]} (${dateStr})`,
        icon: weather.icon,
        desc: weather.desc,
        min: minTemp,
        max: maxTemp,
        isToday: i === 0,
      });
    }

    renderWeatherCards(forecastList);
  } catch (error) {
    console.warn('실시간 날씨 로딩 실패, 기본 예보 데이터를 표시합니다:', error);
    renderWeatherCards(fallbackForecast);
  }
}

function renderWeatherCards(forecast) {
  weatherForecastGrid.innerHTML = '';
  forecast.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = `weather-day-card ${index === 0 ? 'today' : ''}`;
    card.innerHTML = `
      <span class="weather-day-label">${item.label}</span>
      <span class="weather-icon">${item.icon}</span>
      <span class="weather-desc">${item.desc}</span>
      <span class="weather-temps">
        <span class="temp-min">${item.min}°</span> / <span class="temp-max">${item.max}°</span>
      </span>
    `;
    weatherForecastGrid.appendChild(card);
  });
}

// ==========================================
// 3. 월별 달력 (Monthly Calendar) 모달 기능
// ==========================================
function renderCalendar(date) {
  if (!calendarDays || !calendarMonthYear) return;

  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed

  calendarMonthYear.textContent = `${year}년 ${month + 1}월`;

  // 이번 달 1일의 요일 (0: 일, 1: 월, ...)
  const firstDayIndex = new Date(year, month, 1).getDay();
  // 이번 달 마지막 날짜
  const lastDate = new Date(year, month + 1, 0).getDate();
  // 지난 달 마지막 날짜
  const prevLastDate = new Date(year, month, 0).getDate();

  calendarDays.innerHTML = '';

  // 1. 이전 달 잔여 날짜들
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = prevLastDate - i;
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell other-month';
    cell.textContent = day;
    calendarDays.appendChild(cell);
  }

  // 2. 이번 달 날짜들
  for (let day = 1; day <= lastDate; day++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';
    cell.textContent = day;

    const currentDayOfWeek = new Date(year, month, day).getDay();
    if (currentDayOfWeek === 0) cell.classList.add('sun');
    if (currentDayOfWeek === 6) cell.classList.add('sat');

    // 오늘 날짜 여부 체크
    if (
      year === realToday.getFullYear() &&
      month === realToday.getMonth() &&
      day === realToday.getDate()
    ) {
      cell.classList.add('is-today');
      cell.title = '오늘';
    }

    // 날짜 클릭 이벤트
    cell.addEventListener('click', () => {
      document.querySelectorAll('.calendar-day-cell').forEach((c) => c.classList.remove('selected'));
      cell.classList.add('selected');

      const daysOfWeek = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
      const dayName = daysOfWeek[currentDayOfWeek];
      selectedDateInfo.textContent = `선택한 날짜: ${year}년 ${month + 1}월 ${day}일 (${dayName})`;
    });

    calendarDays.appendChild(cell);
  }

  // 3. 다음 달 채우기 (총 35칸 또는 42칸에 맞추어 깔끔한 그리드 유지)
  const totalCells = firstDayIndex + lastDate;
  const nextDays = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;

  for (let j = 1; j <= nextDays; j++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell other-month';
    cell.textContent = j;
    calendarDays.appendChild(cell);
  }
}

// 달력 열기/닫기 이벤트
if (calendarToggleBtn) {
  calendarToggleBtn.addEventListener('click', () => {
    currentViewDate = new Date();
    renderCalendar(currentViewDate);
    selectedDateInfo.textContent = `오늘 날짜를 클릭하여 확인할 수 있습니다.`;
    calendarModal.style.display = 'flex';
  });
}

if (closeCalendarBtn) {
  closeCalendarBtn.addEventListener('click', () => {
    calendarModal.style.display = 'none';
  });
}

// 모달 바깥 영역 클릭 시 닫기
if (calendarModal) {
  calendarModal.addEventListener('click', (e) => {
    if (e.target === calendarModal) {
      calendarModal.style.display = 'none';
    }
  });
}

// 이전 달 / 다음 달 / 오늘 이동
if (prevMonthBtn) {
  prevMonthBtn.addEventListener('click', () => {
    currentViewDate.setMonth(currentViewDate.getMonth() - 1);
    renderCalendar(currentViewDate);
  });
}

if (nextMonthBtn) {
  nextMonthBtn.addEventListener('click', () => {
    currentViewDate.setMonth(currentViewDate.getMonth() + 1);
    renderCalendar(currentViewDate);
  });
}

if (todayBtn) {
  todayBtn.addEventListener('click', () => {
    currentViewDate = new Date();
    renderCalendar(currentViewDate);
  });
}

// ==========================================
// 4. 테마 관리 (다크 모드)
// ==========================================
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

// 우선순위 텍스트 및 클래스 반환
function getPriorityMeta(priority) {
  switch (priority) {
    case 'urgent':
      return { label: '긴급 🚨', className: 'badge-urgent' };
    case 'high':
      return { label: '중요 🔥', className: 'badge-high' };
    case 'medium':
    default:
      return { label: '보통', className: 'badge-medium' };
  }
}

// 완료 축하 폭죽(Confetti) 효과
function triggerConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  for (let i = 0; i < 45; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.35,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * -7 - 3,
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      rotation: Math.random() * 360,
      vRotation: (Math.random() - 0.5) * 10,
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
      p.rotation += p.vRotation;
      p.alpha -= 0.015;

      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    if (alive) {
      requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(animate);
}

// 5. LocalStorage 관리
function loadTodos() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('LocalStorage 데이터를 읽는 중 오류가 발생했습니다:', error);
    return [];
  }
}

function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (error) {
    console.error('LocalStorage에 저장하는 중 오류가 발생했습니다:', error);
  }
}

// 6. 통계, 진행률 및 빈 상태 UI 업데이트
function updateStatsAndEmptyState(filteredTodosCount) {
  const total = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  const active = total - completed;

  totalCount.textContent = total;
  activeCount.textContent = active;
  completedCount.textContent = completed;

  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  if (progressFill) progressFill.style.width = `${percentage}%`;
  if (progressText) {
    progressText.textContent = `${percentage}%`;
    if (percentage === 100 && total > 0) {
      progressText.textContent = `100% 완료! 🏆`;
    }
  }

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

// 7. 할 일 목록 화면 렌더링
function renderTodos() {
  todoList.innerHTML = '';

  const filteredTodos = todos.filter((todo) => {
    if (currentFilter === 'active' && todo.completed) return false;
    if (currentFilter === 'completed' && !todo.completed) return false;
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

    // 드래그 앤 드롭
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

    // 본문 컨테이너
    const content = document.createElement('div');
    content.className = 'todo-content';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = todo.completed;

    const details = document.createElement('div');
    details.className = 'todo-details';

    const titleRow = document.createElement('div');
    titleRow.className = 'todo-title-row';

    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = todo.text;
    span.title = '더블 클릭하여 수정할 수 있습니다';

    const priorityMeta = getPriorityMeta(todo.priority || 'medium');
    const badge = document.createElement('span');
    badge.className = `priority-badge ${priorityMeta.className}`;
    badge.textContent = priorityMeta.label;

    titleRow.appendChild(badge);
    titleRow.appendChild(span);

    const dateSpan = document.createElement('span');
    dateSpan.className = 'todo-date';
    dateSpan.textContent = todo.createdAt ? formatDate(todo.createdAt) : '';

    details.appendChild(titleRow);
    if (todo.createdAt) {
      details.appendChild(dateSpan);
    }

    checkbox.addEventListener('change', () => {
      toggleTodo(todo.id);
    });

    span.addEventListener('click', () => {
      toggleTodo(todo.id);
    });

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

    function enterEditMode() {
      if (li.classList.contains('editing')) return;
      li.classList.add('editing');
      li.setAttribute('draggable', 'false');

      const editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.className = 'edit-input';
      editInput.value = todo.text;

      titleRow.replaceChild(editInput, span);
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

// 8. 할 일 추가
function addTodo() {
  const text = todoInput.value.trim();

  if (text === '') {
    alert('할 일을 입력해주세요!');
    todoInput.focus();
    return;
  }

  const priority = prioritySelect ? prioritySelect.value : 'medium';

  const newTodo = {
    id: Date.now().toString(),
    text: text,
    priority: priority,
    completed: false,
    createdAt: Date.now(),
  };

  todos.unshift(newTodo);
  saveTodos();
  renderTodos();

  todoInput.value = '';
  todoInput.focus();
}

// 9. 할 일 완료/미완료 토글
function toggleTodo(id) {
  let isNowCompleted = false;

  todos = todos.map((todo) => {
    if (todo.id === id) {
      const nextState = !todo.completed;
      if (nextState) isNowCompleted = true;
      return { ...todo, completed: nextState };
    }
    return todo;
  });

  saveTodos();
  renderTodos();

  if (isNowCompleted) {
    triggerConfetti();
  }
}

// 10. 할 일 내용 수정
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

// 11. 할 일 삭제
function deleteTodo(id) {
  todos = todos.filter((todo) => todo.id !== id);
  saveTodos();
  renderTodos();
}

// 12. 완료된 항목 일괄 삭제
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

// 검색창 입력 이벤트
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
renderCurrentDate();
fetchWeatherForecast();
initTheme();
renderTodos();
