/* ── State ── */
const state = {
  goals: { cals: 2000, protein: 150, carbs: 200, fat: 65 },
  meals: [],
};

/* ── DOM refs ── */
const $ = (id) => document.getElementById(id);

/* ── Dates ── */
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function initDates() {
  const today = todayStr();
  $('header-date').textContent = formatDate(today);
  $('sidebar-date').textContent = formatDate(today);
}

/* ── Totals ── */
function todayMeals() {
  return state.meals
    .map((meal, index) => ({ meal, index }))
    .filter(({ meal }) => meal.date === todayStr());
}

function totals() {
  return todayMeals().reduce(
    (acc, entry) => ({
      cals: acc.cals + entry.meal.cals,
      protein: acc.protein + entry.meal.protein,
      carbs: acc.carbs + entry.meal.carbs,
      fat: acc.fat + entry.meal.fat,
    }),
    { cals: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/* ── Update dashboard ── */
function update() {
  const t = totals();
  const g = state.goals;

  /* Stat cards */
  $('m-cals').textContent = Math.round(t.cals);
  $('m-protein').textContent = Math.round(t.protein);
  $('m-carbs').textContent = Math.round(t.carbs);
  $('m-fat').textContent = Math.round(t.fat);

  /* Calorie delta */
  const calDelta = g.cals - t.cals;
  const calEl = $('m-cals-delta');
  if (g.cals > 0) {
    calEl.textContent =
      calDelta >= 0
        ? `${Math.round(calDelta)} kcal remaining`
        : `${Math.round(Math.abs(calDelta))} kcal over goal`;
    calEl.className = 'stat-delta ' + (calDelta >= 0 ? 'deficit' : 'surplus');
  } else {
    calEl.textContent = '';
  }

  /* Protein delta */
  const protDelta = g.protein - t.protein;
  const protEl = $('m-protein-delta');
  if (g.protein > 0) {
    protEl.textContent =
      protDelta >= 0
        ? `${Math.round(protDelta)}g remaining`
        : `${Math.round(Math.abs(protDelta))}g over goal`;
    protEl.className = 'stat-delta ' + (protDelta >= 0 ? 'deficit' : 'surplus');
  } else {
    protEl.textContent = '';
  }

  /* Progress bars */
  updateBar('p-cals', 'p-cals-label', t.cals, g.cals, 'kcal', 'blue');
  updateBar('p-prot', 'p-prot-label', t.protein, g.protein, 'g', 'green');
  updateBar('p-carb', 'p-carb-label', t.carbs, g.carbs, 'g', 'amber');
  updateBar('p-fat', 'p-fat-label', t.fat, g.fat, 'g', 'pink');

  updateGoalInputs();
  renderMeals();
  renderHistory();
}

function updateBar(barId, labelId, current, goal, unit, color) {
  const bar = $(barId);
  const label = $(labelId);
  const pct = goal > 0 ? Math.min(Math.round((current / goal) * 100), 100) : 0;
  const over = goal > 0 && current > goal;

  bar.style.width = pct + '%';
  bar.dataset.color = over ? 'red' : color;

  label.textContent =
    goal > 0
      ? `${Math.round(current)} / ${goal} ${unit}`
      : `${Math.round(current)} ${unit}`;
}

function getDailySummaries() {
  const grouped = state.meals.reduce((acc, meal) => {
    const date = meal.date || todayStr();
    if (!acc[date]) {
      acc[date] = { date, cals: 0, protein: 0, carbs: 0, fat: 0 };
    }
    acc[date].cals += meal.cals;
    acc[date].protein += meal.protein;
    acc[date].carbs += meal.carbs;
    acc[date].fat += meal.fat;
    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
}

function renderHistory() {
  const history = getDailySummaries();
  const chartData = history.slice(-14);
  renderCalorieChart(chartData);
  renderHistoryList(history.slice(-7).reverse());
  const goalLabel = $('history-goal-label');
  if (goalLabel) goalLabel.textContent = `${Math.round(state.goals.cals)} kcal`;

  const avgEl = $('daily-average');
  const statusEl = $('average-status');
  const average = calculateAverageCalories(history.slice(-7));
  if (avgEl) avgEl.textContent = `${average} kcal`;
  if (statusEl) {
    const diff = Math.round(average - state.goals.cals);
    if (diff <= 0) {
      statusEl.textContent = `${Math.abs(diff)} below goal`;
      statusEl.style.color = 'var(--green)';
    } else {
      statusEl.textContent = `${diff} above goal`;
      statusEl.style.color = 'var(--red)';
    }
  }
}

function calculateAverageCalories(entries) {
  if (!entries.length) return 0;
  const total = entries.reduce((sum, entry) => sum + entry.cals, 0);
  return Math.round(total / entries.length);
}

function renderCalorieChart(entries) {
  const svg = document.getElementById('calories-chart');
  if (!svg) return;

  const width = 600;
  const height = 220;
  const padding = 40;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const maxValue = Math.max(
    state.goals.cals,
    ...entries.map((entry) => entry.cals),
    1200
  );
  const count = Math.max(entries.length, 1);
  const barWidth = Math.max(12, innerWidth / count - 14);

  const points = entries.map((entry, index) => {
    const x = padding + index * (innerWidth / count) + (innerWidth / count) / 2;
    const y = padding + innerHeight - (entry.cals / maxValue) * innerHeight;
    return { x, y, value: Math.round(entry.cals), label: entry.date };
  });

  const goalY = padding + innerHeight - (state.goals.cals / maxValue) * innerHeight;

  let svgContent = `<rect x="0" y="0" width="${width}" height="${height}" fill="transparent"></rect>`;
  svgContent += `<line x1="${padding}" y1="${goalY}" x2="${width - padding}" y2="${goalY}" stroke="var(--green)" stroke-width="1" stroke-dasharray="4 4" />`;
  svgContent += `<text x="${width - padding}" y="${goalY - 8}" text-anchor="end" font-size="11" fill="var(--text-secondary)">goal</text>`;

  points.forEach((point, index) => {
    const x0 = padding + index * (innerWidth / count) + (innerWidth / count - barWidth) / 2;
    const barHeight = innerHeight - (point.value / maxValue) * innerHeight;
    const y0 = padding + innerHeight - barHeight;
    svgContent += `<rect x="${x0}" y="${y0}" width="${barWidth}" height="${barHeight}" fill="var(--blue)" rx="4"/>`;
    svgContent += `<text x="${point.x}" y="${height - 10}" text-anchor="middle" font-size="11" fill="var(--text-secondary)">${point.label.slice(5)}</text>`;
  });

  points.forEach((point) => {
    svgContent += `<circle cx="${point.x}" cy="${point.y}" r="4" fill="var(--green)"/>`;
  });

  if (points.length > 1) {
    const linePath = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
    svgContent += `<path d="${linePath}" fill="none" stroke="var(--green)" stroke-width="2" />`;
  }

  svg.innerHTML = svgContent;
}

function renderHistoryList(entries) {
  const container = document.getElementById('history-list');
  if (!container) return;

  if (!entries.length) {
    container.innerHTML = '<div class="history-empty">Add meals to see your calorie history.</div>';
    return;
  }

  container.innerHTML = entries
    .map((entry) => {
      const diff = Math.round(entry.cals - state.goals.cals);
      const status = diff <= 0 ? `${Math.abs(diff)} kcal under` : `${diff} kcal over`;
      const statusColor = diff <= 0 ? 'var(--green)' : 'var(--red)';
      return `
        <div class="history-item">
          <div class="history-meta">
            <strong>${entry.date}</strong>
            <small>${entry.protein}g P · ${entry.carbs}g C · ${entry.fat}g F</small>
          </div>
          <div class="history-value" style="color: ${statusColor};">
            ${entry.cals} kcal<br />
            <small>${status}</small>
          </div>
        </div>`;
    })
    .join('');
}

const STORAGE_KEY = 'macro-tracker-state';

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Local storage unavailable or corrupt:', err);
    return null;
  }
}

function saveLocalState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Could not save to local storage:', err);
  }
}

let midnightResetTimer = null;

async function loadState() {
  const localData = loadLocalState();
  if (localData && typeof localData === 'object') {
    if (Array.isArray(localData.meals)) state.meals = localData.meals;
    if (localData.goals && typeof localData.goals === 'object') state.goals = localData.goals;
  }

  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      const remote = await res.json();
      if (remote.goals) state.goals = remote.goals;
      if (Array.isArray(remote.meals)) state.meals = remote.meals;
      saveLocalState();
    }
  } catch (err) {
    console.warn('Could not load server state:', err);
  }
}

