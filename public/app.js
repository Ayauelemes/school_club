// ==========================================================================
// APP STATE
// ==========================================================================
const state = {
  user: null, // Logged in user metadata { id, username, role, studentId, name }
  clubs: [], // Full clubs array from API
  currentFilter: "all",
  searchQuery: "",
  selectedClubIdForAdmin: null, // ID of selected club in teacher/admin dashboard
  activeTeacherTab: "students", // 'students' or 'attendance'
  selectedAttendanceDate: new Date().toISOString().split('T')[0], // 'YYYY-MM-DD'
  attendanceList: [], // Attendance records of the active club & date
  studentsList: [], // Registered student profiles in the active club
  searchStudentsQuery: "", // Search input inside selected club list
  schedulePreferences: null,
  teachers: []
};

// Base URL for API requests
const API_URL = "/api";

// ==========================================================================
// SESSION MANAGEMENT & INITIALIZATION
// ==========================================================================
function loadUserSession() {
  const savedUser = localStorage.getItem("mektep_user");
  if (savedUser) {
    try {
      state.user = JSON.parse(savedUser);
    } catch (e) {
      console.error("Error parsing user session:", e);
      state.user = null;
      localStorage.removeItem("mektep_user");
    }
  }
}

function saveUserSession(user) {
  state.user = user;
  if (user) {
    localStorage.setItem("mektep_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("mektep_user");
  }
  updateUIForUserSession();
}

function updateUIForUserSession() {
  const btnLoginTrigger = document.getElementById("btn-login-trigger");
  const userProfileSummary = document.getElementById("user-profile-summary");
  const userDisplayName = document.getElementById("user-display-name");
  const navDashboard = document.getElementById("nav-dashboard");
  const guestAlert = document.getElementById("guest-alert");

  if (state.user) {
    // User logged in
    btnLoginTrigger.classList.add("hidden");
    userProfileSummary.classList.remove("hidden");
    userDisplayName.innerText = `${state.user.role === 'student' ? 'Оқушы: ' : 'Ұстаз: '}${state.user.name}`;
    navDashboard.classList.remove("hidden");
    if (guestAlert) guestAlert.classList.add("hidden");
  } else {
    // Guest
    btnLoginTrigger.classList.remove("hidden");
    userProfileSummary.classList.add("hidden");
    navDashboard.classList.add("hidden");
    if (guestAlert) guestAlert.classList.remove("hidden");
    
    // Fallback view to catalog
    switchView("view-catalog");
  }
}

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  let iconSvg = "";
  if (type === "success") {
    iconSvg = `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  } else if (type === "error") {
    iconSvg = `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`;
  } else {
    iconSvg = `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12" y1="16" y2="16"/></svg>`;
  }

  toast.innerHTML = `
    ${iconSvg}
    <div class="toast-content">${message}</div>
  `;

  container.appendChild(toast);

  // Trigger slide out and removal
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s forwards";
    toast.addEventListener("animationend", () => {
      toast.remove();
    });
  }, 4000);
}

// Add CSS keyframe if not present
const styleSheet = document.createElement("style");
styleSheet.innerHTML = `
@keyframes slideOut {
  to { transform: translateX(120%); opacity: 0; }
}
`;
document.head.appendChild(styleSheet);

// ==========================================================================
// THEME SWITCHER
// ==========================================================================
function initTheme() {
  const savedTheme = localStorage.getItem("mektep_theme");
  const body = document.body;
  const sunIcon = document.getElementById("theme-sun");
  const moonIcon = document.getElementById("theme-moon");

  if (savedTheme === "light") {
    body.classList.remove("dark-theme");
    body.classList.add("light-theme");
    sunIcon.classList.add("hidden");
    moonIcon.classList.remove("hidden");
  } else {
    body.classList.remove("light-theme");
    body.classList.add("dark-theme");
    sunIcon.classList.remove("hidden");
    moonIcon.classList.add("hidden");
  }
}

function toggleTheme() {
  const body = document.body;
  const sunIcon = document.getElementById("theme-sun");
  const moonIcon = document.getElementById("theme-moon");

  if (body.classList.contains("dark-theme")) {
    body.classList.remove("dark-theme");
    body.classList.add("light-theme");
    sunIcon.classList.add("hidden");
    moonIcon.classList.remove("hidden");
    localStorage.setItem("mektep_theme", "light");
    showToast("Жарық тақырып іске қосылды", "success");
  } else {
    body.classList.remove("light-theme");
    body.classList.add("dark-theme");
    sunIcon.classList.remove("hidden");
    moonIcon.classList.add("hidden");
    localStorage.setItem("mektep_theme", "dark");
    showToast("Қараңғы тақырып іске қосылды", "success");
  }
}

// ==========================================================================
// VIEW NAVIGATION & TABS SWITCHING
// ==========================================================================
function switchView(viewId) {
  const views = ["view-catalog", "view-student-dashboard", "view-teacher-dashboard"];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === viewId) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    }
  });

  // Highlight active header menu button
  const navCatalog = document.getElementById("nav-catalog");
  const navDashboard = document.getElementById("nav-dashboard");

  if (viewId === "view-catalog") {
    navCatalog.classList.add("active");
    navDashboard.classList.remove("active");
  } else {
    navCatalog.classList.remove("active");
    navDashboard.classList.add("active");
  }
}

function setupNavigation() {
  const navCatalog = document.getElementById("nav-catalog");
  const navDashboard = document.getElementById("nav-dashboard");

  navCatalog.addEventListener("click", () => {
    switchView("view-catalog");
    fetchAndRenderClubs();
  });

  navDashboard.addEventListener("click", () => {
    if (!state.user) {
      showToast("Алдымен жүйеге кіру қажет", "warning");
      openLoginModal();
      return;
    }

    if (state.user.role === "student") {
      switchView("view-student-dashboard");
      loadStudentDashboard();
    } else {
      switchView("view-teacher-dashboard");
      loadTeacherDashboard();
    }
  });
}

// ==========================================================================
// FETCHING DATA FROM REST API
// ==========================================================================
async function fetchAndRenderClubs() {
  try {
    const res = await fetch(`${API_URL}/clubs`);
    if (!res.ok) throw new Error("Үйірмелерді алу қатесі");
    state.clubs = await res.json();
    renderClubsGrid();
  } catch (err) {
    console.error(err);
    showToast("Үйірмелер тізімін жүктеу мүмкін болмады", "error");
  }
}

function getCategoryNameKz(cat) {
  switch (cat) {
    case "Sport": return "Спорт";
    case "Science": return "Ғылым";
    case "Art": return "Өнер";
    case "Tech": return "Технология";
    default: return cat;
  }
}

