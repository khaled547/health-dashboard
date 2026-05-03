/* ============================================================
   HealthDash Pro — app.js
   Fixed working version matched with HTML/CSS
============================================================ */

"use strict";

/* ─────────────────────────────────────────────────────────── */
/* 1. SAFE LOCAL STORAGE WRAPPER                               */
/* ─────────────────────────────────────────────────────────── */
const Store = {
  get(key, fallback = null) {
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
    } catch (e) {
      console.warn("Storage write failed:", e);
    }
  },
  remove(key) {
    try {
      localStorage.removeItem("hd-" + key);
    } catch {}
  },
  clearAll() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("hd-"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
  },
};

window.Store = Store;

/* ─────────────────────────────────────────────────────────── */
/* 2. DOM HELPERS                                              */
/* ─────────────────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function setText(id, val) {
  const el = $(id);
  if (el) el.textContent = val;
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

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatReminderTime(date = new Date()) {
  return date.toTimeString().slice(0, 5);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/* ─────────────────────────────────────────────────────────── */
/* 3. GLOBAL STATES                                            */
/* ─────────────────────────────────────────────────────────── */
let weeklyChart = null;
let bmiChart = null;
let currentChartType = Store.get("chart-type", "water");
let appReady = false;

/* ─────────────────────────────────────────────────────────── */
/* 4. TOAST NOTIFICATION SYSTEM                                */
/* ─────────────────────────────────────────────────────────── */
const TOAST_ICONS = {
  success: "✅",
  error: "❌",
  info: "ℹ️",
  warning: "⚠️",
};