async function saveState() {
  saveLocalState();
  try {
    await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
  } catch (err) {
    console.warn('Could not save server state:', err);
  }
}

function openSidebar() {
  document.body.classList.add('sidebar-open');
}

function closeSidebar() {
  document.body.classList.remove('sidebar-open');
}

function getMsUntilNextMidnight() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

function scheduleMidnightReset() {
  if (midnightResetTimer) clearTimeout(midnightResetTimer);
  midnightResetTimer = setTimeout(() => {
    onNewDay();
    scheduleMidnightReset();
  }, getMsUntilNextMidnight());
}

function onNewDay() {
  initDates();
  update();
  toast('It is a new day — your log has reset.');
}

function updateGoalInputs() {
  const goals = state.goals;
  if ($('g-cals')) $('g-cals').value = goals.cals;
  if ($('g-protein')) $('g-protein').value = goals.protein;
  if ($('g-carbs')) $('g-carbs').value = goals.carbs;
  if ($('g-fat')) $('g-fat').value = goals.fat;
}

/* ── Render meal log ── */
function renderMeals() {
  const container = $('log-list');
  const meals = todayMeals();

  if (meals.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 2l1.5 1.5M21 2l-1.5 1.5M12 8v4M8 3h8M7 3C5 5 4 7 4 10c0 4.418 3.582 8 8 8s8-3.582 8-8c0-3-1-5-3-7"/>
          <path d="M9 21h6M12 18v3"/>
        </svg>
        <p>No meals logged for today.<br>Head to <strong>Log meal</strong> to get started.</p>
      </div>`;
    return;
  }

  container.innerHTML = meals
    .map(({ meal: m, index }) => {
      const extras = [
        m.fiber ? `Fiber ${m.fiber}g` : '',
        m.sugar ? `Sugar ${m.sugar}g` : '',
      ]
        .filter(Boolean)
        .join(' · ');

      return `
      <div class="meal-item">
        <div class="meal-info">
          <div class="meal-name">${escHtml(m.name)}</div>
          <div class="meal-macros">P ${m.protein}g · C ${m.carbs}g · F ${m.fat}g${extras ? ' · ' + extras : ''}</div>
        </div>
        <div class="meal-right">
          <span class="meal-cals">${m.cals} kcal</span>
          <button class="meal-delete" data-index="${index}" aria-label="Remove ${escHtml(m.name)}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>`;
    })
    .join('');

  container.querySelectorAll('.meal-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      state.meals.splice(idx, 1);
      update();
      saveState();
    });
  });
}