function getClubImageUrl(image, category) {
  if (image && /^https?:\/\//i.test(image)) return image;
  if (image) return `img/${image}.png`;
  return `img/${category.toLowerCase()}.png`;
}

function renderClubsGrid() {
  const container = document.getElementById("clubs-container");
  if (!container) return;

  container.innerHTML = "";

  const filteredClubs = state.clubs.filter(club => {
    const matchesFilter = state.currentFilter === "all" || club.category === state.currentFilter;
    const matchesSearch = club.name.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
                          club.instructor_name.toLowerCase().includes(state.searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Catalog title counter badge
  const counterBadge = document.getElementById("clubs-count-badge");
  if (counterBadge) {
    counterBadge.innerText = `${filteredClubs.length} үйірме`;
  }

  // General counts in Hero banner
  let totalPlaces = 0;
  state.clubs.forEach(c => {
    totalPlaces += Math.max(0, c.capacity - c.registered_count);
  });
  const heroTotalClubs = document.getElementById("hero-total-clubs");
  const heroTotalPlaces = document.getElementById("hero-total-places");
  if (heroTotalClubs) heroTotalClubs.innerText = `${state.clubs.length}+`;
  if (heroTotalPlaces) heroTotalPlaces.innerText = `${totalPlaces}+`;

  if (filteredClubs.length === 0) {
    container.innerHTML = `
      <div class="empty-table-state" style="grid-column: 1 / -1;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="empty-icon"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <p>Іздеуіңізге сәйкес келетін үйірмелер табылмады.</p>
      </div>
    `;
    return;
  }

  filteredClubs.forEach(club => {
    const remainingPlaces = club.capacity - club.registered_count;
    const isFull = remainingPlaces <= 0;
    const occupancyPercent = (club.registered_count / club.capacity) * 100;

    let barColorClass = "normal";
    if (occupancyPercent >= 100) barColorClass = "full";
    else if (occupancyPercent >= 80) barColorClass = "warning";

    const card = document.createElement("div");
    card.className = "club-card glass-panel";

    const cardImageStyle = `background-image: url('${getClubImageUrl(club.image, club.category)}');`;

    card.innerHTML = `
      <div class="club-card-image" style="${cardImageStyle}">
        <span class="category-tag ${club.category.toLowerCase()}">${getCategoryNameKz(club.category)}</span>
      </div>
      <div class="club-card-content">
        <h3>${club.name}</h3>
        <p class="club-desc">${club.description}</p>
        
        <div class="club-details-list">
          <div class="club-detail-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            <span>Жетекші: <strong>${club.instructor_name}</strong></span>
          </div>
          <div class="club-detail-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            <span>Сабақ кестесі: <strong>${club.schedule}</strong></span>
          </div>
        </div>

        <div class="capacity-meter">
          <div class="capacity-labels">
            <span>Бос орындар: <strong>${isFull ? 'Жоқ' : remainingPlaces + ' орын'}</strong></span>
            <span>${club.registered_count} / ${club.capacity} оқушы</span>
          </div>
          <div class="capacity-bar-container">
            <div class="capacity-bar ${barColorClass}" style="width: ${Math.min(100, occupancyPercent)}%"></div>
          </div>
        </div>

        <div class="club-card-footer">
          <button class="primary-btn btn-register-trigger" data-club-id="${club.id}" ${isFull ? 'disabled' : ''}>
            ${isFull ? 'Орын толды' : 'Тіркелу'}
          </button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  // Click triggers to join club
  document.querySelectorAll(".btn-register-trigger").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const clubId = parseInt(e.currentTarget.getAttribute("data-club-id"));
      handleJoinClubClick(clubId);
    });
  });
}

// Handle student join button click on the card catalog
function handleJoinClubClick(clubId) {
  if (!state.user) {
    showToast("Үйірмеге жазылу үшін алдымен оқушы ретінде кіріңіз немесе тіркеліңіз.", "warning");
    openLoginModal();
    return;
  }

  if (state.user.role !== "student") {
    showToast("Тек оқушылар үйірмелерге жазыла алады", "error");
    return;
  }

  const club = state.clubs.find(c => c.id === clubId);
  if (!club) return;

  const confirmDialog = document.getElementById("register-confirm-dialog");
  const confirmText = document.getElementById("confirm-dialog-text");
  const confirmClubIdInput = document.getElementById("confirm-club-id");

  confirmClubIdInput.value = clubId;
  confirmText.innerHTML = `Сәлем, <strong>${state.user.name}</strong>! Сізді <strong>«${club.name}»</strong> үйірмесіне тіркейміз бе?`;
  confirmDialog.showModal();
}

// Confirm join action inside dialog
async function submitJoinClub() {
  const confirmClubIdInput = document.getElementById("confirm-club-id");
  const clubId = parseInt(confirmClubIdInput.value);
  if (!clubId || !state.user || !state.user.studentId) return;

  try {
    const res = await fetch(`${API_URL}/clubs/${clubId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: state.user.studentId })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Тіркелу кезінде қате кетті");
    }

    showToast("Үйірмеге сәтті тіркелдіңіз!", "success");
    document.getElementById("register-confirm-dialog").close();

    // Reload catalog data & dashboard if open
    await fetchAndRenderClubs();
  } catch (err) {
    showToast(err.message, "error");
    console.error(err);
  }
}

// ==========================================================================
// STUDENT DASHBOARD DATA LOAD & RENDERING
// ==========================================================================
async function loadStudentDashboard() {
  if (!state.user || !state.user.studentId) return;

  try {
    const res = await fetch(`${API_URL}/student/dashboard?studentId=${state.user.studentId}`);
    if (!res.ok) throw new Error("Dashboard деректерін жүктеу қатесі");
    const data = await res.json(); // { profile, clubs, attendance, stats }

    renderStudentProfile(data.profile, data.clubs.length);
    renderStudentClubs(data.clubs, data.stats);
    renderStudentSchedule(data.clubs);
    renderStudentAttendanceHistory(data.attendance);
    await loadStudentSchedulePreferences();
    loadDailyQuote();
  } catch (err) {
    console.error(err);
    showToast("Студент кабинетін жүктеу қатесі", "error");
  }
}

function renderStudentProfile(profile, activeClubsCount) {
  const profileName = document.getElementById("student-profile-name");
  const profileGrade = document.getElementById("student-profile-grade");
  const profilePhone = document.getElementById("student-profile-phone");
  const profileClubsCount = document.getElementById("student-profile-clubs-count");

  if (profileName) profileName.innerText = profile.name;
  if (profileGrade) profileGrade.innerText = `${profile.grade} сыныбы`;
  if (profilePhone) profilePhone.innerText = profile.phone;
  if (profileClubsCount) profileClubsCount.innerText = activeClubsCount;
}

// Fetch random motivational quote from external API
async function loadDailyQuote() {
  const quoteEl = document.getElementById("daily-quote");
  const authorEl = document.getElementById("daily-quote-author");

  try {
    // Call public api
    const res = await fetch("https://dummyjson.com/quotes/random");
    if (!res.ok) throw new Error("Quote API error");
    const data = await res.json();
    
    quoteEl.innerHTML = `«${data.quote}»`;
    authorEl.innerText = data.author;
  } catch (err) {
    // Fallback to Kazakh motivational quotes
    const kazakhQuotes = [
      { q: "Білім — таусылмас кен, үйрену — таусылмас жол.", a: "Халық даналығы" },
      { q: "Оқусыз білім жоқ, білімсіз күнің жоқ.", a: "Ыбырай Алтынсарин" },
      { q: "Күш — білімде, білім — кітапта.", a: "Әбілпатта" },
      { q: "Талпынған бала тас жарады.", a: "Қазақ мақалы" },
      { q: "Ақыл — тозбайтын тон, білім — таусылмайтын кен.", a: "Әл-Фараби" }
    ];
    const randomIdx = Math.floor(Math.random() * kazakhQuotes.length);
    const selected = kazakhQuotes[randomIdx];
    quoteEl.innerHTML = `«${selected.q}»`;
    authorEl.innerText = selected.a;
  }
}

function renderStudentClubs(myClubs, stats) {
  const grid = document.getElementById("student-my-clubs-grid");
  const emptyState = document.getElementById("no-registered-clubs");
  if (!grid) return;

  grid.innerHTML = "";

  if (myClubs.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  myClubs.forEach(club => {
    // Find attendance rate
    const stat = stats[club.id];
    let percentStr = "—";
    let statusClass = "";
    
    if (stat && stat.total > 0) {
      const p = Math.round((stat.present / stat.total) * 100);
      percentStr = `${stat.present}/${stat.total} сабақ (${p}%)`;
      if (p >= 85) statusClass = "good";
      else if (p >= 50) statusClass = "average";
      else statusClass = "poor";
    } else if (stat && stat.total === 0) {
      percentStr = "Сабақтар басталмады (0/0)";
    }

    const card = document.createElement("div");
    card.className = "my-club-dash-card glass-panel";
    card.innerHTML = `
      <div class="my-club-dash-info">
        <h4>${club.name}</h4>
        <p>Мұғалім: <strong>${club.instructor_name}</strong></p>
        <p>Кесте: ${club.schedule}</p>
      </div>
      <div class="my-club-dash-footer">
        <div>Қатысуы: <span class="attendance-percentage ${statusClass}">${percentStr}</span></div>
        <button class="icon-btn btn-leave-club" data-reg-id="${club.registration_id}" style="color: var(--color-error); padding: 4px;" title="Үйірмеден шығу">
          Шығу
        </button>
      </div>
    `;
    grid.appendChild(card);
  });

  // Bind leave triggers
  document.querySelectorAll(".btn-leave-club").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const regId = parseInt(e.currentTarget.getAttribute("data-reg-id"));
      if (confirm("Бұл үйірмеге жазылуды жойғыңыз келетіні рас па?")) {
        try {
          const res = await fetch(`${API_URL}/registrations/${regId}`, {
            method: "DELETE"
          });
          if (!res.ok) throw new Error("Тіркеуді жою мүмкін болмады");
          showToast("Үйірме тізімінен сәтті шықтыңыз", "warning");
          loadStudentDashboard();
        } catch (err) {
          showToast("Жазылуды жою қатесі", "error");
          console.error(err);
        }
      }
    });
  });
}

