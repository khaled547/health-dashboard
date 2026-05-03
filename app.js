/* ============================================================
   HealthDash Pro — Full app.js
   HTML matched version
============================================================ */

/* ---------- Safe Local Storage ---------- */
window.Store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem("hd-" + key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem("hd-" + key, JSON.stringify(value));
    } catch {}
  },
  remove(key) {
    try {
      localStorage.removeItem("hd-" + key);
    } catch {}
  },
};

/* ---------- Helpers ---------- */
function $(id) {
  return document.getElementById(id);
}

function escapeHtml(str = "") {
  return String(str).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

function toast(message, type = "success") {
  const box = $("toastContainer");
  if (!box) return;

  const item = document.createElement("div");
  item.className = `toast toast-${type}`;
  item.textContent = message;
  box.appendChild(item);

  setTimeout(() => item.classList.add("show"), 20);
  setTimeout(() => {
    item.classList.remove("show");
    setTimeout(() => item.remove(), 300);
  }, 2500);
}

/* ---------- Loading Screen ---------- */
window.addEventListener("load", () => {
  setTimeout(() => {
    const loader = $("loadingScreen");
    if (!loader) return;

    loader.style.opacity = "0";
    loader.style.pointerEvents = "none";

    setTimeout(() => {
      loader.style.display = "none";
    }, 450);
  }, 700);
});

/* ---------- Clock ---------- */
function updateClock() {
  const now = new Date();

  const clock = $("clock");
  const date = $("dateDisplay");

  if (clock) clock.textContent = now.toLocaleTimeString();
  if (date) {
    date.textContent = now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
}

updateClock();
setInterval(updateClock, 1000);

/* ---------- Theme ---------- */
function applyTheme(theme) {
  const isLight = theme === "light";
  document.body.classList.toggle("light", isLight);

  const meta = $("metaThemeColor");
  if (meta) meta.content = isLight ? "#F0F4F8" : "#0D1117";

  Store.set("theme", theme);
}

applyTheme(Store.get("theme", "dark"));

$("themeToggle")?.addEventListener("click", () => {
  const isLight = document.body.classList.contains("light");
  applyTheme(isLight ? "dark" : "light");

  if (typeof renderWeeklyChart === "function") {
    renderWeeklyChart(currentChartType);
  }
});

/* ---------- Tabs ---------- */
function switchTab(tabName, btnEl) {
  document.querySelectorAll(".tab-section").forEach((sec) => {
    sec.classList.remove("active");
  });

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.remove("active");
  });

  $("tab-" + tabName)?.classList.add("active");

  if (btnEl) {
    btnEl.classList.add("active");
  } else {
    document
      .querySelector(`.nav-item[data-tab="${tabName}"]`)
      ?.classList.add("active");
  }

  Store.set("active-tab", tabName);

  if (tabName === "dashboard") {
    setTimeout(() => renderWeeklyChart(currentChartType), 100);
  }
}

window.switchTab = switchTab;

/* ---------- Vital Simulation ---------- */
let currentHR = Store.get("hr", 72);

function simulateVitals() {
  currentHR += Math.round((Math.random() - 0.5) * 4);
  currentHR = Math.max(58, Math.min(105, currentHR));

  if ($("hrValue")) $("hrValue").textContent = currentHR;
  if ($("spo2Value"))
    $("spo2Value").textContent = Math.floor(97 + Math.random() * 3);

  Store.set("hr", currentHR);
}

simulateVitals();
setInterval(simulateVitals, 3500);

/* ---------- Goal Progress ---------- */
function updateGoalProgress(percent) {
  const pct = Math.max(0, Math.min(100, percent));

  if ($("goalBarFill")) $("goalBarFill").style.width = pct + "%";
  if ($("goalPercent")) $("goalPercent").textContent = Math.round(pct) + "%";
}

window.updateGoalProgress = updateGoalProgress;

function recalcGoalProgress() {
  let total = 0;
  let count = 0;

  const waterPct = Math.min(100, (waterState.consumed / waterState.goal) * 100);
  total += waterPct;
  count++;

  const stepsPct = Math.min(100, (stepsState.current / stepsState.goal) * 100);
  total += stepsPct;
  count++;

  updateGoalProgress(total / count);
}

/* ============================================================
   Water
============================================================ */
let waterState = Store.get("water", {
  consumed: 0,
  goal: 2000,
  glassSize: 250,
  history: [],
});