/* ── Add meal ── */
function addMeal() {
  const name = $('f-name').value.trim();
  const cals = parseFloat($('f-cals').value) || 0;
  const protein = parseFloat($('f-protein').value) || 0;
  const carbs = parseFloat($('f-carbs').value) || 0;
  const fat = parseFloat($('f-fat').value) || 0;
  const fiber = parseFloat($('f-fiber').value) || 0;
  const sugar = parseFloat($('f-sugar').value) || 0;

  if (!name && cals === 0) {
    toast('Enter a name or calories first.');
    return;
  }

  state.meals.push({
    date: todayStr(),
    name: name || 'Unnamed meal',
    cals,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
  });

  ['f-name', 'f-cals', 'f-protein', 'f-carbs', 'f-fat', 'f-fiber', 'f-sugar'].forEach(
    (id) => ($(id).value = '')
  );

  update();
  saveState();
  showTab('today');
  toast('Meal added');
}

/* ── Save goals ── */
function saveGoals() {
  state.goals.cals = parseFloat($('g-cals').value) || state.goals.cals;
  state.goals.protein = parseFloat($('g-protein').value) || state.goals.protein;
  state.goals.carbs = parseFloat($('g-carbs').value) || state.goals.carbs;
  state.goals.fat = parseFloat($('g-fat').value) || state.goals.fat;
  update();
  saveState();
  showTab('today');
  toast('Goals saved');
}