// consolidated weekly schedule logic
function parseSchedule(scheduleStr) {
  const days = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сн'];
  const foundDays = [];
  
  days.forEach(day => {
    const regex = new RegExp(`\\b${day}\\b|${day}(?=,)`);
    if (regex.test(scheduleStr)) {
      foundDays.push(day);
    }
  });

  const timeRegex = /(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})/;
  const match = scheduleStr.match(timeRegex);
  const timeStr = match ? match[1] : '';

  return {
    days: foundDays,
    time: timeStr || scheduleStr
  };
}

function renderStudentSchedule(myClubs) {
  // Clear day columns
  const days = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сн'];
  days.forEach(day => {
    const col = document.getElementById(`schedule-slots-${day}`);
    if (col) col.innerHTML = "";
  });

  myClubs.forEach(club => {
    const parsed = parseSchedule(club.schedule);
    parsed.days.forEach(day => {
      const col = document.getElementById(`schedule-slots-${day}`);
      if (col) {
        const item = document.createElement("div");
        item.className = "schedule-slot-item";
        item.innerHTML = `
          <div class="schedule-slot-name">${club.name}</div>
          <div class="schedule-slot-time">${parsed.time}</div>
        `;
        col.appendChild(item);
      }
    });
  });

  // Display placeholder if a day is empty
  days.forEach(day => {
    const col = document.getElementById(`schedule-slots-${day}`);
    if (col && col.children.length === 0) {
      col.innerHTML = `<span style="font-size: 0.75rem; color: var(--text-muted); display: block; text-align: center; margin-top: 1.5rem;">Сабақ жоқ</span>`;
    }
  });
}