function renderWater() {
  const consumed = waterState.consumed;
  const goal = waterState.goal || 2000;
  const percent = Math.min(100, (consumed / goal) * 100);
  const circumference = 439.82;

  if ($("waterConsumed")) $("waterConsumed").textContent = consumed;
  if ($("waterGoalDisplay")) $("waterGoalDisplay").textContent = goal;
  if ($("waterPercent"))
    $("waterPercent").textContent = Math.round(percent) + "%";
  if ($("quickWater")) $("quickWater").textContent = consumed + "ml";

  const ring = $("waterRing");
  if (ring) {
    ring.style.strokeDashoffset = circumference * (1 - percent / 100);
  }

  const remaining = Math.max(0, goal - consumed);
  if ($("waterRemaining")) {
    $("waterRemaining").innerHTML =
      remaining === 0 ? "🎉 Goal reached!" : `${remaining} ml remaining`;
  }

  document.querySelectorAll(".glass-btn").forEach((btn) => {
    btn.classList.toggle(
      "active",
      Number(btn.dataset.size) === waterState.glassSize,
    );
  });

  renderWaterHistory();
  saveWeeklyData("water", consumed);
  recalcGoalProgress();
}

function renderWaterHistory() {
  const list = $("waterHistoryList");
  if (!list) return;

  if (!waterState.history.length) {
    list.innerHTML = `<div class="history-empty">No entries yet. Start tracking!</div>`;
    return;
  }

  list.innerHTML = waterState.history
    .slice(-6)
    .reverse()
    .map(
      (item) => `
    <div class="history-item">
      <span>💧 ${item.amount}ml</span>
      <span>${item.time}</span>
    </div>
  `,
    )
    .join("");
}

