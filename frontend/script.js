// MovieHub - Frontend
const API_URL = 'https://movieehubbackend.onrender.com/api';
const BASE_URL = 'https://movieehubbackend.onrender.com';
const RESTRICTED_AGES = ['16+', '18+'];

const $ = id => document.getElementById(id);
const moviesGrid = $('moviesGrid');
const searchInput = $('searchInput');
const searchBtn = $('searchBtn');
const movieModal = $('movieModal');
const modalBody = $('modalBody');
const modalClose = $('modalClose');
const ageModal = $('ageModal');
const ageMessage = $('ageMessage');
const ageYes = $('ageYes');
const ageNo = $('ageNo');
const loadingOverlay = $('loadingOverlay');
const loadingText = $('loadingText');

let currentMovie = null;

// ============ LOADING ============
function showLoading(msg = 'Yuklanmoqda...') {
  loadingText.textContent = msg;
  loadingOverlay.classList.add('active');
}

function hideLoading() {
  loadingOverlay.classList.remove('active');
}

// ============ FILMLARNI YUKLASH ============
async function loadMovies(search = '') {
  showLoading('Filmlar yuklanmoqda...');
  try {
    const url = search ? `${API_URL}/movies/search?q=${encodeURIComponent(search)}` : `${API_URL}/movies`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    renderMovies(data.data);
  } catch (e) {
    moviesGrid.innerHTML = `<div style="text-align:center;color:var(--accent-red);padding:40px;">❌ ${e.message}</div>`;
  }
  hideLoading();
}

// ============ RENDER ============
function renderMovies(movies) {
  if (!movies?.length) {
    moviesGrid.innerHTML = `<div style="text-align:center;color:var(--text-secondary);padding:40px;">🎬 Filmlar topilmadi</div>`;
    return;
  }

  moviesGrid.innerHTML = movies.map(m => `
    <div class="movie-card" onclick="openMovie('${m._id}')">
      <img src="${m.rasm.startsWith('http') ? m.rasm : BASE_URL + m.rasm}" 
           alt="${m.nomi}" class="movie-poster"
           onerror="this.src='https://via.placeholder.com/300x400/222222/00ff88?text=No+Image'" />
      <div class="movie-info">
        <div class="movie-title">${m.nomi}</div>
        <div class="movie-meta"><span>${m.yili}</span><span>${m.turi === 'film' ? '🎬' : '📺'}</span></div>
        <div class="movie-genre">${m.janr}</div>
      </div>
    </div>
  `).join('');
}

// ============ FILMNI OCHISH ============
async function openMovie(id) {
  showLoading('Film yuklanmoqda...');
  try {
    const res = await fetch(`${API_URL}/movies/${id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    currentMovie = data.data;
    hideLoading();
    
    if (RESTRICTED_AGES.includes(currentMovie.yoshChegarasi)) {
      ageMessage.textContent = `Ushbu film uchun yosh chegarasi ${currentMovie.yoshChegarasi} deb belgilangan. Sizning yoshingiz yetarlimi?`;
      ageModal.classList.add('active');
    } else {
      showDetails(currentMovie);
    }
  } catch (e) {
    hideLoading();
    alert('Xatolik: ' + e.message);
  }
}

// ============ DETAILS ============
function showDetails(m) {
  const poster = m.rasm.startsWith('http') ? m.rasm : BASE_URL + m.rasm;
  let videoHtml = '', qismlarHtml = '';

  if (m.turi === 'film') {
    videoHtml = `<div class="modal-video"><video controls width="100%" id="player"><source src="${m.video?.startsWith('http') ? m.video : BASE_URL + m.video}" type="video/mp4" /></video></div>`;
  } else if (m.qismlar?.length) {
    qismlarHtml = `<div class="qismlar-list">${m.qismlar.map((q, i) => `<button class="qism-btn ${i===0?'active':''}" onclick="playQism(${i})">${q.qismRaqami}-qism</button>`).join('')}</div>`;
    videoHtml = `<div class="modal-video"><video controls width="100%" id="player"><source src="${BASE_URL + m.qismlar[0].video}" type="video/mp4" /></video></div>`;
  }

  modalBody.innerHTML = `
    <div class="modal-movie-detail">
      <img src="${poster}" alt="${m.nomi}" class="modal-poster" />
      <div class="modal-info">
        <h2>${m.nomi}</h2>
        <div class="movie-meta">
          <span>${m.turi === 'film' ? '🎬 Film' : '📺 Serial'}</span>
          <span>${m.yili}</span>
          <span>${m.davlati}</span>
          <span>🔞 ${m.yoshChegarasi}</span>
          <span>⏱ ${m.davomiyligi}</span>
        </div>
        <p><strong>Janr:</strong> ${m.janr} | <strong>Til:</strong> ${m.tili}</p>
        ${qismlarHtml}
        ${videoHtml}
      </div>
    </div>
  `;
  movieModal.classList.add('active');
}

// ============ QISM ============
function playQism(index) {
  const m = currentMovie;
  if (!m?.qismlar?.[index]) return;
  document.querySelectorAll('.qism-btn').forEach((b, i) => b.classList.toggle('active', i === index));
  const player = document.getElementById('player');
  if (player) {
    player.src = BASE_URL + m.qismlar[index].video;
    player.load();
    player.play().catch(() => {});
  }
}

// ============ EVENTS ============
ageYes.addEventListener('click', () => { ageModal.classList.remove('active'); showDetails(currentMovie); });
ageNo.addEventListener('click', () => { ageModal.classList.remove('active'); movieModal.classList.remove('active'); });

modalClose.addEventListener('click', () => {
  movieModal.classList.remove('active');
  const p = document.getElementById('player');
  if (p) p.pause();
});

movieModal.addEventListener('click', (e) => {
  if (e.target === movieModal) {
    movieModal.classList.remove('active');
    const p = document.getElementById('player');
    if (p) p.pause();
  }
});

searchBtn.addEventListener('click', () => loadMovies(searchInput.value.trim()));
searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchBtn.click(); });

// ============ LOAD ============
document.addEventListener('DOMContentLoaded', () => {
  moviesGrid.innerHTML = Array(8).fill(0).map(() => `
    <div class="loading-card">
      <div class="poster-placeholder"></div>
      <div class="info-placeholder">
        <div class="title-placeholder"></div>
        <div class="meta-placeholder"></div>
      </div>
    </div>
  `).join('');
  loadMovies();
});
