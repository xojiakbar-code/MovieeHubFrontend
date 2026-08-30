// =========================================================
// MOVIEHUB FRONTEND - TO'LIQ VERSIYA
// =========================================================

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
let isFirstLoad = true;

// =========================================================
// LOADING
// =========================================================

function showLoading(msg = 'Yuklanmoqda...') {
  loadingText.textContent = msg;
  loadingOverlay.classList.add('active');
}

function hideLoading() {
  loadingOverlay.classList.remove('active');
}

// =========================================================
// DEFAULT IMAGE
// =========================================================

function getDefaultImage() {
  return 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
      <rect width="300" height="400" fill="#1a1a1a"/>
      <text x="150" y="180" font-family="Arial" font-size="24" fill="#444" text-anchor="middle">🎬</text>
      <text x="150" y="220" font-family="Arial" font-size="16" fill="#666" text-anchor="middle">No Image</text>
    </svg>
  `);
}

// =========================================================
// URL FIX FUNKSIYALARI
// =========================================================

function fixImageUrl(url) {
  if (!url) return getDefaultImage();
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return BASE_URL + url;
  if (url.startsWith('uploads/')) return BASE_URL + '/' + url;
  return BASE_URL + '/uploads/' + url;
}

function fixVideoUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return BASE_URL + url;
  if (url.startsWith('uploads/')) return BASE_URL + '/' + url;
  return BASE_URL + '/uploads/' + url;
}

// =========================================================
// YOUTUBE FUNKSIYALARI
// =========================================================

function isYouTubeUrl(url) {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
}

function getYouTubeEmbedUrl(url) {
  let videoId = '';
  
  if (url.includes('watch?v=')) {
    videoId = url.split('watch?v=')[1].split('&')[0];
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1].split('?')[0];
  } else if (url.includes('/embed/')) {
    videoId = url.split('/embed/')[1].split('?')[0];
  }
  
  if (videoId) {
    // Toza pleyer - hech qanday qo'shimcha elementlar ko'rinmaydi
    return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&controls=1&color=white&disablekb=1&fs=1&hl=uz`;
  }
  return url;
}

// =========================================================
// FILMLARNI YUKLASH
// =========================================================

async function loadMovies(search = '') {
  if (!isFirstLoad) showLoading('Filmlar yuklanmoqda...');
  
  try {
    const url = search ? `${API_URL}/movies/search?q=${encodeURIComponent(search)}` : `${API_URL}/movies`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Xatolik');
    
    renderMovies(data.data || []);
    isFirstLoad = false;
    
  } catch (error) {
    console.error('Yuklash xatosi:', error);
    if (error.name === 'AbortError') {
      moviesGrid.innerHTML = `
        <div style="text-align:center;color:var(--color-danger);padding:40px;grid-column:1/-1;">
          ⏳ So'rov uzoq davom etmoqda
          <br />
          <button onclick="loadMovies()" class="btn btn-primary" style="margin-top:10px;">Qayta urinish</button>
        </div>
      `;
    } else {
      moviesGrid.innerHTML = `
        <div style="text-align:center;color:var(--color-danger);padding:40px;grid-column:1/-1;">
          ❌ Xatolik: ${error.message}
          <br />
          <button onclick="loadMovies()" class="btn btn-primary" style="margin-top:10px;">Qayta urinish</button>
        </div>
      `;
    }
  }
  
  hideLoading();
}

// =========================================================
// RENDER MOVIES
// =========================================================

function renderMovies(movies) {
  if (!movies || movies.length === 0) {
    moviesGrid.innerHTML = `
      <div style="text-align:center;color:var(--color-text-secondary);padding:40px;grid-column:1/-1;">
        🎬 Filmlar topilmadi
      </div>
    `;
    return;
  }

  const defaultImg = getDefaultImage();

  moviesGrid.innerHTML = movies.map(m => {
    const imgUrl = fixImageUrl(m.rasm);
    return `
      <div class="movie-card" onclick="openMovie('${m._id}')">
        <img 
          src="${imgUrl}" 
          alt="${m.nomi}" 
          class="movie-poster"
          loading="lazy"
          onerror="this.src='${defaultImg}'"
        />
        <div class="movie-info">
          <div class="movie-title">${m.nomi}</div>
          <div class="movie-meta">
            <span>${m.yili}</span>
            <span>${m.turi === 'film' ? '🎬' : '📺'}</span>
          </div>
          <div class="movie-genre">${m.janr || ''}</div>
        </div>
      </div>
    `;
  }).join('');
}