function renderStudentAttendanceHistory(attendanceLog) {
  const tbody = document.getElementById("student-attendance-tbody");
  const emptyState = document.getElementById("no-attendance-records");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (attendanceLog.length === 0) {
    emptyState.classList.remove("hidden");
    tbody.closest("table").style.display = "none";
    return;
  }

  emptyState.classList.add("hidden");
  tbody.closest("table").style.display = "table";

  attendanceLog.forEach(row => {
    // row: { id, date, status, club_name }
    const tr = document.createElement("tr");
    
    // Format date beautifully
    const d = new Date(row.date);
    const dateFormatted = d.toLocaleDateString('kk-KZ', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const isPresent = row.status === 'present';
    const statusText = isPresent ? 'Келді' : 'Келмеді';
    const statusBadge = isPresent 
      ? `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--color-success); border: 1px solid rgba(16, 185, 129, 0.3)">${statusText}</span>`
      : `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: var(--color-error); border: 1px solid rgba(239, 68, 68, 0.3)">${statusText}</span>`;

    tr.innerHTML = `
      <td>${dateFormatted}</td>
      <td><strong>${row.club_name}</strong></td>
      <td>${row.instructor_name || 'Жетекші мұғалім'}</td>
      <td>${statusBadge}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadStudentSchedulePreferences() {
  if (!state.user || !state.user.studentId) return;

  try {
    const res = await fetch(`${API_URL}/student/schedule-preferences?studentId=${state.user.studentId}`);
    if (!res.ok) throw new Error("Planner fetch error");
    state.schedulePreferences = await res.json();
    renderStudentPlanner(state.schedulePreferences);
  } catch (err) {
    console.error(err);
    showToast("Жеке графикті жүктеу мүмкін болмады", "error");
  }
}

function renderStudentPlanner(preferences) {
  const countInput = document.getElementById("planner-sections-count");
  const notesInput = document.getElementById("planner-notes");
  const summary = document.getElementById("planner-summary");
  const days = preferences.preferred_days || [];

  if (countInput) countInput.value = preferences.sections_per_week || 2;
  if (notesInput) notesInput.value = preferences.notes || "";

  document.querySelectorAll("#planner-days input[type='checkbox']").forEach(input => {
    input.checked = days.includes(input.value);
  });

  if (summary) {
    const dayText = days.length > 0 ? days.join(", ") : "күн таңдалмаған";
    const notesText = preferences.notes ? ` Ескерту: ${preferences.notes}` : "";
    summary.innerText = `Сақталған жоспар: аптасына ${preferences.sections_per_week || 2} секция, күндері: ${dayText}.${notesText}`;
  }
}

async function saveStudentPlanner(e) {
  e.preventDefault();

  if (!state.user || !state.user.studentId) {
    showToast("Жоспар сақтау үшін оқушы ретінде кіріңіз", "warning");
    return;
  }

  const sectionsPerWeek = parseInt(document.getElementById("planner-sections-count").value);
  const notes = document.getElementById("planner-notes").value.trim();
  const preferredDays = Array.from(document.querySelectorAll("#planner-days input[type='checkbox']:checked"))
    .map(input => input.value);

  if (preferredDays.length === 0) {
    showToast("Кемінде бір ыңғайлы күнді таңдаңыз", "warning");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/student/schedule-preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: state.user.studentId,
        sectionsPerWeek,
        preferredDays,
        notes
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Жоспар сақтау қатесі");

    state.schedulePreferences = data;
    renderStudentPlanner(data);
    showToast("Жеке график сақталды", "success");
  } catch (err) {
    showToast(err.message, "error");
    console.error(err);
  }
}

// ==========================================================================
// TEACHER / ADMIN DASHBOARD DATA LOAD & RENDERING
// ==========================================================================
async function loadTeacherDashboard() {
  if (!state.user) return;

  const welcomeText = document.getElementById("teacher-welcome-text");
  const dashboardTitle = document.getElementById("teacher-dashboard-title");
  const btnAddClubModal = document.getElementById("btn-add-club-modal");
  const btnAddTeacherModal = document.getElementById("btn-add-teacher-modal");
  const adminTeachersPanel = document.getElementById("admin-teachers-panel");

  if (dashboardTitle) {
    dashboardTitle.innerText = state.user.role === 'admin' ? 'Әкімші беті' : 'Мұғалім беті';
  }

  if (welcomeText) {
    welcomeText.innerText = state.user.role === 'admin' 
      ? 'Әкімшілік парақша: үйірмелерді қосу, өңдеу және өшіру' 
      : `Қош келдіңіз, Мұғалім: ${state.user.name}!`;
  }

  if (btnAddClubModal) {
    if (state.user.role === 'admin') {
      btnAddClubModal.classList.remove("hidden");
    } else {
      btnAddClubModal.classList.add("hidden");
    }
  }

  if (btnAddTeacherModal) {
    btnAddTeacherModal.classList.toggle("hidden", state.user.role !== 'admin');
  }

  if (adminTeachersPanel) {
    adminTeachersPanel.classList.toggle("hidden", state.user.role !== 'admin');
  }

  try {
    const res = await fetch(`${API_URL}/teacher/dashboard?username=${state.user.username}&role=${state.user.role}`);
    if (!res.ok) throw new Error("Dashboard loading failure");
    const data = await res.json(); // { clubs }

    state.clubs = data.clubs;

    // Default to the first club if none selected
    if (state.clubs.length > 0 && !state.selectedClubIdForAdmin) {
      state.selectedClubIdForAdmin = state.clubs[0].id;
    } else if (state.clubs.length === 0) {
      state.selectedClubIdForAdmin = null;
    }

    renderTeacherAnalytics();
    renderTeacherClubsList();
    if (state.user.role === 'admin') {
      await loadAdminTeachers();
    }
    loadActiveClubDetails();
  } catch (err) {
    console.error(err);
    showToast("Бақылау панелін жүктеу қатесі", "error");
  }
}

async function loadAdminTeachers() {
  try {
    const res = await fetch(`${API_URL}/admin/teachers`);
    if (!res.ok) throw new Error("Teachers fetch failure");
    state.teachers = await res.json();
    renderAdminTeachersTable();
  } catch (err) {
    console.error(err);
    showToast("Мұғалімдер тізімін жүктеу қатесі", "error");
  }
}

function renderAdminTeachersTable() {
  const tbody = document.getElementById("admin-teachers-tbody");
  const count = document.getElementById("admin-teachers-count");
  const placeholder = document.getElementById("no-teachers-placeholder");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (count) count.innerText = `${state.teachers.length} мұғалім`;

  if (state.teachers.length === 0) {
    placeholder.classList.remove("hidden");
    tbody.closest("table").style.display = "none";
    return;
  }

  placeholder.classList.add("hidden");
  tbody.closest("table").style.display = "table";

  state.teachers.forEach(teacher => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${teacher.full_name || teacher.username}</strong></td>
      <td><code>${teacher.username}</code></td>
      <td><code>${teacher.password}</code></td>
      <td>${teacher.assigned_clubs || 0}</td>
      <td class="actions-col">
        <button class="btn-edit-teacher" data-id="${teacher.id}" title="Өңдеу">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
        <button class="btn-delete-teacher" data-id="${teacher.id}" data-name="${teacher.full_name || teacher.username}" title="Өшіру">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll(".btn-edit-teacher").forEach(btn => {
    btn.addEventListener("click", () => openEditTeacherModal(parseInt(btn.getAttribute("data-id"))));
  });

  document.querySelectorAll(".btn-delete-teacher").forEach(btn => {
    btn.addEventListener("click", () => handleDeleteTeacher(
      parseInt(btn.getAttribute("data-id")),
      btn.getAttribute("data-name")
    ));
  });
}

function openAddTeacherModal() {
  document.getElementById("teacher-dialog-title").innerText = "Мұғалім қосу";
  document.getElementById("edit-teacher-id").value = "";
  document.getElementById("teacher-full-name").value = "";
  document.getElementById("teacher-username").value = "";
  document.getElementById("teacher-password").value = "";
  document.getElementById("btn-submit-teacher").innerText = "Қосу";
  document.getElementById("teacher-dialog").showModal();
}

function openEditTeacherModal(teacherId) {
  const teacher = state.teachers.find(t => t.id === teacherId);
  if (!teacher) return;

  document.getElementById("teacher-dialog-title").innerText = "Мұғалімді өңдеу";
  document.getElementById("edit-teacher-id").value = teacher.id;
  document.getElementById("teacher-full-name").value = teacher.full_name || "";
  document.getElementById("teacher-username").value = teacher.username;
  document.getElementById("teacher-password").value = teacher.password;
  document.getElementById("btn-submit-teacher").innerText = "Сақтау";
  document.getElementById("teacher-dialog").showModal();
}

async function submitTeacherForm(e) {
  e.preventDefault();

  const teacherId = document.getElementById("edit-teacher-id").value;
  const fullName = document.getElementById("teacher-full-name").value.trim();
  const username = document.getElementById("teacher-username").value.trim();
  const password = document.getElementById("teacher-password").value;

  try {
    const res = await fetch(`${API_URL}/admin/teachers${teacherId ? `/${teacherId}` : ''}`, {
      method: teacherId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, username, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Мұғалім аккаунтын сақтау қатесі");

    document.getElementById("teacher-dialog").close();
    showToast(teacherId ? "Мұғалім аккаунты жаңартылды" : "Мұғалім аккаунты қосылды", "success");
    await loadTeacherDashboard();
  } catch (err) {
    showToast(err.message, "error");
    console.error(err);
  }
}

async function handleDeleteTeacher(teacherId, teacherName) {
  if (!confirm(`${teacherName} аккаунтын өшіреміз бе?`)) return;

  try {
    const res = await fetch(`${API_URL}/admin/teachers/${teacherId}`, {
      method: "DELETE"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Мұғалімді өшіру қатесі");

    showToast("Мұғалім аккаунты өшірілді", "warning");
    await loadTeacherDashboard();
  } catch (err) {
    showToast(err.message, "error");
    console.error(err);
  }
}

function renderTeacherAnalytics() {
  const totalClubs = state.clubs.length;
  let totalRegistered = 0;
  let totalCapacity = 0;

  state.clubs.forEach(c => {
    totalRegistered += c.registered_count;
    totalCapacity += c.capacity;
  });

  const occupancy = totalCapacity > 0 ? Math.round((totalRegistered / totalCapacity) * 100) : 0;

  const statClubs = document.getElementById("admin-stat-clubs");
  const statStudents = document.getElementById("admin-stat-students");
  const statOccupancy = document.getElementById("admin-stat-occupancy");

  if (statClubs) statClubs.innerText = totalClubs;
  if (statStudents) statStudents.innerText = totalRegistered;
  if (statOccupancy) statOccupancy.innerText = `${occupancy}%`;
}

function renderTeacherClubsList() {
  const container = document.getElementById("admin-clubs-list");
  const countBadge = document.getElementById("admin-clubs-count");
  if (!container) return;

  container.innerHTML = "";

  if (countBadge) {
    countBadge.innerText = `${state.clubs.length} үйірме`;
  }

  if (state.clubs.length === 0) {
    container.innerHTML = `<p class="sub-text" style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Үйірмелер тізімі бос.</p>`;
    document.getElementById("students-management-panel").classList.add("hidden");
    return;
  }
  document.getElementById("students-management-panel").classList.remove("hidden");

  state.clubs.forEach(club => {
    const isActive = club.id === state.selectedClubIdForAdmin;
    const row = document.createElement("div");
    row.className = `admin-club-row ${isActive ? 'active' : ''}`;
    row.setAttribute("data-id", club.id);

    // Only show edit/delete triggers for admin
    const isAdmin = state.user && state.user.role === 'admin';
    const actionButtons = isAdmin
      ? `<div class="admin-club-actions">
          <button class="btn-edit-club" data-id="${club.id}" title="Өңдеу">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="btn-delete-club" data-id="${club.id}" title="Өшіру">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
         </div>`
      : '';

    row.innerHTML = `
      <div class="admin-club-row-info">
        <h4>${club.name}</h4>
        <p>Мұғалім: ${club.instructor_name} | ${getCategoryNameKz(club.category)}</p>
      </div>
      <div class="admin-club-row-meta">
        <span class="badge">${club.registered_count} / ${club.capacity}</span>
        ${actionButtons}
      </div>
    `;

    // Click sets active club
    row.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      state.selectedClubIdForAdmin = club.id;
      renderTeacherClubsList(); // Refresh active highlights
      loadActiveClubDetails();
    });

    container.appendChild(row);
  });

  // Bind actions for admin role
  if (state.user && state.user.role === 'admin') {
    document.querySelectorAll(".btn-edit-club").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = parseInt(e.currentTarget.getAttribute("data-id"));
        openEditClubModal(id);
      });
    });

    document.querySelectorAll(".btn-delete-club").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = parseInt(e.currentTarget.getAttribute("data-id"));
        handleDeleteClub(id);
      });
    });
  }
}

// Load details (Students and Attendance lists) of the active club
async function loadActiveClubDetails() {
  if (!state.selectedClubIdForAdmin) return;

  const club = state.clubs.find(c => c.id === state.selectedClubIdForAdmin);
  if (!club) return;

  const titleEl = document.getElementById("selected-club-title");
  const instEl = document.getElementById("selected-club-inst");

  if (titleEl) titleEl.innerText = club.name;
  if (instEl) instEl.innerText = `Жетекші: ${club.instructor_name} | Кесте: ${club.schedule}`;

  // Hide or show action columns for removing student based on role
  const tableHeadActions = document.querySelector("#tab-content-students th.actions-col");
  if (tableHeadActions) {
    if (state.user && state.user.role === 'admin') {
      tableHeadActions.style.display = "table-cell";
    } else {
      tableHeadActions.style.display = "none";
    }
  }

  // Load appropriate tab content
  if (state.activeTeacherTab === "students") {
    await fetchActiveClubStudents();
  } else {
    await fetchActiveClubAttendance();
  }
}

// Tab 1: Students Roster
async function fetchActiveClubStudents() {
  const clubId = state.selectedClubIdForAdmin;
  if (!clubId) return;

  try {
    const res = await fetch(`${API_URL}/clubs/${clubId}/students`);
    if (!res.ok) throw new Error("Roster fetch error");
    state.studentsList = await res.json();
    renderActiveClubStudentsTable();
  } catch (err) {
    console.error(err);
    showToast("Студенттер тізімін алу қатесі", "error");
  }
}

function renderActiveClubStudentsTable() {
  const tbody = document.getElementById("admin-students-tbody");
  const placeholder = document.getElementById("no-students-placeholder");
  if (!tbody) return;

  tbody.innerHTML = "";

  const filtered = state.studentsList.filter(s => 
    s.name.toLowerCase().includes(state.searchStudentsQuery.toLowerCase()) ||
    s.grade.toLowerCase().includes(state.searchStudentsQuery.toLowerCase())
  );

  if (filtered.length === 0) {
    placeholder.classList.remove("hidden");
    tbody.closest("table").style.display = "none";
    return;
  }
  placeholder.classList.add("hidden");
  tbody.closest("table").style.display = "table";

  filtered.forEach((std, idx) => {
    const tr = document.createElement("tr");

    // Format registration date
    const d = new Date(std.registered_at);
    const dateFormatted = d.toLocaleDateString('kk-KZ', { day: 'numeric', month: 'numeric', year: 'numeric' });

    // Calculate attendance percentage
    let attendPercentStr = "0/0 (0%)";
    if (std.total_lessons > 0) {
      const p = Math.round((std.present_count / std.total_lessons) * 100);
      attendPercentStr = `${std.present_count}/${std.total_lessons} (${p}%)`;
    }

    const isAdmin = state.user && state.user.role === 'admin';
    const removeBtn = isAdmin
      ? `<td class="actions-col">
          <button class="btn-remove-student" data-reg-id="${std.registration_id}" data-name="${std.name}" title="Үйірмеден шығару">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
          </button>
         </td>`
      : '';

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><strong>${std.name}</strong></td>
      <td>${std.grade}</td>
      <td>${std.phone}</td>
      <td>${dateFormatted}</td>
      <td>${attendPercentStr}</td>
      ${removeBtn}
    `;

    tbody.appendChild(tr);
  });

  // Bind remove buttons
  if (state.user && state.user.role === 'admin') {
    document.querySelectorAll(".btn-remove-student").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const regId = parseInt(e.currentTarget.getAttribute("data-reg-id"));
        const name = e.currentTarget.getAttribute("data-name");
        
        if (confirm(`Оқушыны (${name}) үйірме тізімінен шығарғыңыз келе ме?`)) {
          try {
            const res = await fetch(`${API_URL}/registrations/${regId}`, {
              method: "DELETE"
            });
            if (!res.ok) throw new Error("Delete reg failure");
            showToast("Оқушы сәтті жойылды!", "warning");
            
            // Reload all dashboard sections
            await loadTeacherDashboard();
          } catch (err) {
            showToast("Оқушыны жою қатесі", "error");
            console.error(err);
          }
        }
      });
    });
  }
}