function addWater(glasses) {
  const amount = glasses * waterState.glassSize;
  waterState.consumed = Math.max(0, waterState.consumed + amount);

  if (glasses > 0) {
    waterState.history.push({
      amount: waterState.glassSize,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    toast(`Added ${waterState.glassSize}ml water`);
  } else {
    toast("Water removed", "info");
  }

  Store.set("water", waterState);
  renderWater();
}

function setGlassSize(size, btn) {
  waterState.glassSize = Number(size);
  Store.set("water", waterState);

  document
    .querySelectorAll(".glass-btn")
    .forEach((b) => b.classList.remove("active"));
  btn?.classList.add("active");

  toast(`Glass size set to ${size}ml`);
}

function editWaterGoal() {
  const newGoal = prompt("Enter daily water goal in ml:", waterState.goal);
  if (!newGoal) return;

  const goal = Number(newGoal);
  if (!goal || goal < 500) {
    toast("Invalid water goal", "error");
    return;
  }

  waterState.goal = goal;
  Store.set("water", waterState);
  renderWater();
  toast("Water goal updated");
}

window.addWater = addWater;
window.setGlassSize = setGlassSize;
window.editWaterGoal = editWaterGoal;

/* ============================================================
   Steps
============================================================ */
let stepsState = Store.get("steps", {
  goal: 10000,
  current: 0,
});

function renderSteps() {
  const goal = stepsState.goal || 10000;
  const current = stepsState.current || 0;
  const percent = Math.min(100, (current / goal) * 100);
  const distance = (current * 0.000762).toFixed(2);
  const calories = Math.round(current * 0.04);

  if ($("stepsGoal")) $("stepsGoal").value = goal;
  if ($("stepsCurrent")) $("stepsCurrent").value = current || "";

  if ($("stepsBarFill")) $("stepsBarFill").style.width = percent + "%";
  if ($("stepsPercent"))
    $("stepsPercent").textContent = Math.round(percent) + "%";

  if ($("statSteps")) $("statSteps").textContent = current.toLocaleString();
  if ($("statDist")) $("statDist").textContent = distance;
  if ($("statCal")) $("statCal").textContent = calories;
  if ($("quickSteps")) $("quickSteps").textContent = current.toLocaleString();
  if ($("quickCalories")) $("quickCalories").textContent = calories;
  if ($("calBurned")) $("calBurned").textContent = calories + 340;

  if ($("stepsTip")) {
    $("stepsTip").textContent =
      percent >= 100
        ? "🎉 Daily goal complete! Great job!"
        : percent >= 75
          ? "💪 Almost there — keep pushing!"
          : percent >= 50
            ? "🚶 Halfway done, you can do it!"
            : percent >= 25
              ? "🌟 Good start! Keep moving."
              : "👟 Start walking to hit your goal!";
  }

  saveWeeklyData("steps", current);
  saveWeeklyData("calories", calories);
  recalcGoalProgress();
}

function updateStepsFromInput() {
  stepsState.goal = Number($("stepsGoal")?.value) || 10000;
  stepsState.current = Number($("stepsCurrent")?.value) || 0;

  Store.set("steps", stepsState);
  renderSteps();
}

window.updateStepsFromInput = updateStepsFromInput;

/* ============================================================
   BMI
============================================================ */
let bmiHistory = Store.get("bmi-history", []);

function calculateBMIAction() {
  const height = Number($("bmiHeight")?.value);
  const weight = Number($("bmiWeight")?.value);

  if (!height || !weight) {
    toast("Please enter height and weight", "error");
    return;
  }

  const bmi = +(weight / Math.pow(height / 100, 2)).toFixed(1);

  let category = "Normal";
  let seg = "normal";
  let emoji = "✅";

  if (bmi < 18.5) {
    category = "Underweight";
    seg = "under";
    emoji = "📉";
  } else if (bmi < 25) {
    category = "Normal Weight";
    seg = "normal";
    emoji = "✅";
  } else if (bmi < 30) {
    category = "Overweight";
    seg = "over";
    emoji = "⚠️";
  } else {
    category = "Obese";
    seg = "obese";
    emoji = "🔴";
  }

  if ($("bmiNumber")) $("bmiNumber").textContent = bmi;
  if ($("bmiBadge")) $("bmiBadge").textContent = `${emoji} ${category}`;
  if ($("bmiAdvice"))
    $("bmiAdvice").textContent = "Keep tracking your health consistently.";

  document
    .querySelectorAll(".bmi-seg")
    .forEach((s) => s.classList.remove("active"));
  document.querySelector(".bmi-seg-" + seg)?.classList.add("active");

  bmiHistory.push({
    value: bmi,
    date: new Date().toLocaleDateString(),
  });

  bmiHistory = bmiHistory.slice(-7);
  Store.set("bmi-history", bmiHistory);
  renderBmiChart();

  toast("BMI calculated");
}

window.calculateBMIAction = calculateBMIAction;

/* ============================================================
   Meal Tracker
============================================================ */
let meals = Store.get("meals", []);

function addMeal() {
  const name = $("mealName")?.value.trim();
  const calories = Number($("mealCal")?.value);
  const time =
    $("mealTime")?.value ||
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  if (!name || !calories) {
    toast("Please add meal name and calories", "error");
    return;
  }

  meals.push({
    id: Date.now(),
    name,
    calories,
    time,
  });

  Store.set("meals", meals);

  $("mealName").value = "";
  $("mealCal").value = "";
  $("mealTime").value = "";

  renderMeals();
  toast("Meal logged");
}

function deleteMeal(id) {
  meals = meals.filter((m) => m.id !== id);
  Store.set("meals", meals);
  renderMeals();
}

function renderMeals() {
  const list = $("mealList");
  if (!list) return;

  const totalCal = meals.reduce((sum, m) => sum + Number(m.calories), 0);

  const protein = Math.round(totalCal * 0.075);
  const carbs = Math.round(totalCal * 0.125);
  const fat = Math.round(totalCal * 0.035);

  if ($("proteinValue")) $("proteinValue").textContent = protein;
  if ($("carbsValue")) $("carbsValue").textContent = carbs;
  if ($("fatValue")) $("fatValue").textContent = fat;

  updateMiniRing("proteinRing", protein, 150);
  updateMiniRing("carbsRing", carbs, 300);
  updateMiniRing("fatRing", fat, 80);

  if (!meals.length) {
    list.innerHTML = `
      <div class="history-header">Today's Meals</div>
      <div class="meals-empty">No meals logged yet</div>
    `;
    return;
  }

  list.innerHTML = `
    <div class="history-header">Today's Meals</div>
    ${meals
      .map(
        (m) => `
      <div class="meal-item">
        <div>
          <strong>${escapeHtml(m.name)}</strong>
          <span>${m.time}</span>
        </div>
        <div>
          <b>${m.calories}</b> kcal
          <button onclick="deleteMeal(${m.id})">✕</button>
        </div>
      </div>
    `,
      )
      .join("")}
  `;
}

function updateMiniRing(id, value, goal) {
  const ring = $(id);
  if (!ring) return;

  const circumference = 251.2;
  const percent = Math.min(100, (value / goal) * 100);
  ring.style.strokeDashoffset = circumference * (1 - percent / 100);
}

window.addMeal = addMeal;
window.deleteMeal = deleteMeal;

/* ============================================================
   Reminders
============================================================ */
let reminders = Store.get("reminders", []);

function saveReminder() {
  const title = $("remTitle")?.value.trim();
  const time = $("remTime")?.value;
  const note = $("remNote")?.value.trim();

  if (!title || !time) {
    toast("Please enter reminder title and time", "error");
    return;
  }

  reminders.push({
    id: Date.now(),
    title,
    time,
    note,
  });

  Store.set("reminders", reminders);
  clearReminderForm();
  renderReminders();
  toast("Reminder saved");
}

function clearReminderForm() {
  if ($("remTitle")) $("remTitle").value = "";
  if ($("remTime")) $("remTime").value = "";
  if ($("remNote")) $("remNote").value = "";
}

function deleteReminder(id) {
  reminders = reminders.filter((r) => r.id !== id);
  Store.set("reminders", reminders);
  renderReminders();
}

function renderReminders() {
  const list = $("reminderList");
  if (!list) return;

  if (!reminders.length) {
    list.innerHTML = `
      <div class="history-header">Active Reminders</div>
      <div class="reminders-empty">No reminders set</div>
    `;
    return;
  }

  list.innerHTML = `
    <div class="history-header">Active Reminders</div>
    ${reminders
      .map(
        (r) => `
      <div class="reminder-item">
        <span class="rem-icon">🔔</span>
        <div class="rem-body">
          <div class="rem-title">${escapeHtml(r.title)}</div>
          <div class="rem-meta">${escapeHtml(r.time)}</div>
          ${r.note ? `<div class="rem-note">${escapeHtml(r.note)}</div>` : ""}
        </div>
        <button class="rem-delete" onclick="deleteReminder(${r.id})">✕</button>
      </div>
    `,
      )
      .join("")}
  `;
}

window.saveReminder = saveReminder;
window.clearReminderForm = clearReminderForm;
window.deleteReminder = deleteReminder;

/* ============================================================
   Habits
============================================================ */
let habits = Store.get("habits", []);

function addNewHabit() {
  const name = prompt("Habit name:");
  if (!name) return;

  habits.push({
    id: Date.now(),
    name,
    streak: 0,
    done: false,
  });

  Store.set("habits", habits);
  renderHabits();
  toast("Habit created");
}

function toggleHabit(id) {
  habits = habits.map((h) => {
    if (h.id === id) {
      const done = !h.done;
      return {
        ...h,
        done,
        streak: done ? h.streak + 1 : Math.max(0, h.streak - 1),
      };
    }
    return h;
  });

  Store.set("habits", habits);
  renderHabits();
}

function renderHabits() {
  const grid = $("habitsGrid");
  if (!grid) return;

  if (!habits.length) return;

  grid.innerHTML = habits
    .map(
      (h) => `
    <article class="card habit-card">
      <div class="card-header">
        <div class="card-title-group">
          <span class="card-icon">🔥</span>
          <h2 class="card-title">${escapeHtml(h.name)}</h2>
        </div>
      </div>
      <div class="card-body">
        <p>Streak: ${h.streak} days</p>
        <button class="hd-btn ${h.done ? "hd-btn-secondary" : "hd-btn-primary"} hd-btn-block" onclick="toggleHabit(${h.id})">
          ${h.done ? "Done Today" : "Mark Done"}
        </button>
      </div>
    </article>
  `,
    )
    .join("");
}

window.addNewHabit = addNewHabit;
window.toggleHabit = toggleHabit;

/* ============================================================
   Weekly Chart
============================================================ */
let weeklyChart = null;
let bmiChart = null;
let currentChartType = "water";

const chartColors = {
  water: "rgba(0, 163, 255, 0.8)",
  steps: "rgba(0, 212, 170, 0.8)",
  calories: "rgba(255, 140, 66, 0.8)",
  weight: "rgba(255, 77, 109, 0.8)",
};

function generateDemoData(type) {
  const base = {
    water: 1500,
    steps: 7000,
    calories: 280,
    weight: 70,
  };

  const variance = {
    water: 600,
    steps: 4000,
    calories: 120,
    weight: 3,
  };

  return Array.from({ length: 7 }, () =>
    Math.round(base[type] + (Math.random() - 0.5) * variance[type]),
  );
}

function saveWeeklyData(type, value) {
  const day = (new Date().getDay() + 6) % 7;
  const data = Store.get("weekly-" + type, generateDemoData(type));
  data[day] = value;
  Store.set("weekly-" + type, data);
}

function renderWeeklyChart(type = "water") {
  currentChartType = type;

  if (typeof Chart === "undefined") return;

  const canvas = $("weeklyChart");
  if (!canvas) return;

  if (weeklyChart) weeklyChart.destroy();

  const isLight = document.body.classList.contains("light");
  const data = Store.get("weekly-" + type, generateDemoData(type));

  weeklyChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          label: type,
          data,
          backgroundColor: chartColors[type] || chartColors.water,
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: isLight ? "#4a5568" : "#8b949e" },
          grid: {
            color: isLight ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.06)",
          },
        },
        y: {
          beginAtZero: true,
          ticks: { color: isLight ? "#4a5568" : "#8b949e" },
          grid: {
            color: isLight ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.06)",
          },
        },
      },
    },
  });
}

