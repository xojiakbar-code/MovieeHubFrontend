// MovieHub - Frontend (Tuzatilgan)

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

// ============ DEFAULT RASM (placeholder o'rniga) ============
function getDefaultImage() {
  // SVG asosida default rasm yaratish
  return 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
      <rect width="300" height="400" fill="#1a1a1a"/>
      <text x="150" y="180" font-family="Arial" font-size="24" fill="#444" text-anchor="middle">🎬</text>
      <text x="150" y="220" font-family="Arial" font-size="16" fill="#666" text-anchor="middle">No Image</text>
    </svg>
  `);
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
    moviesGrid.innerHTML = `<div style="text-align:center;color:var(--color-danger);padding:40px;">❌ Xatolik: ${e.message}</div>`;
  }
  hideLoading();
}

// ============ RENDER ============
function renderMovies(movies) {
  if (!movies?.length) {
    moviesGrid.innerHTML = `<div style="text-align:center;color:var(--color-text-secondary);padding:40px;">🎬 Filmlar topilmadi</div>`;
    return;
  }

  const defaultImg = getDefaultImage();

  moviesGrid.innerHTML = movies.map(m => {
    // Rasm URL ni to'g'rilash
    let imgUrl = defaultImg;
    if (m.rasm) {
      if (m.rasm.startsWith('http://') || m.rasm.startsWith('https://')) {
        imgUrl = m.rasm;
      } else if (m.rasm.startsWith('/uploads/')) {
        imgUrl = BASE_URL + m.rasm;
      } else if (m.rasm.startsWith('uploads/')) {
        imgUrl = BASE_URL + '/' + m.rasm;
      } else {
        imgUrl = BASE_URL + '/uploads/' + m.rasm;
      }
    }

    return `
      <div class="movie-card" onclick="openMovie('${m._id}')">
        <img 
          src="${imgUrl}" 
          alt="${m.nomi}" 
          class="movie-poster"
          onerror="this.src='${defaultImg}'"
        />
        <div class="movie-info">
          <div class="movie-title">${m.nomi}</div>
          <div class="movie-meta">
            <span>${m.yili}</span>
            <span>${m.turi === 'film' ? '🎬' : '📺'}</span>
          </div>
          <div class="movie-genre">${m.janr}</div>
        </div>
      </div>
    `;
  }).join('');
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
    
    // Yosh chegarasini tekshirish
    const age = currentMovie.yoshChegarasi || '0+';
    if (RESTRICTED_AGES.includes(age)) {
      ageMessage.textContent = `Ushbu film uchun yosh chegarasi ${age} deb belgilangan. Sizning yoshingiz ${age} ga yetarlimi?`;
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
  const defaultImg = getDefaultImage();
  
  // Rasm URL ni to'g'rilash
  let posterUrl = defaultImg;
  if (m.rasm) {
    if (m.rasm.startsWith('http://') || m.rasm.startsWith('https://')) {
      posterUrl = m.rasm;
    } else if (m.rasm.startsWith('/uploads/')) {
      posterUrl = BASE_URL + m.rasm;
    } else if (m.rasm.startsWith('uploads/')) {
      posterUrl = BASE_URL + '/' + m.rasm;
    } else {
      posterUrl = BASE_URL + '/uploads/' + m.rasm;
    }
  }

  let videoHtml = '', qismlarHtml = '';

  // VIDEO URL ni to'g'rilash
  function getVideoUrl(video) {
    if (!video) return '';
    if (video.startsWith('http://') || video.startsWith('https://')) {
      return video;
    }
    if (video.startsWith('/uploads/')) {
      return BASE_URL + video;
    }
    if (video.startsWith('uploads/')) {
      return BASE_URL + '/' + video;
    }
    return BASE_URL + '/uploads/' + video;
  }

  if (m.turi === 'film') {
    const videoUrl = getVideoUrl(m.video);
    if (videoUrl) {
      videoHtml = `
        <div class="modal-video">
          <video controls width="100%" id="player">
            <source src="${videoUrl}" type="video/mp4" />
            Brauzeringiz video ko'rsatishni qo'llab-quvvatlamaydi.
          </video>
        </div>
      `;
    } else {
      videoHtml = `<p style="color:var(--color-text-secondary);">🎬 Video mavjud emas</p>`;
    }
  } else if (m.qismlar?.length) {
    qismlarHtml = `
      <div class="qismlar-list">
        ${m.qismlar.map((q, i) => `
          <button class="qism-btn ${i===0?'active':''}" onclick="playQism(${i})">
            ${q.qismRaqami}-qism
          </button>
        `).join('')}
      </div>
    `;
    
    const firstVideo = getVideoUrl(m.qismlar[0]?.video);
    if (firstVideo) {
      videoHtml = `
        <div class="modal-video">
          <video controls width="100%" id="player">
            <source src="${firstVideo}" type="video/mp4" />
            Brauzeringiz video ko'rsatishni qo'llab-quvvatlamaydi.
          </video>
        </div>
      `;
    } else {
      videoHtml = `<p style="color:var(--color-text-secondary);">📺 Qism videolari mavjud emas</p>`;
    }
  }

  modalBody.innerHTML = `
    <div class="modal-movie-detail">
      <img 
        src="${posterUrl}" 
        alt="${m.nomi}" 
        class="modal-poster"
        onerror="this.src='${defaultImg}'"
      />
      <div class="modal-info">
        <h2>${m.nomi}</h2>
        <div class="movie-meta">
          <span>${m.turi === 'film' ? '🎬 Film' : '📺 Serial'}</span>
          <span>${m.yili}</span>
          <span>${m.davlati}</span>
          <span>🔞 ${m.yoshChegarasi || '0+'}</span>
          <span>⏱ ${m.davomiyligi || 'Noma\'lum'}</span>
        </div>
        <p><strong>Janr:</strong> ${m.janr} | <strong>Til:</strong> ${m.tili || 'Noma\'lum'}</p>
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
  
  document.querySelectorAll('.qism-btn').forEach((b, i) => {
    b.classList.toggle('active', i === index);
  });

  function getVideoUrl(video) {
    if (!video) return '';
    if (video.startsWith('http://') || video.startsWith('https://')) return video;
    if (video.startsWith('/uploads/')) return BASE_URL + video;
    if (video.startsWith('uploads/')) return BASE_URL + '/' + video;
    return BASE_URL + '/uploads/' + video;
  }

  const player = document.getElementById('player');
  if (player) {
    const videoUrl = getVideoUrl(m.qismlar[index].video);
    if (videoUrl) {
      player.src = videoUrl;
      player.load();
      player.play().catch(() => {});
    }
  }
}

// ============ EVENTS ============
ageYes.addEventListener('click', () => { 
  ageModal.classList.remove('active'); 
  showDetails(currentMovie); 
});

ageNo.addEventListener('click', () => { 
  ageModal.classList.remove('active'); 
  movieModal.classList.remove('active'); 
});

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
  // Loading kartochkalar
  const defaultImg = getDefaultImage();
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