// Tab 2: Attendance Journal
async function fetchActiveClubAttendance() {
  const clubId = state.selectedClubIdForAdmin;
  const date = state.selectedAttendanceDate;
  if (!clubId || !date) return;

  try {
    const res = await fetch(`${API_URL}/attendance/${clubId}?date=${date}`);
    if (!res.ok) throw new Error("Attendance list fetch error");
    state.attendanceList = await res.json(); // [{ studentId, name, grade, status }]
    renderAttendanceJournal();
  } catch (err) {
    console.error(err);
    showToast("Қатысу тізімін жүктеу қатесі", "error");
  }
}

function renderAttendanceJournal() {
  const tbody = document.getElementById("attendance-table-body");
  const placeholder = document.getElementById("no-attendance-students-placeholder");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (state.attendanceList.length === 0) {
    placeholder.classList.remove("hidden");
    tbody.closest("table").style.display = "none";
    document.getElementById("btn-save-attendance").style.display = "none";
    return;
  }

  placeholder.classList.add("hidden");
  tbody.closest("table").style.display = "table";
  document.getElementById("btn-save-attendance").style.display = "inline-flex";

  state.attendanceList.forEach(row => {
    const tr = document.createElement("tr");

    const isPresent = row.status === 'present';
    const isAbsent = row.status === 'absent';
    const notMarked = row.status === null;

    tr.innerHTML = `
      <td><strong>${row.name}</strong></td>
      <td>${row.grade}</td>
      <td style="text-align: center;">
        <div class="attendance-radio-group">
          <label class="attendance-radio-label present-choice ${isPresent ? 'selected' : ''}">
            <input type="radio" name="attendance-${row.studentId}" value="present" ${isPresent ? 'checked' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Келді
          </label>
          <label class="attendance-radio-label absent-choice ${isAbsent ? 'selected' : ''}">
            <input type="radio" name="attendance-${row.studentId}" value="absent" ${isAbsent ? 'checked' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
            Келмеді
          </label>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Bind change effects to style active buttons
  document.querySelectorAll(".attendance-radio-label input").forEach(radio => {
    radio.addEventListener("change", (e) => {
      const parentRow = e.currentTarget.closest(".attendance-radio-group");
      // Deselect all choices in this row
      parentRow.querySelectorAll(".attendance-radio-label").forEach(lbl => lbl.classList.remove("selected"));
      
      // Select the active choice
      e.currentTarget.closest(".attendance-radio-label").classList.add("selected");
    });
  });
}

async function saveAttendanceJournal() {
  const clubId = state.selectedClubIdForAdmin;
  const date = state.selectedAttendanceDate;
  if (!clubId || !date) return;

  const records = [];
  let allMarked = true;

  state.attendanceList.forEach(row => {
    const radio = document.querySelector(`input[name="attendance-${row.studentId}"]:checked`);
    if (radio) {
      records.push({
        studentId: row.studentId,
        status: radio.value
      });
    } else {
      allMarked = false;
    }
  });

  if (!allMarked) {
    if (!confirm("Кейбір оқушыларға қатысу белгісі қойылмады. Қалғандарын сақтай береміз бе?")) {
      return;
    }
  }

  try {
    const res = await fetch(`${API_URL}/attendance/${clubId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, records })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save error");

    showToast("Қатысу журналы сәтті сақталды!", "success");
    fetchActiveClubAttendance();
  } catch (err) {
    showToast("Журналды сақтау қатесі", "error");
    console.error(err);
  }
}