function toast(message, type = "success", duration = 2800) {
  const container = $("toastContainer");
  if (!container) return;

  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || "📢"}</span>
    <span class="toast-msg">${escapeHtml(message)}</span>
  `;

  container.appendChild(el);

  requestAnimationFrame(() => {
    el.classList.add("show");
  });

  const removeEl = () => {
    el.classList.remove("show");

    setTimeout(() => {
      if (el && el.parentNode) el.remove();
    }, 350);
  };

  setTimeout(removeEl, duration);
  el.addEventListener("click", removeEl);
}

window.toast = toast;

/* ─────────────────────────────────────────────────────────── */
/* 5. LOADING SCREEN                                           */
/* ─────────────────────────────────────────────────────────── */
window.addEventListener("load", () => {
  const loader = $("loadingScreen");
  if (!loader) return;

  const minDelay = 900;
  const start = performance.now();

  const elapsed = performance.now() - start;
  const wait = Math.max(0, minDelay - elapsed);

  setTimeout(() => {
    loader.classList.add("hide");
    loader.addEventListener(
      "transitionend",
      () => {
        loader.style.display = "none";
      },
      { once: true },
    );
  }, wait);
});

/* ─────────────────────────────────────────────────────────── */
/* 6. LIVE CLOCK                                               */
/* ─────────────────────────────────────────────────────────── */
function updateClock() {
  const now = new Date();

  if ($("clock")) $("clock").textContent = now.toLocaleTimeString();

  if ($("dateDisplay")) {
    $("dateDisplay").textContent = now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
}

updateClock();
setInterval(updateClock, 1000);

/* ─────────────────────────────────────────────────────────── */
/* 7. THEME SYSTEM                                             */
/* ─────────────────────────────────────────────────────────── */
function applyTheme(theme) {
  const isLight = theme === "light";
  document.body.classList.toggle("light", isLight);

  const meta = $("metaThemeColor");
  if (meta) meta.content = isLight ? "#f2f6fb" : "#080d14";

  Store.set("theme", theme);

  if (appReady) {
    renderWeeklyChart(currentChartType);
    renderBmiChart();
  }
}

$("themeToggle")?.addEventListener("click", () => {
  const isLight = document.body.classList.contains("light");
  applyTheme(isLight ? "dark" : "light");
});

/* ─────────────────────────────────────────────────────────── */
/* 8. TAB NAVIGATION                                           */
/* ─────────────────────────────────────────────────────────── */
function switchTab(tabName, btnEl) {
  $$(".tab-section").forEach((sec) => sec.classList.remove("active"));
  $$(".nav-item").forEach((btn) => btn.classList.remove("active"));

  const section = $("tab-" + tabName);
  if (section) section.classList.add("active");

  if (btnEl) {
    btnEl.classList.add("active");
  } else {
    document
      .querySelector(`.nav-item[data-tab="${tabName}"]`)
      ?.classList.add("active");
  }

  Store.set("active-tab", tabName);

  if (tabName === "dashboard") {
    setTimeout(() => renderWeeklyChart(currentChartType), 80);
  }
}

window.switchTab = switchTab;

/* ─────────────────────────────────────────────────────────── */
/* 9. VITAL SIGNS SIMULATION                                   */
/* ─────────────────────────────────────────────────────────── */
let currentHR = Store.get("hr", 72);

function simulateVitals() {
  currentHR += Math.round((Math.random() - 0.5) * 6);
  currentHR = clamp(currentHR, 55, 105);

  const spo2 = Math.floor(97 + Math.random() * 3);

  setText("hrValue", currentHR);
  setText("spo2Value", spo2);

  Store.set("hr", currentHR);
}

simulateVitals();
setInterval(simulateVitals, 4000);

/* ─────────────────────────────────────────────────────────── */
/* 10. DAILY GOAL PROGRESS BAR                                 */
/* ─────────────────────────────────────────────────────────── */
function updateGoalProgress(percent) {
  const pct = clamp(percent, 0, 100);

  if ($("goalBarFill")) $("goalBarFill").style.width = pct + "%";
  setText("goalPercent", Math.round(pct) + "%");
}

window.updateGoalProgress = updateGoalProgress;

function recalcGoalProgress() {
  const waterPct = clamp(
    (waterState.consumed / (waterState.goal || 2000)) * 100,
    0,
    100,
  );

  const stepsPct = clamp(
    (stepsState.current / (stepsState.goal || 10000)) * 100,
    0,
    100,
  );

  updateGoalProgress((waterPct + stepsPct) / 2);
}

/* ─────────────────────────────────────────────────────────── */
/* 11. WATER INTAKE                                            */
/* ─────────────────────────────────────────────────────────── */
let waterState = Store.get("water", {
  consumed: 0,
  goal: 2000,
  glassSize: 250,
  history: [],
});

const WATER_CIRCUMFERENCE = 439.82;

function renderWater() {
  const consumed = waterState.consumed;
  const goal = waterState.goal || 2000;
  const percent = clamp((consumed / goal) * 100, 0, 100);
  const remaining = Math.max(0, goal - consumed);

  const ring = $("waterRing");
  if (ring) {
    ring.style.strokeDashoffset = WATER_CIRCUMFERENCE * (1 - percent / 100);
  }

  setText("waterConsumed", consumed);
  setText("waterGoalDisplay", goal);
  setText("waterPercent", Math.round(percent) + "%");
  setText("quickWater", consumed + "ml");

  const remEl = $("waterRemaining");
  if (remEl) {
    remEl.innerHTML =
      remaining === 0
        ? `🎉 Goal reached! Amazing!`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
           </svg>
           ${remaining} ml remaining`;
  }

  $$(".glass-btn").forEach((btn) => {
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
    .slice(-8)
    .reverse()
    .map(
      (item) => `
      <div class="history-item">
        <span class="history-item-icon">💧</span>
        <span class="history-item-amount">${item.amount}ml</span>
        <span class="history-item-time">${escapeHtml(item.time)}</span>
      </div>`,
    )
    .join("");
}

function addWater(glasses) {
  const amount = glasses * waterState.glassSize;
  waterState.consumed = Math.max(0, waterState.consumed + amount);

  if (glasses > 0) {
    waterState.history.push({
      amount: waterState.glassSize,
      time: formatTime(),
    });

    if (waterState.history.length > 20) waterState.history.shift();

    toast(`💧 Added ${waterState.glassSize}ml water`, "success");

    const pct = (waterState.consumed / waterState.goal) * 100;

    if (pct >= 100 && pct - (amount / waterState.goal) * 100 < 100) {
      setTimeout(() => {
        toast("🎉 Water goal reached! Great job!", "success", 3500);
      }, 600);
    } else if (pct >= 50 && pct - (amount / waterState.goal) * 100 < 50) {
      setTimeout(() => {
        toast("💪 Halfway to your water goal!", "info", 3000);
      }, 600);
    }
  } else {
    if (waterState.history.length) waterState.history.pop();
    toast("Water entry removed", "info");
  }

  Store.set("water", waterState);
  renderWater();
}

function setGlassSize(size, btn) {
  waterState.glassSize = Number(size);
  Store.set("water", waterState);

  $$(".glass-btn").forEach((b) => b.classList.remove("active"));
  btn?.classList.add("active");

  toast(`Glass size: ${size}ml`, "info");
}

function editWaterGoal() {
  const current = waterState.goal;
  const input = prompt(
    `Daily water goal (ml):\nCurrent: ${current}ml`,
    current,
  );
  if (input === null) return;

  const goal = Number(input);

  if (!goal || goal < 500 || goal > 10000) {
    toast("Please enter a valid goal (500–10000 ml)", "error");
    return;
  }

  waterState.goal = goal;
  Store.set("water", waterState);
  renderWater();
  toast(`Water goal set to ${goal}ml`, "success");
}

window.addWater = addWater;
window.setGlassSize = setGlassSize;
window.editWaterGoal = editWaterGoal;

/* ─────────────────────────────────────────────────────────── */
/* 12. STEPS TRACKER                                           */
/* ─────────────────────────────────────────────────────────── */
let stepsState = Store.get("steps", {
  goal: 10000,
  current: 0,
});

function renderSteps() {
  const goal = stepsState.goal || 10000;
  const current = stepsState.current || 0;
  const percent = clamp((current / goal) * 100, 0, 100);

  const distance = (current * 0.000762).toFixed(2);
  const calories = Math.round(current * 0.04);

  const goalInput = $("stepsGoal");
  const currentInput = $("stepsCurrent");

  if (goalInput && document.activeElement !== goalInput) goalInput.value = goal;
  if (currentInput && document.activeElement !== currentInput) {
    currentInput.value = current || "";
  }

  if ($("stepsBarFill")) $("stepsBarFill").style.width = percent + "%";

  setText("stepsPercent", Math.round(percent) + "%");
  setText("statSteps", current.toLocaleString());
  setText("statDist", distance);
  setText("statCal", calories);
  setText("quickSteps", current.toLocaleString());
  setText("quickCalories", calories);
  setText("calBurned", calories + 340);

  const tipEl = $("stepsTip");
  if (tipEl) {
    const msgs = [
      [100, "🎉 Daily goal complete! Incredible!"],
      [75, "💪 Almost there — you've got this!"],
      [50, "🚶 Halfway done, keep it up!"],
      [25, "🌟 Good start! Keep moving."],
      [0, "👟 Start walking to hit your goal!"],
    ];

    const msg = msgs.find(([threshold]) => percent >= threshold);

    tipEl.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      ${msg ? msg[1] : "👟 Start walking!"}`;
  }

  saveWeeklyData("steps", current);
  saveWeeklyData("calories", calories);
  recalcGoalProgress();
}

function updateStepsFromInput() {
  const newGoal = Number($("stepsGoal")?.value) || 10000;
  const newCurrent = Number($("stepsCurrent")?.value) || 0;

  stepsState.goal = clamp(newGoal, 1000, 100000);
  stepsState.current = clamp(newCurrent, 0, 200000);

  Store.set("steps", stepsState);
  renderSteps();
}

window.updateStepsFromInput = updateStepsFromInput;

$("stepsGoal")?.addEventListener("input", updateStepsFromInput);

/* ─────────────────────────────────────────────────────────── */
/* 13. BMI CALCULATOR                                          */
/* ─────────────────────────────────────────────────────────── */
let bmiHistory = Store.get("bmi-history", []);

const BMI_CATEGORIES = [
  {
    max: 18.5,
    label: "Underweight",
    seg: "under",
    emoji: "📉",
    color: "#00a3ff",
    advice:
      "Consider consulting a nutritionist for a healthy weight gain plan.",
  },
  {
    max: 25,
    label: "Normal Weight",
    seg: "normal",
    emoji: "✅",
    color: "#00d4aa",
    advice:
      "Great! Maintain your healthy lifestyle with balanced diet and exercise.",
  },
  {
    max: 30,
    label: "Overweight",
    seg: "over",
    emoji: "⚠️",
    color: "#ff8c42",
    advice: "Consider increasing physical activity and reviewing your diet.",
  },
  {
    max: Infinity,
    label: "Obese",
    seg: "obese",
    emoji: "🔴",
    color: "#ff4d6d",
    advice: "Please consult a healthcare provider for personalised guidance.",
  },
];

function calculateBMIAction() {
  const height = Number($("bmiHeight")?.value);
  const weight = Number($("bmiWeight")?.value);

  if (
    !height ||
    !weight ||
    height < 50 ||
    height > 250 ||
    weight < 20 ||
    weight > 500
  ) {
    toast(
      "Please enter valid height (50–250 cm) and weight (20–500 kg)",
      "error",
    );
    return;
  }

  const bmi = +(weight / Math.pow(height / 100, 2)).toFixed(1);
  const cat =
    BMI_CATEGORIES.find((c) => bmi < c.max) ||
    BMI_CATEGORIES[BMI_CATEGORIES.length - 1];

  const numEl = $("bmiNumber");
  if (numEl) {
    numEl.textContent = bmi;
    numEl.style.color = cat.color;
  }

  const badgeEl = $("bmiBadge");
  if (badgeEl) {
    badgeEl.textContent = `${cat.emoji} ${cat.label}`;
    badgeEl.style.color = cat.color;
    badgeEl.style.border = `1px solid ${cat.color}40`;
  }

  setText("bmiAdvice", cat.advice);

  $$(".bmi-seg").forEach((s) => s.classList.remove("active"));
  document.querySelector(".bmi-seg-" + cat.seg)?.classList.add("active");

  bmiHistory.push({
    value: bmi,
    date: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  });

  bmiHistory = bmiHistory.slice(-10);
  Store.set("bmi-history", bmiHistory);

  renderBmiChart();

  toast(
    `BMI: ${bmi} — ${cat.label}`,
    bmi < 25 && bmi >= 18.5 ? "success" : "info",
  );
}

window.calculateBMIAction = calculateBMIAction;

/* ─────────────────────────────────────────────────────────── */
/* 14. MEAL TRACKER                                            */
/* ─────────────────────────────────────────────────────────── */
let meals = Store.get("meals", []);

const MACRO_GOALS = {
  protein: 150,
  carbs: 300,
  fat: 80,
};

function addMeal() {
  const nameEl = $("mealName");
  const calEl = $("mealCal");
  const timeEl = $("mealTime");

  const name = nameEl?.value.trim();
  const calories = Number(calEl?.value);
  const time = timeEl?.value || formatTime();

  if (!name) {
    toast("Please enter a meal name", "error");
    nameEl?.focus();
    return;
  }

  if (!calories || calories < 1 || calories > 5000) {
    toast("Please enter valid calories (1–5000)", "error");
    calEl?.focus();
    return;
  }

  meals.push({
    id: Date.now(),
    name,
    calories,
    time,
    protein: Math.round(calories * 0.075),
    carbs: Math.round(calories * 0.125),
    fat: Math.round(calories * 0.035),
  });

  Store.set("meals", meals);

  if (nameEl) nameEl.value = "";
  if (calEl) calEl.value = "";
  if (timeEl) timeEl.value = "";

  renderMeals();
  toast(`🍽️ ${name} logged!`, "success");
}

function deleteMeal(id) {
  meals = meals.filter((m) => m.id !== id);
  Store.set("meals", meals);
  renderMeals();
  toast("Meal removed", "info");
}

function updateMiniRing(id, value, goal) {
  const ring = $(id);
  if (!ring) return;

  const circumference = 251.2;
  const pct = clamp((value / goal) * 100, 0, 100);

  ring.style.strokeDashoffset = circumference * (1 - pct / 100);
}

function renderMeals() {
  const list = $("mealList");
  if (!list) return;

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + Number(m.calories || 0),
      protein: acc.protein + Number(m.protein || 0),
      carbs: acc.carbs + Number(m.carbs || 0),
      fat: acc.fat + Number(m.fat || 0),
    }),
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    },
  );

  setText("proteinValue", totals.protein);
  setText("carbsValue", totals.carbs);
  setText("fatValue", totals.fat);

  updateMiniRing("proteinRing", totals.protein, MACRO_GOALS.protein);
  updateMiniRing("carbsRing", totals.carbs, MACRO_GOALS.carbs);
  updateMiniRing("fatRing", totals.fat, MACRO_GOALS.fat);

  if (!meals.length) {
    list.innerHTML = `
      <div class="history-header">Today's Meals</div>
      <div class="meals-empty">No meals logged yet</div>`;
    return;
  }

  list.innerHTML = `
    <div class="history-header">
      Today's Meals
      <span style="color:var(--accent-orange);font-family:var(--font-mono)">
        ${totals.calories} kcal
      </span>
    </div>
    ${meals
      .map(
        (m) => `
      <div class="meal-item">
        <div class="meal-item-info">
          <strong class="meal-item-name">${escapeHtml(m.name)}</strong>
          <span class="meal-item-time">${escapeHtml(m.time)}</span>
        </div>
        <div class="meal-item-right">
          <span class="meal-item-cal">${m.calories} kcal</span>
          <button class="meal-delete-btn" onclick="deleteMeal(${m.id})" aria-label="Delete meal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>`,
      )
      .join("")}`;
}

window.addMeal = addMeal;
window.deleteMeal = deleteMeal;

/* ─────────────────────────────────────────────────────────── */
/* 15. HEALTH REMINDERS                                        */
/* ─────────────────────────────────────────────────────────── */
let reminders = Store.get("reminders", []);
let reminderCheckInterval = null;
let lastReminderMinute = "";

function saveReminder() {
  const title = $("remTitle")?.value.trim();
  const time = $("remTime")?.value;
  const note = $("remNote")?.value.trim();

  if (!title) {
    toast("Please enter a reminder title", "error");
    $("remTitle")?.focus();
    return;
  }

  if (!time) {
    toast("Please select a time", "error");
    $("remTime")?.focus();
    return;
  }

  reminders.push({
    id: Date.now(),
    title,
    time,
    note,
    active: true,
    created: new Date().toLocaleDateString(),
  });

  Store.set("reminders", reminders);
  clearReminderForm();
  renderReminders();
  startReminderChecker();

  toast(`🔔 Reminder set for ${time}`, "success");
}

function clearReminderForm() {
  ["remTitle", "remTime", "remNote"].forEach((id) => {
    if ($(id)) $(id).value = "";
  });
}

function deleteReminder(id) {
  reminders = reminders.filter((r) => r.id !== id);
  Store.set("reminders", reminders);
  renderReminders();
  toast("Reminder deleted", "info");
}

function updateNotifBadge(count) {
  const badge = $("notificationBadge");
  if (!badge) return;

  if (count > 0) {
    badge.style.display = "grid";
    badge.textContent = count > 9 ? "9+" : count;
  } else {
    badge.style.display = "none";
  }
}

function renderReminders() {
  const list = $("reminderList");
  if (!list) return;

  if (!reminders.length) {
    list.innerHTML = `
      <div class="history-header">Active Reminders</div>
      <div class="reminders-empty">No reminders set</div>`;
    updateNotifBadge(0);
    return;
  }

  updateNotifBadge(reminders.length);

  list.innerHTML = `
    <div class="history-header">Active Reminders <span>${reminders.length}</span></div>
    ${reminders
      .map(
        (r) => `
      <div class="reminder-item" data-id="${r.id}">
        <span class="rem-icon">🔔</span>
        <div class="rem-body">
          <div class="rem-title">${escapeHtml(r.title)}</div>
          <div class="rem-meta">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            ${escapeHtml(r.time)}
          </div>
          ${r.note ? `<div class="rem-note">${escapeHtml(r.note)}</div>` : ""}
        </div>
        <button class="rem-delete" onclick="deleteReminder(${r.id})" aria-label="Delete reminder">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>`,
      )
      .join("")}`;
}

function startReminderChecker() {
  if (reminderCheckInterval) return;

  reminderCheckInterval = setInterval(() => {
    const now = formatReminderTime();

    if (now === lastReminderMinute) return;
    lastReminderMinute = now;

    const dueReminders = reminders.filter((r) => r.active && r.time === now);

    dueReminders.forEach((r) => {
      toast(`🔔 Reminder: ${r.title}`, "info", 5000);

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("HealthDash Reminder", {
          body: r.note || r.title,
        });
      }
    });
  }, 1000);
}

function requestNotifPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

window.saveReminder = saveReminder;
window.clearReminderForm = clearReminderForm;
window.deleteReminder = deleteReminder;

/* ─────────────────────────────────────────────────────────── */
/* 16. NOTIFICATION PANEL                                      */
/* ─────────────────────────────────────────────────────────── */
function renderNotificationPanel() {
  const body = $("notificationPanelBody");
  if (!body) return;

  if (!reminders.length) {
    body.innerHTML = `<div class="notifications-empty">No new notifications</div>`;
    return;
  }

  body.innerHTML = reminders
    .map(
      (r) => `
    <div class="notif-item">
      <span class="notif-icon">🔔</span>
      <div class="notif-body">
        <div class="notif-title">${escapeHtml(r.title)}</div>
        <div class="notif-meta">${escapeHtml(r.time)}</div>
      </div>
    </div>`,
    )
    .join("");
}

$("notificationBtn")?.addEventListener("click", () => {
  const panel = $("notificationPanel");
  if (!panel) return;

  panel.classList.toggle("active");
  renderNotificationPanel();
  $("settingsPanel")?.classList.remove("active");
});

$("settingsBtn")?.addEventListener("click", () => {
  const panel = $("settingsPanel");
  if (!panel) return;

  panel.classList.toggle("active");
  $("notificationPanel")?.classList.remove("active");
});

document.addEventListener("click", (e) => {
  const notifPanel = $("notificationPanel");
  const settingsPanel = $("settingsPanel");
  const notifBtn = $("notificationBtn");
  const settingsBtn = $("settingsBtn");

  if (
    notifPanel &&
    !notifPanel.contains(e.target) &&
    !notifBtn?.contains(e.target)
  ) {
    notifPanel.classList.remove("active");
  }

  if (
    settingsPanel &&
    !settingsPanel.contains(e.target) &&
    !settingsBtn?.contains(e.target)
  ) {
    settingsPanel.classList.remove("active");
  }
});

function closeNotificationPanel() {
  $("notificationPanel")?.classList.remove("active");
}

function closeSettingsPanel() {
  $("settingsPanel")?.classList.remove("active");
}

function toggleNotifications() {
  const enabled =
    $("enableNotifications")?.checked ?? $("notifToggle")?.checked ?? false;

  Store.set("notifications", enabled);

  if (enabled) {
    requestNotifPermission();
    toast("Notifications enabled", "success");
  } else {
    toast("Notifications disabled", "info");
  }
}

window.closeNotificationPanel = closeNotificationPanel;
window.closeSettingsPanel = closeSettingsPanel;
window.toggleNotifications = toggleNotifications;

/* ─────────────────────────────────────────────────────────── */
/* 17. HABITS TRACKER                                          */
/* ─────────────────────────────────────────────────────────── */
let habits = Store.get("habits", []);

const HABIT_EMOJIS = ["🔥", "💪", "🧘", "📚", "🥗", "💧", "🚴", "🎯"];

function addNewHabit() {
  const name = prompt("Enter habit name:");
  if (!name?.trim()) return;

  const emoji = HABIT_EMOJIS[Math.floor(Math.random() * HABIT_EMOJIS.length)];

  habits.push({
    id: Date.now(),
    name: name.trim(),
    emoji,
    streak: 0,
    done: false,
    lastDone: null,
    totalDone: 0,
    createdAt: new Date().toLocaleDateString(),
  });

  Store.set("habits", habits);
  renderHabits();
  updateQuickStreak();

  toast(`${emoji} Habit "${name.trim()}" created!`, "success");
}

function toggleHabit(id) {
  const today = new Date().toDateString();

  habits = habits.map((h) => {
    if (h.id !== id) return h;

    const wasDoneToday = h.lastDone === today;

    if (wasDoneToday) {
      return {
        ...h,
        done: false,
        streak: Math.max(0, h.streak - 1),
        totalDone: Math.max(0, h.totalDone - 1),
        lastDone: null,
      };
    }

    return {
      ...h,
      done: true,
      streak: h.streak + 1,
      totalDone: (h.totalDone || 0) + 1,
      lastDone: today,
    };
  });

  Store.set("habits", habits);
  renderHabits();
  updateQuickStreak();

  const h = habits.find((item) => item.id === id);
  if (h?.done) {
    toast(`${h.emoji} "${h.name}" done! 🔥 ${h.streak} day streak`, "success");
  }
}

function deleteHabit(id) {
  if (!confirm("Delete this habit?")) return;

  habits = habits.filter((h) => h.id !== id);
  Store.set("habits", habits);
  renderHabits();
  updateQuickStreak();

  toast("Habit deleted", "info");
}

function renderHabits() {
  const grid = $("habitsGrid");
  if (!grid) return;

  if (!habits.length) {
    grid.innerHTML = `
      <div class="tab-placeholder">
        <div class="placeholder-icon">🔥</div>
        <div class="placeholder-title">Build Better Habits</div>
        <div class="placeholder-sub">Track daily habits and build streaks</div>
        <button class="hd-btn hd-btn-primary" onclick="addNewHabit()">
          Create Your First Habit
        </button>
      </div>`;
    return;
  }

  grid.innerHTML = habits
    .map(
      (h) => `
    <article class="card habit-card" data-id="${h.id}">
      <div class="card-header">
        <div class="card-title-group">
          <span class="card-icon">${h.emoji}</span>
          <h2 class="card-title">${escapeHtml(h.name)}</h2>
        </div>
        <button class="card-menu-btn" onclick="deleteHabit(${h.id})" aria-label="Delete habit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
          </svg>
        </button>
      </div>

      <div class="card-body">
        <div class="habit-stats">
          <div class="habit-stat">
            <span class="habit-stat-val">${h.streak}</span>
            <span class="habit-stat-lbl">Day Streak 🔥</span>
          </div>
          <div class="habit-stat">
            <span class="habit-stat-val">${h.totalDone || 0}</span>
            <span class="habit-stat-lbl">Total Done</span>
          </div>
        </div>

        <button
          class="hd-btn hd-btn-block hd-btn-icon ${h.done ? "hd-btn-secondary habit-done" : "hd-btn-primary"}"
          onclick="toggleHabit(${h.id})">
          ${
            h.done
              ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.5">
                   <polyline points="20 6 9 17 4 12"/>
                 </svg> Done Today ✓`
              : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2">
                   <circle cx="12" cy="12" r="10"/>
                   <polyline points="12 6 12 12 16 14"/>
                 </svg> Mark as Done`
          }
        </button>
      </div>
    </article>`,
    )
    .join("");
}

function updateQuickStreak() {
  const maxStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
  setText("quickStreak", maxStreak);
}

window.addNewHabit = addNewHabit;
window.toggleHabit = toggleHabit;
window.deleteHabit = deleteHabit;

/* ─────────────────────────────────────────────────────────── */
/* 18. WEEKLY CHART                                            */
/* ─────────────────────────────────────────────────────────── */
const CHART_CONFIG = {
  water: {
    color: "#00a3ff",
    label: "Water (ml)",
    unit: "ml",
  },
  steps: {
    color: "#00d4aa",
    label: "Steps",
    unit: "",
  },
  calories: {
    color: "#ff8c42",
    label: "Calories (kcal)",
    unit: "kcal",
  },
  weight: {
    color: "#ff4d6d",
    label: "Weight (kg)",
    unit: "kg",
  },
};

function generateDemoData(type) {
  const base = {
    water: 1500,
    steps: 7000,
    calories: 280,
    weight: 70,
  };

  const variance = {
    water: 700,
    steps: 4500,
    calories: 130,
    weight: 3,
  };

  return Array.from({ length: 7 }, () =>
    Math.round(base[type] + (Math.random() - 0.5) * variance[type]),
  );
}

function saveWeeklyData(type, value) {
  const dayIndex = (new Date().getDay() + 6) % 7;
  const data = Store.get("weekly-" + type, generateDemoData(type));

  data[dayIndex] = value;
  Store.set("weekly-" + type, data);
}

function renderWeeklyChart(type = "water") {
  currentChartType = type;
  Store.set("chart-type", type);

  if (typeof Chart === "undefined") return;

  const canvas = $("weeklyChart");
  if (!canvas) return;

  if (weeklyChart) {
    weeklyChart.destroy();
    weeklyChart = null;
  }

  const isLight = document.body.classList.contains("light");
  const cfg = CHART_CONFIG[type] || CHART_CONFIG.water;
  const data = Store.get("weekly-" + type, generateDemoData(type));

  const gridColor = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.055)";
  const labelColor = isLight ? "#4b5a6e" : "#8b97aa";
  const tooltipBg = isLight ? "rgba(255,255,255,0.96)" : "rgba(12,18,28,0.96)";
  const tooltipText = isLight ? "#0a1020" : "#e8f0fe";

  weeklyChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          label: cfg.label,
          data,
          backgroundColor: cfg.color + "cc",
          borderColor: cfg.color,
          borderWidth: 1,
          borderRadius: 10,
          borderSkipped: false,
          hoverBackgroundColor: cfg.color,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: {
        duration: 500,
        easing: "easeInOutQuart",
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tooltipText,
          bodyColor: tooltipText,
          borderColor: cfg.color + "55",
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.y.toLocaleString()} ${cfg.unit}`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: labelColor,
            font: {
              size: 12,
              weight: "600",
            },
          },
          grid: {
            color: gridColor,
            drawBorder: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: labelColor,
            font: {
              size: 11,
            },
          },
          grid: {
            color: gridColor,
            drawBorder: false,
          },
        },
      },
    },
  });
}

