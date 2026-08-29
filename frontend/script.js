// MovieHub - Frontend JavaScript

const API_URL = 'http://localhost:5000/api';
const moviesGrid = document.getElementById('moviesGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const movieModal = document.getElementById('movieModal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');
const ageModal = document.getElementById('ageModal');
const ageMessage = document.getElementById('ageMessage');
const ageYes = document.getElementById('ageYes');
const ageNo = document.getElementById('ageNo');

// Cheklovli yosh chegaralari (oson o'zgartirish uchun massiv)
const RESTRICTED_AGES = ['16+', '18+'];

let currentMovie = null;
let pendingVideoUrl = null;

// ==================== BARCHA FILMLARNI YUKLASH ====================
async function loadMovies(searchQuery = '') {
  try {
    let url = `${API_URL}/movies`;
    if (searchQuery && searchQuery.trim() !== '') {
      url = `${API_URL}/movies/search?q=${encodeURIComponent(searchQuery)}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Filmlarni yuklashda xatolik');
    }

    renderMovies(data.data);
  } catch (error) {
    console.error('Filmlarni yuklash xatosi:', error);
    moviesGrid.innerHTML = `
      <div style="text-align:center;color:var(--accent-red);padding:50px;">
        <i class="fas fa-exclamation-circle" style="font-size:3rem;"></i>
        <p>${error.message}</p>
        <button onclick="loadMovies()" class="btn btn-primary">Qayta urinish</button>
      </div>
    `;
  }
}

// ==================== FILMLARNI CHIQARISH ====================
function renderMovies(movies) {
  if (!movies || movies.length === 0) {
    moviesGrid.innerHTML = `
      <div style="text-align:center;color:var(--text-secondary);padding:50px;grid-column:1/-1;">
        <i class="fas fa-film" style="font-size:3rem;opacity:0.5;"></i>
        <p>Hech qanday film topilmadi.</p>
      </div>
    `;
    return;
  }

  moviesGrid.innerHTML = movies.map(movie => `
    <div class="movie-card" onclick="openMovie('${movie._id}')">
      <img 
        src="${movie.rasm.startsWith('http') ? movie.rasm : API_URL.replace('/api', '') + movie.rasm}" 
        alt="${movie.nomi}"
        class="movie-poster"
        onerror="this.src='https://via.placeholder.com/300x400/222222/00ff88?text=No+Image'"
      />
      <div class="movie-info">
        <div class="movie-title">${movie.nomi}</div>
        <div class="movie-meta">
          <span>${movie.yili}</span>
          <span>${movie.turi === 'film' ? '🎬' : '📺'}</span>
        </div>
        <div class="movie-genre">${movie.janr}</div>
      </div>
    </div>
  `).join('');
}

// ==================== FILMNI OCHISH ====================
async function openMovie(movieId) {
  try {
    const response = await fetch(`${API_URL}/movies/${movieId}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Film ma\'lumotlarini yuklashda xatolik');
    }

    currentMovie = data.data;
    pendingVideoUrl = null;

    // Yosh chegarasini tekshirish
    const ageRestriction = currentMovie.yoshChegarasi;
    if (RESTRICTED_AGES.includes(ageRestriction)) {
      showAgeModal(ageRestriction);
    } else {
      showMovieDetails(currentMovie);
    }
  } catch (error) {
    console.error('Filmni ochish xatosi:', error);
    alert('Xatolik: ' + error.message);
  }
}

// ==================== YOSH CHEGARASI MODAL ====================
function showAgeModal(ageRestriction) {
  ageMessage.textContent = `Ushbu film uchun yosh chegarasi ${ageRestriction} deb belgilangan. Filmni tomosha qilishdan avval yosh chegaralari bilan tanishib chiqishingizni so'raymiz! Sizning yoshingiz belgilangan toifaga yetarlimi?`;
  ageModal.classList.add('active');
}

ageYes.addEventListener('click', () => {
  ageModal.classList.remove('active');
  showMovieDetails(currentMovie);
});