// ==========================================================================
// ADMIN ADD / EDIT / DELETE ACTIONS (REST CALLS)
// ==========================================================================
async function submitAddEditClubForm(e) {
  e.preventDefault();

  const editIdInput = document.getElementById("edit-club-id");
  const editId = editIdInput.value;

  const name = document.getElementById("club-name").value.trim();
  const category = document.getElementById("club-category").value;
  const instructorName = document.getElementById("club-instructor").value.trim();
  const instructorUsername = document.getElementById("club-instructor-username").value.trim();
  const capacity = parseInt(document.getElementById("club-capacity").value);
  const image = document.getElementById("club-image-select").value;
  const schedule = document.getElementById("club-schedule").value.trim();
  const description = document.getElementById("club-desc").value.trim();

  const bodyData = {
    name,
    category,
    instructorName,
    instructorUsername,
    capacity,
    image,
    schedule,
    description
  };

  try {
    let res;
    if (editId) {
      // Edit
      res = await fetch(`${API_URL}/clubs/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData)
      });
    } else {
      // Add
      res = await fetch(`${API_URL}/clubs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData)
      });
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Үйірмені құру/өңдеу қатесі");
    }

    showToast(editId ? "Үйірме сәтті өзгертілді" : "Жаңа үйірме сәтті қосылды", "success");
    document.getElementById("add-club-dialog").close();

    // Reload dashboards
    await loadTeacherDashboard();
  } catch (err) {
    showToast(err.message, "error");
    console.error(err);
  }
}