function switchChart(type, btn) {
  $$(".chart-tab").forEach((b) => b.classList.remove("active"));
  btn?.classList.add("active");
  renderWeeklyChart(type);
}

window.switchChart = switchChart;

function renderBmiChart() {
  if (typeof Chart === "undefined") return;

  const canvas = $("bmiChart");
  if (!canvas) return;

  if (bmiChart) {
    bmiChart.destroy();
    bmiChart = null;
  }

  if (!bmiHistory.length) return;

  const isLight = document.body.classList.contains("light");
  const labelColor = isLight ? "#4b5a6e" : "#8b97aa";
  const gridColor = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.055)";

  bmiChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: bmiHistory.map((x) => x.date),
      datasets: [
        {
          data: bmiHistory.map((x) => x.value),
          borderColor: "#9b5cff",
          backgroundColor: "rgba(155,92,255,0.12)",
          borderWidth: 2.5,
          pointRadius: 5,
          pointBackgroundColor: "#9b5cff",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          ticks: {
            color: labelColor,
            font: {
              size: 11,
            },
          },
          grid: {
            color: gridColor,
          },
        },
        y: {
          beginAtZero: false,
          ticks: {
            color: labelColor,
            font: {
              size: 11,
            },
          },
          grid: {
            color: gridColor,
          },
        },
      },
    },
  });
}