ageNo.addEventListener('click', () => {
  ageModal.classList.remove('active');
  // Bosh sahifaga qaytarish
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // Modalni yopish
  movieModal.classList.remove('active');
});

// ==================== FILM DETALLARINI KO'RSATISH ====================
function showMovieDetails(movie) {
  const baseUrl = API_URL.replace('/api', '');
  const posterUrl = movie.rasm.startsWith('http') ? movie.rasm : baseUrl + movie.rasm;

  let videoHtml = '';
  let qismlarHtml = '';

  if (movie.turi === 'film') {
    const videoUrl = movie.video ? (movie.video.startsWith('http') ? movie.video : baseUrl + movie.video) : '';
    videoHtml = `
      <div class="modal-video">
        <video controls width="100%" id="moviePlayer">
          <source src="${videoUrl}" type="video/mp4" />
          Sizning brauzeringiz video ko'rsatishni qo'llab-quvvatlamaydi.
        </video>
      </div>
    `;
  } else if (movie.turi === 'serial' && movie.qismlar && movie.qismlar.length > 0) {
    qismlarHtml = `
      <div class="qismlar-list">
        ${movie.qismlar.map((qism, index) => `
          <button class="qism-btn ${index === 0 ? 'active' : ''}" onclick="playQism('${movie._id}', ${index})">
            ${qism.qismRaqami}-qism
          </button>
        `).join('')}
      </div>
      <div class="modal-video">
        <video controls width="100%" id="moviePlayer">
          <source src="${baseUrl + movie.qismlar[0].video}" type="video/mp4" />
          Sizning brauzeringiz video ko'rsatishni qo'llab-quvvatlamaydi.
        </video>
      </div>
    `;
  }

  modalBody.innerHTML = `
    <div class="modal-movie-detail">
      <div>
        <img src="${posterUrl}" alt="${movie.nomi}" class="modal-poster" />
      </div>
      <div class="modal-info">
        <h2>${movie.nomi}</h2>
        <div class="movie-meta">
          <span>${movie.turi === 'film' ? '🎬 Film' : '📺 Serial'}</span>
          <span>${movie.yili}</span>
          <span>${movie.davlati}</span>
          <span>${movie.tili}</span>
          <span>🔞 ${movie.yoshChegarasi}</span>
          <span>⏱ ${movie.davomiyligi}</span>
        </div>
        <p><strong>Janr:</strong> ${movie.janr}</p>
        ${qismlarHtml}
        ${videoHtml}
      </div>
    </div>
  `;

  movieModal.classList.add('active');
}

// ==================== SERIAL QISMINI O'YIN ====================
function playQism(movieId, index) {
  const movie = currentMovie;
  if (!movie || !movie.qismlar || !movie.qismlar[index]) return;

  const baseUrl = API_URL.replace('/api', '');
  const videoUrl = baseUrl + movie.qismlar[index].video;

  // Qism tugmalarini yangilash
  document.querySelectorAll('.qism-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });

  // Videoni yangilash
  const player = document.getElementById('moviePlayer');
  if (player) {
    player.src = videoUrl;
    player.load();
    player.play().catch(e => console.log('Video avtomatik o\'ynalmadi:', e));
  }
}

// ==================== MODALNI YOPISH ====================
modalClose.addEventListener('click', () => {
  movieModal.classList.remove('active');
  const player = document.getElementById('moviePlayer');
  if (player) {
    player.pause();
  }
});

// Modal tashqarisiga bosilganda yopish
movieModal.addEventListener('click', (e) => {
  if (e.target === movieModal) {
    movieModal.classList.remove('active');
    const player = document.getElementById('moviePlayer');
    if (player) {
      player.pause();
    }
  }
});

// ==================== QIDIRUV ====================
searchBtn.addEventListener('click', () => {
  const query = searchInput.value.trim();
  loadMovies(query);
});

searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchBtn.click();
  }
});

// ==================== SAHIFA YUKLANGANDA ====================
document.addEventListener('DOMContentLoaded', () => {
  loadMovies();
});