/* ── CSV export ── */
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportMeals() {
  if (!state.meals.length) {
    toast('No meals to export.');
    return;
  }
  const header = 'date,name,calories,protein,carbs,fat,fiber,sugar\n';
  const rows = state.meals
    .map((m) =>
      [
        m.date,
        `"${String(m.name).replace(/"/g, '""')}"`,
        m.cals,
        m.protein,
        m.carbs,
        m.fat,
        m.fiber || 0,
        m.sugar || 0,
      ].join(',')
    )
    .join('\n');
  downloadCSV(header + rows, `meals-${todayStr()}.csv`);
  toast('Meals exported');
}

function exportGoals() {
  const header = 'calories_goal,protein_goal,carbs_goal,fat_goal\n';
  const row = [state.goals.cals, state.goals.protein, state.goals.carbs, state.goals.fat].join(',');
  downloadCSV(header + row, 'goals.csv');
  toast('Goals exported');
}

/* ── CSV import ── */
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const vals = [];
    let cur = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        vals.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    vals.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => (obj[h] = vals[i] || ''));
    return obj;
  });
}

function importMeals(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const rows = parseCSV(e.target.result);
      state.meals = rows.map((r) => ({
        date: r.date || todayStr(),
        name: r.name || 'Unnamed',
        cals: parseFloat(r.calories) || 0,
        protein: parseFloat(r.protein) || 0,
        carbs: parseFloat(r.carbs) || 0,
        fat: parseFloat(r.fat) || 0,
        fiber: parseFloat(r.fiber) || 0,
        sugar: parseFloat(r.sugar) || 0,
      }));
      update();
      saveState();
      showTab('today');
      toast(`${state.meals.length} meal${state.meals.length !== 1 ? 's' : ''} imported`);
    } catch {
      toast('Could not read CSV — check the format.');
    }
  };
  reader.readAsText(file);
}

function importGoals(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const rows = parseCSV(e.target.result);
      if (rows.length) {
        const r = rows[0];
        state.goals.cals = parseFloat(r.calories_goal) || state.goals.cals;
        state.goals.protein = parseFloat(r.protein_goal) || state.goals.protein;
        state.goals.carbs = parseFloat(r.carbs_goal) || state.goals.carbs;
        state.goals.fat = parseFloat(r.fat_goal) || state.goals.fat;
        update();
        saveState();
        toast('Goals imported');
      }
    } catch {
      toast('Could not read CSV — check the format.');
    }
  };
  reader.readAsText(file);
}

/* ── Tab navigation ── */
function showTab(name) {
  document.querySelectorAll('.tab').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach((el) => el.classList.remove('active'));
  const tab = document.getElementById('tab-' + name);
  if (tab) tab.classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-tab="${name}"]`);
  if (btn) btn.classList.add('active');
}

/* ── Toast ── */
let toastTimer = null;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ── Helpers ── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Wire up events ── */
async function init() {
  await loadState();
  initDates();
  update();
  scheduleMidnightReset();

  /* Nav */
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });

  const toggleButton = $('sidebar-toggle-btn');
  const closeButton = $('sidebar-close-btn');
  if (toggleButton) toggleButton.addEventListener('click', openSidebar);
  if (closeButton) closeButton.addEventListener('click', closeSidebar);

  /* Log meal */
  $('add-meal-btn').addEventListener('click', addMeal);
  $('f-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addMeal();
  });

  /* Goals */
  $('save-goals-btn').addEventListener('click', saveGoals);

  /* Export */
  $('export-meals-btn').addEventListener('click', exportMeals);
  $('export-goals-btn').addEventListener('click', exportGoals);

  /* Import */
  $('import-meals-input').addEventListener('change', (e) => {
    importMeals(e.target.files[0]);
    e.target.value = '';
  });
  $('import-goals-input').addEventListener('change', (e) => {
    importGoals(e.target.files[0]);
    e.target.value = '';
  });
}

document.addEventListener('DOMContentLoaded', init);
