/*
 * app.js — logique d'interface : navigation entre onglets, formulaire
 * de saisie d'une œuvre, historique et bilan.
 */

const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;

    tabButtons.forEach((b) => {
      b.classList.toggle("active", b === btn);
      b.setAttribute("aria-selected", b === btn ? "true" : "false");
    });
    tabPanels.forEach((panel) =>
      panel.classList.toggle("active", panel.id === target)
    );
    window.scrollTo(0, 0);

    if (target === "history") renderHistory();
    if (target === "dashboard") renderDashboard();
  });
});

/* --- Utilitaires d'interface --- */

// Les titres et notes viennent de l'utilisateur : on les échappe avant de
// les injecter dans du HTML.
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
  ));
}

const toastEl = document.getElementById("toast");
let toastTimer = null;

function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add("visible"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("visible");
    setTimeout(() => (toastEl.hidden = true), 250);
  }, 2400);
}

// window.confirm() est désactivé en silence dans une app installée sur
// l'écran d'accueil de l'iPhone : on utilise donc une vraie feuille de dialogue.
function confirmDialog(message, confirmLabel = "Supprimer") {
  const overlay = document.getElementById("confirm-overlay");
  const yes = document.getElementById("confirm-yes");
  const no = document.getElementById("confirm-no");
  document.getElementById("confirm-message").textContent = message;
  yes.textContent = confirmLabel;
  overlay.hidden = false;

  return new Promise((resolve) => {
    const finish = (answer) => {
      overlay.hidden = true;
      yes.removeEventListener("click", onYes);
      no.removeEventListener("click", onNo);
      overlay.removeEventListener("click", onBackdrop);
      resolve(answer);
    };
    const onYes = () => finish(true);
    const onNo = () => finish(false);
    const onBackdrop = (event) => {
      if (event.target === overlay) finish(false);
    };
    yes.addEventListener("click", onYes);
    no.addEventListener("click", onNo);
    overlay.addEventListener("click", onBackdrop);
  });
}

/* --- Formulaire de saisie --- */

const categoryPicker = document.getElementById("category-picker");
const entryForm = document.getElementById("entry-form");
const titleInput = document.getElementById("entry-title");
const mediumField = document.getElementById("medium-field");
const mediumLabel = document.getElementById("medium-label");
const mediumSelect = document.getElementById("entry-medium");
const locationField = document.getElementById("location-field");
const locationInput = document.getElementById("entry-location");
const dateInput = document.getElementById("entry-date");
const ratingStars = document.getElementById("rating-stars");
const ratingInput = document.getElementById("entry-rating");
const notesInput = document.getElementById("entry-notes");
const entryFormTitleText = document.getElementById("entry-form-title-text");
const entrySubmitBtn = document.getElementById("entry-submit-btn");
const newEntrySection = document.getElementById("new-entry");
const entryFormWrapper = document.getElementById("entry-form-wrapper");
const editModalOverlay = document.getElementById("edit-modal-overlay");
const modalFormSlot = document.getElementById("modal-form-slot");
const modalCloseBtn = document.getElementById("modal-close-btn");
const detailModalOverlay = document.getElementById("detail-modal-overlay");
const detailContent = document.getElementById("detail-content");
const detailCloseBtn = document.getElementById("detail-close-btn");

let selectedCategory = null;
let selectedRating = null;
let editingEntryId = null;

function openEditModal() {
  modalFormSlot.appendChild(entryFormWrapper);
  editModalOverlay.hidden = false;
}

function closeEditModal() {
  newEntrySection.appendChild(entryFormWrapper);
  editModalOverlay.hidden = true;
}

modalCloseBtn.addEventListener("click", () => {
  resetFormFields();
  exitEditMode();
  closeEditModal();
});

editModalOverlay.addEventListener("click", (event) => {
  if (event.target === editModalOverlay) {
    resetFormFields();
    exitEditMode();
    closeEditModal();
  }
});