// =========================================================
// FILMNI OCHISH
// =========================================================

async function openMovie(id) {
  showLoading('Film yuklanmoqda...');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(`${API_URL}/movies/${id}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Film topilmadi');
    
    currentMovie = data.data;
    hideLoading();
    
    const age = currentMovie.yoshChegarasi || '0+';
    if (RESTRICTED_AGES.includes(age)) {
      ageMessage.textContent = `Ushbu film uchun yosh chegarasi ${age} deb belgilangan. Sizning yoshingiz ${age} ga yetarlimi?`;
      ageModal.classList.add('active');
    } else {
      showDetails(currentMovie);
    }
  } catch (error) {
    hideLoading();
    if (error.name === 'AbortError') {
      alert('⏳ So\'rov uzoq davom etmoqda. Qayta urinib ko\'ring.');
    } else {
      alert('❌ Xatolik: ' + error.message);
    }
  }
}

// =========================================================
// SHOW DETAILS
// =========================================================

function showDetails(m) {
  const defaultImg = getDefaultImage();
  const posterUrl = fixImageUrl(m.rasm);

  let videoHtml = '', qismlarHtml = '';

  if (m.turi === 'film') {
    const videoUrl = fixVideoUrl(m.video);
    if (videoUrl) {
      if (isYouTubeUrl(videoUrl)) {
        const embedUrl = getYouTubeEmbedUrl(videoUrl);
        videoHtml = `
          <div class="modal-video">
            <iframe 
              src="${embedUrl}" 
              allowfullscreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              loading="lazy"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            ></iframe>
          </div>
        `;
      } else {
        videoHtml = `
          <div class="modal-video">
            <video controls width="100%" id="player" preload="metadata">
              <source src="${videoUrl}" type="video/mp4" />
            </video>
          </div>
        `;
      }
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
    
    const firstVideo = fixVideoUrl(m.qismlar[0]?.video);
    if (firstVideo) {
      if (isYouTubeUrl(firstVideo)) {
        const embedUrl = getYouTubeEmbedUrl(firstVideo);
        videoHtml = `
          <div class="modal-video">
            <iframe 
              src="${embedUrl}" 
              allowfullscreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              loading="lazy"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            ></iframe>
          </div>
        `;
      } else {
        videoHtml = `
          <div class="modal-video">
            <video controls width="100%" id="player" preload="metadata">
              <source src="${firstVideo}" type="video/mp4" />
            </video>
          </div>
        `;
      }
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

// =========================================================
// PLAY QISM
// =========================================================

function playQism(index) {
  const m = currentMovie;
  if (!m?.qismlar?.[index]) return;
  
  document.querySelectorAll('.qism-btn').forEach((b, i) => {
    b.classList.toggle('active', i === index);
  });

  const player = document.getElementById('player');
  if (player) {
    const videoUrl = fixVideoUrl(m.qismlar[index].video);
    if (videoUrl) {
      if (isYouTubeUrl(videoUrl)) {
        const embedUrl = getYouTubeEmbedUrl(videoUrl);
        const parent = player.parentElement;
        parent.innerHTML = `
          <iframe 
            src="${embedUrl}" 
            style="width:100%;height:450px;border-radius:10px;border:none;"
            allowfullscreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            loading="lazy"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          ></iframe>
        `;
      } else {
        player.src = videoUrl;
        player.load();
        player.play().catch(() => {});
      }
    }
  }
}

// =========================================================
// EVENTS
// =========================================================

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

searchBtn.addEventListener('click', () => {
  const q = searchInput.value.trim();
  if (q.length >= 2) {
    loadMovies(q);
  } else if (q === '') {
    loadMovies('');
  }
});

searchInput.addEventListener('keypress', (e) => { 
  if (e.key === 'Enter') searchBtn.click(); 
});

// =========================================================
// LOAD
// =========================================================

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
  
  setTimeout(() => loadMovies(), 100);
});