function switchChart(type, btn) {
  document
    .querySelectorAll(".chart-tab")
    .forEach((b) => b.classList.remove("active"));
  btn?.classList.add("active");
  renderWeeklyChart(type);
}

function renderBmiChart() {
  if (typeof Chart === "undefined") return;

  const canvas = $("bmiChart");
  if (!canvas) return;

  if (bmiChart) bmiChart.destroy();

  bmiChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: bmiHistory.map((x) => x.date),
      datasets: [
        {
          data: bmiHistory.map((x) => x.value),
          borderWidth: 2,
          tension: 0.4,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: false },
      },
    },
  });
}

window.switchChart = switchChart;

/* ============================================================
   Panels
============================================================ */
$("notificationBtn")?.addEventListener("click", () => {
  $("notificationPanel")?.classList.toggle("active");
});

$("settingsBtn")?.addEventListener("click", () => {
  $("settingsPanel")?.classList.toggle("active");
});

function closeNotificationPanel() {
  $("notificationPanel")?.classList.remove("active");
}

function closeSettingsPanel() {
  $("settingsPanel")?.classList.remove("active");
}

function toggleNotifications() {
  const enabled = $("enableNotifications")?.checked;
  Store.set("notifications", enabled);
  toast(enabled ? "Notifications enabled" : "Notifications disabled");
}