async function handleDeleteClub(clubId) {
  const club = state.clubs.find(c => c.id === clubId);
  if (!club) return;

  const confirmMsg = club.registered_count > 0 
    ? `Бұл үйірмеге ${club.registered_count} оқушы тіркелген. Үйірмені өшірсеңіз, барлық тіркеулер мен сабақ журналдары біржола өшеді. Жалғастырамыз ба?`
    : `Үйірмені («${club.name}») өшіруді растайсыз ба?`;

  if (confirm(confirmMsg)) {
    try {
      const res = await fetch(`${API_URL}/clubs/${clubId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Delete failure");

      showToast("Үйірме сәтті өшірілді", "warning");

      if (state.selectedClubIdForAdmin === clubId) {
        state.selectedClubIdForAdmin = null;
      }

      await loadTeacherDashboard();
    } catch (err) {
      showToast("Өшіру мүмкін болмады", "error");
      console.error(err);
    }
  }
}

function openAddClubModal() {
  document.getElementById("add-club-dialog-title").innerText = "Жаңа үйірме қосу";
  document.getElementById("edit-club-id").value = "";
  document.getElementById("btn-submit-club").innerText = "Қосу";

  document.getElementById("add-club-form").reset();
  document.getElementById("add-club-dialog").showModal();
}

function openEditClubModal(clubId) {
  const club = state.clubs.find(c => c.id === clubId);
  if (!club) return;

  document.getElementById("add-club-dialog-title").innerText = "Үйірмені өңдеу";
  document.getElementById("edit-club-id").value = clubId;
  document.getElementById("btn-submit-club").innerText = "Сақтау";

  document.getElementById("club-name").value = club.name;
  document.getElementById("club-category").value = club.category;
  document.getElementById("club-instructor").value = club.instructor_name;
  document.getElementById("club-instructor-username").value = club.instructor_username;
  document.getElementById("club-capacity").value = club.capacity;
  document.getElementById("club-image-select").value = club.image;
  document.getElementById("club-schedule").value = club.schedule;
  document.getElementById("club-desc").value = club.description;

  document.getElementById("add-club-dialog").showModal();
}

// ==========================================================================
// EXCEL EXPORT & PRINT RENDERERS
// ==========================================================================
function exportToCSV() {
  const activeClub = state.clubs.find(c => c.id === state.selectedClubIdForAdmin);
  if (!activeClub) return;

  if (state.studentsList.length === 0) {
    showToast("Тіркелген оқушылар жоқ, жүктей алмайсыз.", "warning");
    return;
  }

  // BOM header (UTF-8 Cyrillic compatibility in Excel)
  let csvContent = "\uFEFF";

  csvContent += `Үйірме:,"${activeClub.name}"\n`;
  csvContent += `Жетекші:,"${activeClub.instructor_name}"\n`;
  csvContent += `Экспортталған күн:,${new Date().toLocaleDateString()}\n\n`;

  csvContent += "№,Оқушының аты-жөні,Сыныбы,Ата-ана телефоны,Тіркелген күні\n";

  state.studentsList.forEach((std, index) => {
    const d = new Date(std.registered_at);
    const dateFormatted = d.toLocaleDateString();
    csvContent += `${index + 1},"${std.name}","${std.grade}","${std.phone}",${dateFormatted}\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${activeClub.name.replace(/\s+/g, '_')}_оқушылар_тізімі.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("Excel форматында жүктеу басталды!", "success");
}

function triggerPrint() {
  window.print();
}

// ==========================================================================
// AUTHENTICATION MODALS ACTIONS
// ==========================================================================
const loginDialog = document.getElementById("login-dialog");

function openLoginModal() {
  if (loginDialog) {
    // Clear old errors and fields
    const studentUser = document.getElementById("login-student-username");
    const studentPass = document.getElementById("login-student-pass");
    const teacherUser = document.getElementById("login-teacher-username");
    const teacherPass = document.getElementById("login-teacher-pass");

    if (studentUser) studentUser.value = "";
    if (studentPass) studentPass.value = "";
    if (teacherUser) teacherUser.value = "";
    if (teacherPass) teacherPass.value = "";

    // Switch to Student tab and Login sub-box by default
    switchAuthTab("student");
    switchAuthSubBox("login");

    loginDialog.showModal();
  }
}

function switchAuthTab(type) {
  const tabStudent = document.getElementById("tab-login-student");
  const tabTeacher = document.getElementById("tab-login-teacher");
  const containerStudent = document.getElementById("auth-student-container");
  const containerTeacher = document.getElementById("auth-teacher-container");

  if (type === "student") {
    tabStudent.classList.add("active");
    tabTeacher.classList.remove("active");
    containerStudent.classList.add("active");
    containerTeacher.classList.remove("active");
  } else {
    tabStudent.classList.remove("active");
    tabTeacher.classList.add("active");
    containerStudent.classList.remove("active");
    containerTeacher.classList.add("active");
  }
}

function switchAuthSubBox(subBox) {
  const loginBox = document.getElementById("student-login-box");
  const registerBox = document.getElementById("student-register-box");

  if (subBox === "login") {
    loginBox.classList.add("active");
    registerBox.classList.remove("active");
  } else {
    loginBox.classList.remove("active");
    registerBox.classList.add("active");
  }
}

async function handleStudentLogin(e) {
  e.preventDefault();
  const username = document.getElementById("login-student-username").value.trim();
  const pass = document.getElementById("login-student-pass").value;

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: pass })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Кіру кезінде қате орын алды");

    saveUserSession(data.user);
    showToast(`Қош келдіңіз, ${data.user.name}!`, "success");
    loginDialog.close();

    // Direct to dashboard
    switchView("view-student-dashboard");
    loadStudentDashboard();
  } catch (err) {
    showToast(err.message, "error");
    console.error(err);
  }
}

async function handleStudentRegister(e) {
  e.preventDefault();
  const username = document.getElementById("reg-username").value.trim();
  const name = document.getElementById("reg-student-name").value.trim();
  const grade = document.getElementById("reg-student-grade").value.trim();
  const phone = document.getElementById("reg-parent-phone").value.trim();
  const pass = document.getElementById("reg-password").value;

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        name,
        grade,
        phone,
        password: pass
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Тіркелу кезінде қате орын алды");

    // Automatically log in
    saveUserSession(data.user);
    showToast("Тіркелу сәтті аяқталды!", "success");
    loginDialog.close();

    switchView("view-student-dashboard");
    loadStudentDashboard();
  } catch (err) {
    showToast(err.message, "error");
    console.error(err);
  }
}