function renderCategoryPicker() {
  CATEGORIES.forEach((category) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-btn";
    btn.dataset.id = category.id;
    btn.textContent = category.label;
    btn.addEventListener("click", () => selectCategory(category));
    categoryPicker.appendChild(btn);
  });
}

function selectCategory(category) {
  selectedCategory = category;
  document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.id === category.id);
  });
  locationField.hidden = !category.hasLocation;

  if (category.mediums) {
    mediumLabel.textContent = `${category.mediumLabel || "Diffusion"} (optionnel)`;
    mediumSelect.innerHTML =
      `<option value="">—</option>` +
      category.mediums.map((m) => `<option value="${m}">${m}</option>`).join("");
    mediumField.hidden = false;
  } else {
    mediumSelect.innerHTML = "";
    mediumField.hidden = true;
  }
}

function renderRatingStars() {
  for (let value = 1; value <= 5; value++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "star-btn";
    btn.dataset.value = value;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8Z"/></svg>`;
    btn.addEventListener("click", () => {
      setRating(selectedRating === value ? null : value);
    });
    ratingStars.appendChild(btn);
  }
}

function setRating(value) {
  selectedRating = value;
  ratingInput.value = value || "";
  document.querySelectorAll(".star-btn").forEach((btn) => {
    btn.classList.toggle("filled", value && Number(btn.dataset.value) <= value);
  });
}

function parseISODate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function resetFormFields() {
  entryForm.reset();
  setSelectedDate(new Date());
  setRating(null);
  locationField.hidden = true;
  mediumField.hidden = true;
  mediumSelect.innerHTML = "";
  document
    .querySelectorAll(".category-btn")
    .forEach((btn) => btn.classList.remove("selected"));
  selectedCategory = null;
}

function exitEditMode() {
  editingEntryId = null;
  entryFormTitleText.textContent = "Nouvelle entrée";
  entrySubmitBtn.textContent = "Consigner";
}

function editEntry(entry) {
  const category = CATEGORIES.find((c) => c.id === entry.category);
  selectCategory(category);
  titleInput.value = entry.title;
  mediumSelect.value = entry.medium || "";
  locationInput.value = entry.location || "";
  setSelectedDate(parseISODate(entry.date));
  setRating(entry.rating || null);
  notesInput.value = entry.notes || "";

  editingEntryId = entry.id;
  entryFormTitleText.textContent = "Modifier l'entrée";
  entrySubmitBtn.textContent = "Consigner les modifications";

  openEditModal();
}

entryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedCategory) {
    showToast("Choisis une catégorie avant d'enregistrer.");
    return;
  }

  const title = titleInput.value.trim();
  if (!title) {
    showToast("Indique un titre.");
    return;
  }

  const entryData = {
    category: selectedCategory.id,
    title,
    date: dateInput.value,
    rating: selectedRating,
    medium:
      selectedCategory.mediums && mediumSelect.value ? mediumSelect.value : null,
    location:
      selectedCategory.hasLocation && locationInput.value
        ? locationInput.value.trim()
        : null,
    notes: notesInput.value.trim(),
  };

  const wasEditing = Boolean(editingEntryId);
  if (wasEditing) {
    await Storage.updateEntry(editingEntryId, entryData);
    renderHistory();
    renderDashboard();
  } else {
    await Storage.addEntry(entryData);
    showToast("Entrée consignée");
  }

  resetFormFields();
  exitEditMode();
  if (wasEditing) closeEditModal();
});

renderCategoryPicker();
renderRatingStars();

/* --- Historique --- */

const historyList = document.getElementById("history-list");
const historySearchInput = document.getElementById("history-search");
const historyPeriodTabs = document.querySelectorAll("#history-period-tabs .period-btn");
const historyCategoryFilter = document.getElementById("history-category-filter");
const historyPeriodNav = document.getElementById("history-period-nav");
const historyPeriodLabel = document.getElementById("history-period-label");

let historyPeriod = "all";
let historyCategory = "all";
let historyOffset = 0;
let historySearchQuery = "";