window.closeNotificationPanel = closeNotificationPanel;
window.closeSettingsPanel = closeSettingsPanel;
window.toggleNotifications = toggleNotifications;

/* ============================================================
   Profile / Data
============================================================ */
function exportData() {
  const data = {
    waterState,
    stepsState,
    meals,
    reminders,
    habits,
    bmiHistory,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "healthdash-data.json";
  a.click();

  URL.revokeObjectURL(url);
  toast("Data exported");
}

function importData() {
  toast("Import feature coming soon", "info");
}

function resetAllData() {
  if (!confirm("Reset all app data?")) return;

  Object.keys(localStorage)
    .filter((key) => key.startsWith("hd-"))
    .forEach((key) => localStorage.removeItem(key));

  location.reload();
}

window.exportData = exportData;
window.importData = importData;
window.resetAllData = resetAllData;

/* ============================================================
   Card Menu Placeholder
============================================================ */
function toggleCardMenu() {
  toast("Options menu coming soon", "info");
}

window.toggleCardMenu = toggleCardMenu;

/* ============================================================
   PWA Install
============================================================ */
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const promptBox = $("pwaInstallPrompt");
  if (promptBox && !Store.get("pwa-dismissed", false)) {
    promptBox.style.display = "block";
  }
});

$("pwaInstallBtn")?.addEventListener("click", async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;

  if ($("pwaInstallPrompt")) $("pwaInstallPrompt").style.display = "none";
});

$("pwaDismissBtn")?.addEventListener("click", () => {
  Store.set("pwa-dismissed", true);
  if ($("pwaInstallPrompt")) $("pwaInstallPrompt").style.display = "none";
});

/* ============================================================
   Init
============================================================ */
function initApp() {
  renderWater();
  renderSteps();
  renderMeals();
  renderReminders();
  renderHabits();
  renderBmiChart();
  renderWeeklyChart("water");

  const savedTab = Store.get("active-tab", "dashboard");
  switchTab(savedTab);

  if ($("quickStreak")) {
    $("quickStreak").textContent = habits.reduce(
      (m, h) => Math.max(m, h.streak),
      0,
    );
  }
}

document.addEventListener("DOMContentLoaded", initApp);