async function handleTeacherLogin(e) {
  e.preventDefault();
  const username = document.getElementById("login-teacher-username").value.trim();
  const pass = document.getElementById("login-teacher-pass").value;

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: pass })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Кіру қатесі");

    if (data.user.role !== 'admin' && data.user.role !== 'teacher') {
      throw new Error("Тек мұғалімдер немесе әкімшілер кіре алады");
    }

    saveUserSession(data.user);
    showToast(`Бақылау панеліне кірдіңіз: ${data.user.name}`, "success");
    loginDialog.close();

    switchView("view-teacher-dashboard");
    loadTeacherDashboard();
  } catch (err) {
    showToast(err.message, "error");
    console.error(err);
  }
}

function handleLogout() {
  saveUserSession(null);
  showToast("Жүйеден сәтті шықтыңыз.", "warning");
}

// ==========================================================================
// DOM READY INITIALIZATION & EVENTS BINDING
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Load local values
  loadUserSession();
  initTheme();
  
  // Show Catalog first
  switchView("view-catalog");
  fetchAndRenderClubs();

  // Navigation Links
  setupNavigation();

  // Theme Toggler
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) themeToggle.addEventListener("click", toggleTheme);

  // Search filter box
  const searchInput = document.getElementById("search-clubs");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      renderClubsGrid();
    });
  }

  // Category filter buttons
  const filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      filterBtns.forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      
      state.currentFilter = e.target.getAttribute("data-category");
      renderClubsGrid();
    });
  });

  // Login dialog triggers
  const btnLoginTrigger = document.getElementById("btn-login-trigger");
  if (btnLoginTrigger) btnLoginTrigger.addEventListener("click", openLoginModal);

  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) btnLogout.addEventListener("click", handleLogout);

  // Tab switching inside auth modals
  const tabLoginStudent = document.getElementById("tab-login-student");
  const tabLoginTeacher = document.getElementById("tab-login-teacher");
  if (tabLoginStudent) tabLoginStudent.addEventListener("click", () => switchAuthTab("student"));
  if (tabLoginTeacher) tabLoginTeacher.addEventListener("click", () => switchAuthTab("teacher"));

  const btnToRegister = document.getElementById("btn-to-register");
  const btnToLogin = document.getElementById("btn-to-login");
  if (btnToRegister) btnToRegister.addEventListener("click", () => switchAuthSubBox("register"));
  if (btnToLogin) btnToLogin.addEventListener("click", () => switchAuthSubBox("login"));

  // Forms submission
  const formStudentLogin = document.getElementById("form-student-login");
  const formStudentRegister = document.getElementById("form-student-register");
  const formTeacherLogin = document.getElementById("form-teacher-login");
  const studentPlannerForm = document.getElementById("student-planner-form");

  if (formStudentLogin) formStudentLogin.addEventListener("submit", handleStudentLogin);
  if (formStudentRegister) formStudentRegister.addEventListener("submit", handleStudentRegister);
  if (formTeacherLogin) formTeacherLogin.addEventListener("submit", handleTeacherLogin);
  if (studentPlannerForm) studentPlannerForm.addEventListener("submit", saveStudentPlanner);

  // Close modals behavior
  document.querySelectorAll(".btn-close-dialog").forEach(btn => {
    btn.addEventListener("click", () => {
      if (loginDialog) loginDialog.close();
      const confirmDialog = document.getElementById("register-confirm-dialog");
      if (confirmDialog) confirmDialog.close();
      const addClubDialog = document.getElementById("add-club-dialog");
      if (addClubDialog) addClubDialog.close();
      const teacherDialog = document.getElementById("teacher-dialog");
      if (teacherDialog) teacherDialog.close();
    });
  });

  // Confirm registration
  const btnConfirmRegister = document.getElementById("btn-confirm-register");
  if (btnConfirmRegister) btnConfirmRegister.addEventListener("click", submitJoinClub);

  // Teacher dashboard: Roster tab vs Attendance tab
  const tabBtnStudents = document.getElementById("tab-btn-students");
  const tabBtnAttendance = document.getElementById("tab-btn-attendance");
  const tabContentStudents = document.getElementById("tab-content-students");
  const tabContentAttendance = document.getElementById("tab-content-attendance");

  if (tabBtnStudents) {
    tabBtnStudents.addEventListener("click", () => {
      tabBtnStudents.classList.add("active");
      tabBtnAttendance.classList.remove("active");
      tabContentStudents.classList.add("active");
      tabContentAttendance.classList.remove("active");
      state.activeTeacherTab = "students";
      loadActiveClubDetails();
    });
  }

  if (tabBtnAttendance) {
    tabBtnAttendance.addEventListener("click", () => {
      tabBtnStudents.classList.remove("active");
      tabBtnAttendance.classList.add("active");
      tabContentStudents.classList.remove("active");
      tabContentAttendance.classList.add("active");
      state.activeTeacherTab = "attendance";
      loadActiveClubDetails();
    });
  }

  // Teacher dashboard search roster
  const searchStudents = document.getElementById("search-students");
  if (searchStudents) {
    searchStudents.addEventListener("input", (e) => {
      state.searchStudentsQuery = e.target.value;
      renderActiveClubStudentsTable();
    });
  }

  // Teacher dashboard attendance date picker
  const attendanceDateInput = document.getElementById("attendance-date");
  if (attendanceDateInput) {
    attendanceDateInput.value = state.selectedAttendanceDate;
    attendanceDateInput.addEventListener("change", (e) => {
      state.selectedAttendanceDate = e.target.value;
      fetchActiveClubAttendance();
    });
  }

  // Teacher save attendance
  const btnSaveAttendance = document.getElementById("btn-save-attendance");
  if (btnSaveAttendance) btnSaveAttendance.addEventListener("click", saveAttendanceJournal);

  // Admin add new club trigger
  const btnAddClubModal = document.getElementById("btn-add-club-modal");
  if (btnAddClubModal) btnAddClubModal.addEventListener("click", openAddClubModal);

  const btnAddTeacherModal = document.getElementById("btn-add-teacher-modal");
  if (btnAddTeacherModal) btnAddTeacherModal.addEventListener("click", openAddTeacherModal);

  // Admin submit add/edit club form
  const addClubForm = document.getElementById("add-club-form");
  if (addClubForm) addClubForm.addEventListener("submit", submitAddEditClubForm);

  const teacherForm = document.getElementById("teacher-form");
  if (teacherForm) teacherForm.addEventListener("submit", submitTeacherForm);

  // Export / Print
  const btnExportCsv = document.getElementById("btn-export-csv");
  const btnPrintList = document.getElementById("btn-print-list");

  if (btnExportCsv) btnExportCsv.addEventListener("click", exportToCSV);
  if (btnPrintList) btnPrintList.addEventListener("click", triggerPrint);
});