historySearchInput.addEventListener("input", () => {
  historySearchQuery = historySearchInput.value.trim().toLowerCase();
  renderHistory();
});

function formatDisplayDate(iso) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function formatStars(rating) {
  if (!rating) return null;
  return "★★★★★☆☆☆☆☆".slice(5 - rating, 10 - rating);
}

function openDetailModal(entry) {
  const category = CATEGORIES.find((c) => c.id === entry.category);
  const stars = formatStars(entry.rating);

  const metaParts = [formatDisplayDate(entry.date)];
  if (entry.medium) metaParts.push(escapeHTML(entry.medium));
  if (entry.location) metaParts.push(escapeHTML(entry.location));

  detailContent.innerHTML = `
    <span class="entry-tag">${category.label}</span>
    <h3 class="detail-title">${escapeHTML(entry.title)}</h3>
    <p class="detail-meta">${metaParts.join(" · ")}</p>
    <div class="detail-block">
      <p class="detail-label">Note</p>
      <p class="detail-rating">${stars ? `<span class="detail-stars">${stars}</span><span>${entry.rating}/5</span>` : "Non notée"}</p>
    </div>
    <div class="detail-block">
      <p class="detail-label">Note libre</p>
      <p class="detail-notes">${entry.notes ? escapeHTML(entry.notes) : "Aucune note écrite pour cette entrée."}</p>
    </div>
  `;

  detailModalOverlay.hidden = false;
}

function closeDetailModal() {
  detailModalOverlay.hidden = true;
}

detailCloseBtn.addEventListener("click", closeDetailModal);

detailModalOverlay.addEventListener("click", (event) => {
  if (event.target === detailModalOverlay) closeDetailModal();
});

function renderHistoryCategoryChips() {
  CATEGORIES.forEach((category) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "category-chip";
    chip.dataset.category = category.id;
    chip.textContent = category.label;
    chip.addEventListener("click", () => {
      historyCategory = category.id;
      document
        .querySelectorAll(".category-chip")
        .forEach((c) => c.classList.toggle("active", c === chip));
      renderHistory();
    });
    historyCategoryFilter.appendChild(chip);
  });
}

historyCategoryFilter
  .querySelector('[data-category="all"]')
  .addEventListener("click", (event) => {
    historyCategory = "all";
    document
      .querySelectorAll(".category-chip")
      .forEach((c) => c.classList.toggle("active", c === event.currentTarget));
    renderHistory();
  });

historyPeriodTabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    historyPeriod = btn.dataset.period;
    historyOffset = 0;
    historyPeriodTabs.forEach((b) => b.classList.toggle("active", b === btn));
    historyPeriodNav.hidden = historyPeriod === "all";
    renderHistory();
  });
});

document.querySelectorAll("[data-history-nav]").forEach((btn) => {
  btn.addEventListener("click", () => {
    historyOffset += btn.dataset.historyNav === "next" ? 1 : -1;
    renderHistory();
  });
});

historyPeriodLabel.addEventListener("click", () => {
  if (historyOffset !== 0) {
    historyOffset = 0;
    renderHistory();
  }
});