/* ─────────────────────────────────────────────────────────── */
/* 19. ACHIEVEMENTS                                            */
/* ─────────────────────────────────────────────────────────── */
const ACHIEVEMENTS = [
  {
    id: "hydration-hero",
    icon: "💧",
    name: "Hydration Hero",
    desc: "Drink 2L for 7 days",
    check: () => waterState.consumed >= 2000,
    max: 7,
  },
  {
    id: "step-master",
    icon: "👟",
    name: "Step Master",
    desc: "10K steps for 30 days",
    check: () => stepsState.current >= 10000,
    max: 30,
  },
  {
    id: "streak-king",
    icon: "🔥",
    name: "Streak King",
    desc: "7 day habit streak",
    check: () => habits.some((h) => h.streak >= 7),
    max: 7,
  },
  {
    id: "bmi-tracker",
    icon: "⚖️",
    name: "BMI Tracker",
    desc: "Log BMI 5 times",
    check: () => bmiHistory.length >= 5,
    max: 5,
  },
];

function updateAchievements() {
  const grid = $("achievementsGrid");
  if (!grid) return;

  const progress = Store.get("achievement-progress", {});

  grid.innerHTML = ACHIEVEMENTS.map((ach) => {
    const prog = progress[ach.id] || 0;
    const unlocked = prog >= ach.max;
    const current = Math.min(prog, ach.max);

    return `
      <div class="achievement-badge ${
        unlocked ? "achievement-unlocked" : "achievement-locked"
      }">
        <div class="achievement-icon">${ach.icon}${unlocked ? " ✨" : ""}</div>
        <div class="achievement-name">${ach.name}</div>
        <div class="achievement-desc">${ach.desc}</div>
        <div class="achievement-progress">
          ${current}/${ach.max} ${unlocked ? "🏆" : ""}
        </div>
      </div>`;
  }).join("");
}