function renderHistory() {
  let entries = Storage.getEntries();
  const hadAnyEntry = entries.length > 0;

  if (historyPeriod !== "all") {
    const range = getPeriodRange(historyPeriod, historyOffset);
    historyPeriodLabel.textContent = formatPeriodLabel(historyPeriod, range);
    const startISO = toISO(range.start);
    const endISO = toISO(range.end);
    entries = entries.filter((e) => e.date >= startISO && e.date <= endISO);
  }

  if (historyCategory !== "all") {
    entries = entries.filter((e) => e.category === historyCategory);
  }

  if (historySearchQuery) {
    entries = entries.filter((e) => {
      const haystack = [e.title, e.location, e.medium, e.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(historySearchQuery);
    });
  }

  entries = entries.sort((a, b) => b.date.localeCompare(a.date));

  if (entries.length === 0) {
    historyList.innerHTML = hadAnyEntry
      ? `<p class="placeholder">Aucune entrée ne correspond à ce filtre.</p>`
      : `<p class="placeholder">Aucune œuvre enregistrée pour l'instant.<br>Direction l'onglet "Ajouter" pour ajouter la première !</p>`;
    return;
  }

  historyList.innerHTML = "";

  entries.forEach((entry, index) => {
    const category = CATEGORIES.find((c) => c.id === entry.category);
    const stars = formatStars(entry.rating);
    const num = String(index + 1).padStart(3, "0");

    const item = document.createElement("div");
    item.className = "entry-item";
    item.addEventListener("click", () => openDetailModal(entry));

    item.innerHTML = `
      <div class="entry-num">${num}</div>
      <div class="entry-info">
        <div class="entry-title-text">${escapeHTML(entry.title)}</div>
        <div class="entry-meta">
          <span class="entry-tag">${category.label}</span>
          ${stars ? `<span class="entry-stars">${stars}</span>` : ""}
          <span class="entry-detail">${formatDisplayDate(entry.date)}</span>
          ${entry.medium ? `<span class="entry-detail">${escapeHTML(entry.medium)}</span>` : ""}
          ${entry.location ? `<span class="entry-detail">${escapeHTML(entry.location)}</span>` : ""}
        </div>
        ${entry.notes ? `<div class="entry-note">${escapeHTML(entry.notes)}</div>` : ""}
      </div>
      <div class="entry-actions">
        <button type="button" class="entry-action-btn" data-action="edit" aria-label="Modifier l'entrée">
          <i class="ph ph-pencil-simple" aria-hidden="true"></i>
        </button>
        <button type="button" class="entry-action-btn entry-delete" data-action="delete" aria-label="Supprimer l'entrée">
          <i class="ph ph-trash" aria-hidden="true"></i>
        </button>
      </div>
    `;

    item.querySelector('[data-action="edit"]').addEventListener("click", (event) => {
      event.stopPropagation();
      editEntry(entry);
    });
    item.querySelector('[data-action="delete"]').addEventListener("click", async (event) => {
      event.stopPropagation();
      if (await confirmDialog(`Supprimer «\u00a0${entry.title}\u00a0»\u00a0?`)) {
        await Storage.deleteEntry(entry.id);
        renderHistory();
        renderDashboard();
        showToast("Entrée supprimée");
      }
    });

    historyList.appendChild(item);
  });
}

renderHistoryCategoryChips();

/* --- Bilan --- */

const summaryCard = document.getElementById("summary-card");
const categoryStats = document.getElementById("category-stats");
const periodButtons = document.querySelectorAll("#dashboard-period-tabs .period-btn");
const dashboardPeriodLabel = document.getElementById("dashboard-period-label");
const dashboardPeriodNav = document.getElementById("dashboard-period-nav");

let currentPeriod = "year";
let dashboardOffset = 0;

function getPeriodRange(period, offset = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (period === "week") {
    const offsetFromMonday = (today.getDay() + 6) % 7;
    const start = new Date(today);
    start.setDate(today.getDate() - offsetFromMonday + offset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }

  if (period === "month") {
    return {
      start: new Date(today.getFullYear(), today.getMonth() + offset, 1),
      end: new Date(today.getFullYear(), today.getMonth() + offset + 1, 0),
    };
  }

  return {
    start: new Date(today.getFullYear() + offset, 0, 1),
    end: new Date(today.getFullYear() + offset, 11, 31),
  };
}

function formatPeriodLabel(period, range) {
  if (period === "week") {
    const startLabel = `${range.start.getDate()} ${MONTHS_FR[range.start.getMonth()]}`;
    const endLabel = `${range.end.getDate()} ${MONTHS_FR[range.end.getMonth()]} ${range.end.getFullYear()}`;
    return `${startLabel} – ${endLabel}`;
  }

  if (period === "month") {
    return `${MONTHS_FR[range.start.getMonth()]} ${range.start.getFullYear()}`;
  }

  return `${range.start.getFullYear()}`;
}

periodButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentPeriod = btn.dataset.period;
    dashboardOffset = 0;
    periodButtons.forEach((b) => b.classList.toggle("active", b === btn));
    dashboardPeriodNav.hidden = currentPeriod === "all";
    renderDashboard();
  });
});

document.querySelectorAll("[data-dashboard-nav]").forEach((btn) => {
  btn.addEventListener("click", () => {
    dashboardOffset += btn.dataset.dashboardNav === "next" ? 1 : -1;
    renderDashboard();
  });
});

dashboardPeriodLabel.addEventListener("click", () => {
  if (dashboardOffset !== 0) {
    dashboardOffset = 0;
    renderDashboard();
  }
});

function renderDashboard() {
  let entries = Storage.getEntries();

  if (currentPeriod !== "all") {
    const range = getPeriodRange(currentPeriod, dashboardOffset);
    dashboardPeriodLabel.textContent = formatPeriodLabel(currentPeriod, range);
    const startISO = toISO(range.start);
    const endISO = toISO(range.end);
    entries = entries.filter((e) => e.date >= startISO && e.date <= endISO);
  }

  const ratedEntries = entries.filter((e) => e.rating);
  const avgRating = ratedEntries.length
    ? ratedEntries.reduce((sum, e) => sum + e.rating, 0) / ratedEntries.length
    : null;

  summaryCard.innerHTML = `
    <div class="summary-row">
      <span class="summary-label">Œuvre${entries.length > 1 ? "s" : ""}</span>
      <span class="summary-value">${entries.length.toLocaleString("fr-FR")}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Note moyenne</span>
      <span class="summary-value">${avgRating !== null ? `${avgRating.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/5` : "—"}</span>
    </div>
  `;

  if (entries.length === 0) {
    categoryStats.innerHTML = `<p class="placeholder">Aucune œuvre sur cette période.</p>`;
    return;
  }

  categoryStats.innerHTML = "";

  if (currentPeriod === "year") {
    renderMonthlyBreakdown(entries);
  } else {
    renderCategoryBreakdown(entries, categoryStats);
  }
}

function renderCategoryBreakdown(entries, container) {
  CATEGORIES.map((category) => {
    const categoryEntries = entries.filter((e) => e.category === category.id);
    return { category, categoryEntries };
  })
    .filter((entry) => entry.categoryEntries.length > 0)
    .sort((a, b) => b.categoryEntries.length - a.categoryEntries.length)
    .forEach(({ category, categoryEntries }) => {
      const pct = entries.length > 0 ? Math.round((categoryEntries.length / entries.length) * 100) : null;
      const item = document.createElement("div");
      item.className = "category-stat-item";

      item.innerHTML = `
        <div class="category-stat-name">${category.label}</div>
        ${pct !== null ? `<div class="category-pct-badge">${pct}%</div>` : ""}
        <div class="category-stat-numbers">${categoryEntries.length} œuvre${categoryEntries.length > 1 ? "s" : ""}</div>
        <div class="category-stat-bar"><span style="width: ${pct || 0}%"></span></div>
      `;

      container.appendChild(item);
    });
}

function renderMonthlyBreakdown(entries) {
  const byMonth = new Map();
  entries.forEach((entry) => {
    const month = Number(entry.date.slice(5, 7)) - 1;
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month).push(entry);
  });

  Array.from(byMonth.keys())
    .sort((a, b) => a - b)
    .forEach((month) => {
      const monthEntries = byMonth.get(month);

      const separator = document.createElement("div");
      separator.className = "month-separator";
      separator.innerHTML = `
        <span class="month-name">${MONTHS_FR[month]}</span>
        <span class="month-count">${monthEntries.length} œuvre${monthEntries.length > 1 ? "s" : ""}</span>
      `;
      categoryStats.appendChild(separator);

      renderCategoryBreakdown(monthEntries, categoryStats);
    });
}

renderDashboard();