function checkAndUpdateAchievements() {
  const progress = Store.get("achievement-progress", {});
  let changed = false;

  ACHIEVEMENTS.forEach((ach) => {
    const old = progress[ach.id] || 0;

    if (ach.check()) {
      progress[ach.id] = Math.min(old + 1, ach.max);

      if (progress[ach.id] !== old) changed = true;

      if (progress[ach.id] === ach.max && old < ach.max) {
        setTimeout(() => {
          toast(`🏆 Achievement unlocked: ${ach.name}!`, "success", 4000);
        }, 800);
      }
    }
  });

  if (changed) {
    Store.set("achievement-progress", progress);
    updateAchievements();
  }
}

/* ─────────────────────────────────────────────────────────── */
/* 20. EXPORT / IMPORT / RESET                                 */
/* ─────────────────────────────────────────────────────────── */
function exportData() {
  const snapshot = {
    exported: new Date().toISOString(),
    version: "2.0",
    waterState,
    stepsState,
    meals,
    reminders,
    habits,
    bmiHistory,
  };

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `healthdash-export-${new Date().toISOString().slice(0, 10)}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);

  toast("📥 Data exported successfully!", "success");
}

function importData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);

        if (data.waterState) {
          waterState = data.waterState;
          Store.set("water", waterState);
        }

        if (data.stepsState) {
          stepsState = data.stepsState;
          Store.set("steps", stepsState);
        }

        if (data.meals) {
          meals = data.meals;
          Store.set("meals", meals);
        }

        if (data.reminders) {
          reminders = data.reminders;
          Store.set("reminders", reminders);
        }

        if (data.habits) {
          habits = data.habits;
          Store.set("habits", habits);
        }

        if (data.bmiHistory) {
          bmiHistory = data.bmiHistory;
          Store.set("bmi-history", bmiHistory);
        }

        initApp();
        toast("✅ Data imported successfully!", "success");
      } catch {
        toast("❌ Invalid file. Please use a HealthDash export.", "error");
      }
    };

    reader.readAsText(file);
  });

  input.click();
}

function resetAllData() {
  if (
    !confirm("⚠️ This will delete ALL your HealthDash data.\n\nAre you sure?")
  ) {
    return;
  }

  Store.clearAll();
  location.reload();
}

window.exportData = exportData;
window.importData = importData;
window.resetAllData = resetAllData;

/* ─────────────────────────────────────────────────────────── */
/* 21. PROFILE SAVE                                            */
/* ─────────────────────────────────────────────────────────── */
function saveProfile() {
  const profile = {
    name: $("userName")?.value.trim() || "",
    age: Number($("userAge")?.value) || 0,
    gender: $("userGender")?.value || "",
  };

  Store.set("profile", profile);
  toast("✅ Profile saved!", "success");
}

function loadProfile() {
  const profile = Store.get("profile", {});

  if ($("userName") && profile.name) $("userName").value = profile.name;
  if ($("userAge") && profile.age) $("userAge").value = profile.age;
  if ($("userGender") && profile.gender) $("userGender").value = profile.gender;
}

document
  .querySelector(".card-profile .hd-btn-primary")
  ?.addEventListener("click", saveProfile);

/* ─────────────────────────────────────────────────────────── */
/* 22. SETTINGS TOGGLES                                        */
/* ─────────────────────────────────────────────────────────── */
function loadSettings() {
  const sound = Store.get("sound-enabled", true);
  const notif = Store.get("notifications", false);
  const autoT = Store.get("auto-theme", false);

  if ($("soundToggle")) $("soundToggle").checked = sound;
  if ($("notifToggle")) $("notifToggle").checked = notif;
  if ($("autoThemeToggle")) $("autoThemeToggle").checked = autoT;
  if ($("enableNotifications")) $("enableNotifications").checked = notif;
}

$("soundToggle")?.addEventListener("change", (e) => {
  Store.set("sound-enabled", e.target.checked);
  toast(e.target.checked ? "Sound on" : "Sound off", "info");
});

$("notifToggle")?.addEventListener("change", (e) => {
  Store.set("notifications", e.target.checked);

  if (e.target.checked) requestNotifPermission();

  toast(
    e.target.checked ? "Notifications enabled" : "Notifications disabled",
    "info",
  );
});

$("autoThemeToggle")?.addEventListener("change", (e) => {
  Store.set("auto-theme", e.target.checked);

  if (e.target.checked) {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    applyTheme(prefersDark ? "dark" : "light");
  }
});

/* ─────────────────────────────────────────────────────────── */
/* 23. CARD MENU                                               */
/* ─────────────────────────────────────────────────────────── */
function toggleCardMenu() {
  toast("Options coming soon", "info");
}

window.toggleCardMenu = toggleCardMenu;

/* ─────────────────────────────────────────────────────────── */
/* 24. PWA INSTALL PROMPT                                      */
/* ─────────────────────────────────────────────────────────── */
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const promptEl = $("pwaInstallPrompt");

  if (promptEl && !Store.get("pwa-dismissed", false)) {
    promptEl.style.display = "flex";
    setTimeout(() => promptEl.classList.add("show"), 100);
  }
});

$("pwaInstallBtn")?.addEventListener("click", async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();

  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;

  const promptEl = $("pwaInstallPrompt");

  if (promptEl) {
    promptEl.classList.remove("show");
    setTimeout(() => {
      promptEl.style.display = "none";
    }, 300);
  }

  if (outcome === "accepted") toast("🎉 App installed!", "success");
});

$("pwaDismissBtn")?.addEventListener("click", () => {
  Store.set("pwa-dismissed", true);

  const promptEl = $("pwaInstallPrompt");

  if (promptEl) {
    promptEl.classList.remove("show");
    setTimeout(() => {
      promptEl.style.display = "none";
    }, 300);
  }
});

/* ─────────────────────────────────────────────────────────── */
/* 25. KEYBOARD & SWIPE SHORTCUTS                              */
/* ─────────────────────────────────────────────────────────── */
const TAB_ORDER = ["dashboard", "habits", "sleep", "mood", "profile"];

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    $("notificationPanel")?.classList.remove("active");
    $("settingsPanel")?.classList.remove("active");
  }

  if (
    e.altKey &&
    !isNaN(e.key) &&
    Number(e.key) >= 1 &&
    Number(e.key) <= TAB_ORDER.length
  ) {
    e.preventDefault();
    switchTab(TAB_ORDER[Number(e.key) - 1]);
  }
});

(function initSwipe() {
  let touchStartX = 0;

  document.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].clientX;
    },
    { passive: true },
  );

  document.addEventListener(
    "touchend",
    (e) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      const target = e.target.closest(".tab-section");

      if (!target) return;
      if (Math.abs(deltaX) < 60) return;

      const current = TAB_ORDER.findIndex((t) =>
        $("tab-" + t)?.classList.contains("active"),
      );

      if (current === -1) return;

      if (deltaX < 0 && current < TAB_ORDER.length - 1) {
        switchTab(TAB_ORDER[current + 1]);
      } else if (deltaX > 0 && current > 0) {
        switchTab(TAB_ORDER[current - 1]);
      }
    },
    { passive: true },
  );
})();

/* ─────────────────────────────────────────────────────────── */
/* 26. DAILY RESET                                             */
/* ─────────────────────────────────────────────────────────── */
function checkDailyReset() {
  const today = new Date().toDateString();
  const last = Store.get("last-reset-date", "");

  if (last !== today) {
    waterState.consumed = 0;
    waterState.history = [];
    meals = [];

    habits = habits.map((h) => ({
      ...h,
      done: h.lastDone === today ? h.done : false,
    }));

    Store.set("water", waterState);
    Store.set("meals", meals);
    Store.set("habits", habits);
    Store.set("last-reset-date", today);
  }
}

/* ─────────────────────────────────────────────────────────── */
/* 27. INIT                                                    */
/* ─────────────────────────────────────────────────────────── */
function initApp() {
  checkDailyReset();

  applyTheme(Store.get("theme", "dark"));

  renderWater();
  renderSteps();
  renderMeals();
  renderReminders();
  renderHabits();
  updateAchievements();
  renderBmiChart();
  renderWeeklyChart(currentChartType);
  loadProfile();
  loadSettings();
  updateQuickStreak();

  const savedTab = Store.get("active-tab", "dashboard");
  switchTab(savedTab);

  startReminderChecker();

  if (!window.__achievementTimerStarted) {
    window.__achievementTimerStarted = true;
    setInterval(checkAndUpdateAchievements, 60000);
  }

  const activeChartBtn = document.querySelector(
    `.chart-tab[onclick*="${currentChartType}"]`,
  );

  if (activeChartBtn) {
    $$(".chart-tab").forEach((b) => b.classList.remove("active"));
    activeChartBtn.classList.add("active");
  }

  appReady = true;

  console.info(
    "%c HealthDash Pro v2.0 %c Ready ",
    "background:#00d4aa;color:#000;font-weight:900;padding:4px 8px;border-radius:4px 0 0 4px",
    "background:#00a3ff;color:#fff;font-weight:700;padding:4px 8px;border-radius:0 4px 4px 0",
  );
}

document.addEventListener("DOMContentLoaded", initApp);
