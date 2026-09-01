// =========================================================
// MOVIEHUB FRONTEND - TO'LIQ TUZATILGAN
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
const suggestionsContainer = $('suggestionsContainer');

let currentMovie = null;
let isFirstLoad = true;
let currentAbortController = null;
let currentVideoPlayer = null;
let searchTimeout = null;
let allMovies = [];

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
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
      <rect width="300" height="400" fill="#1a1a1a"/>
      <circle cx="150" cy="150" r="60" fill="#2a2a2a"/>
      <text x="150" y="165" font-family="Arial" font-size="40" text-anchor="middle" fill="#444">🎬</text>
      <text x="150" y="220" font-family="Arial" font-size="14" fill="#555" text-anchor="middle">No Image</text>
    </svg>
  `);
}

// =========================================================
// URL FIX - RASMLAR TO'G'RILANGAN
// =========================================================

function fixImageUrl(url) {
  if (!url) return getDefaultImage();
  
  // Agar URL to'g'ridan-to'g'ri http yoki https bo'lsa
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Agar URL /uploads/ bilan boshlansa
  if (url.startsWith('/uploads/')) {
    return BASE_URL + url;
  }
  
  // Agar URL uploads/ bilan boshlansa (slashsiz)
  if (url.startsWith('uploads/')) {
    return BASE_URL + '/' + url;
  }
  
  // Agar URL faqat fayl nomi bo'lsa
  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    return BASE_URL + '/uploads/' + url;
  }
  
  // Hech narsa bo'lmasa default rasm
  return getDefaultImage();
}

function fixVideoUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return BASE_URL + url;
  if (url.startsWith('uploads/')) return BASE_URL + '/' + url;
  return BASE_URL + '/uploads/' + url;
}

// =========================================================
// YOUTUBE
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
    return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&controls=1&color=white&disablekb=1&fs=1&hl=uz`;
  }
  return url;
}

// =========================================================
// VIDEO TO'XTATISH
// =========================================================

function stopVideo() {
  if (currentVideoPlayer) {
    try { currentVideoPlayer.pause(); currentVideoPlayer.currentTime = 0; } catch(e) {}
    currentVideoPlayer = null;
  }
  document.querySelectorAll('.modal-video video').forEach(el => {
    try { el.pause(); el.currentTime = 0; } catch(e) {}
  });
  document.querySelectorAll('.modal-video iframe').forEach(iframe => {
    if (iframe && iframe.src && iframe.src.includes('youtube.com')) {
      try { iframe.src = 'about:blank'; } catch(e) {}
    }
  });
}

// =========================================================
// AQLLI QIDIRUV
// =========================================================

function getSearchSuggestions(query, movies) {
  if (!query || query.length < 1) return [];
  
  const q = query.toLowerCase().trim();
  const results = [];
  
  const exactMatches = movies.filter(m => 
    m.nomi.toLowerCase().includes(q) || 
    m.janr.toLowerCase().includes(q)
  );
  
  const fuzzyMatches = movies.filter(m => {
    const name = m.nomi.toLowerCase();
    let nameIndex = 0, queryIndex = 0, matches = 0;
    while (nameIndex < name.length && queryIndex < q.length) {
      if (name[nameIndex] === q[queryIndex]) {
        matches++;
        queryIndex++;
      }
      nameIndex++;
    }
    return matches / q.length >= 0.6;
  });
  
  const allResults = [...exactMatches, ...fuzzyMatches];
  const uniqueResults = [];
  const seenIds = new Set();
  
  for (const movie of allResults) {
    if (!seenIds.has(movie._id)) {
      seenIds.add(movie._id);
      uniqueResults.push(movie);
    }
  }
  
  return uniqueResults;
}

function showSuggestions(movies, query) {
  if (!query || query.length < 1) {
    suggestionsContainer.classList.remove('active');
    suggestionsContainer.innerHTML = '';
    return;
  }
  
  const suggestions = getSearchSuggestions(movies, query);
  
  if (suggestions.length === 0) {
    suggestionsContainer.innerHTML = `
      <div class="suggestion-item no-result">
        <span>🔍 Natija topilmadi</span>
      </div>
    `;
    suggestionsContainer.classList.add('active');
    return;
  }
  
  const topSuggestions = suggestions.slice(0, 5);
  
  suggestionsContainer.innerHTML = topSuggestions.map(m => {
    const imgUrl = fixImageUrl(m.rasm);
    return `
      <div class="suggestion-item" onclick="selectSuggestion('${m._id}')">
        <div class="suggestion-poster">
          <img src="${imgUrl}" alt="${m.nomi}" onerror="this.src='${getDefaultImage()}'" />
        </div>
        <div class="suggestion-info">
          <div class="suggestion-title">${m.nomi}</div>
          <div class="suggestion-meta">${m.yili} • ${m.janr}</div>
        </div>
      </div>
    `;
  }).join('');
  
  suggestionsContainer.classList.add('active');
}

function selectSuggestion(movieId) {
  suggestionsContainer.classList.remove('active');
  suggestionsContainer.innerHTML = '';
  openMovie(movieId);
}

// =========================================================
// LOADING KARTOCHKALAR
// =========================================================

function renderLoadingCards() {
  const cards = [];
  for (let i = 0; i < 8; i++) {
    const isWide = (i % 3 === 0);
    if (isWide) {
      cards.push(`
        <div class="loading-card-wide">
          <div class="poster-placeholder"></div>
          <div class="info-placeholder">
            <div class="title-placeholder"></div>
            <div class="meta-placeholder"></div>
          </div>
        </div>
      `);
    } else {
      cards.push(`
        <div class="loading-card">
          <div class="poster-placeholder"></div>
          <div class="info-placeholder">
            <div class="title-placeholder"></div>
            <div class="meta-placeholder"></div>
          </div>
        </div>
      `);
    }
  }
  moviesGrid.innerHTML = `<div class="loading-grid">${cards.join('')}</div>`;
}

// =========================================================
// FILMLARNI YUKLASH
// =========================================================

async function loadMovies(search = '') {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  if (!isFirstLoad) showLoading('Filmlar yuklanmoqda...');
  currentAbortController = new AbortController();
  const signal = currentAbortController.signal;
  try {
    const url = search ? `${API_URL}/movies/search?q=${encodeURIComponent(search)}` : `${API_URL}/movies`;
    const timeoutId = setTimeout(() => { if (currentAbortController) currentAbortController.abort(); }, 10000);
    const res = await fetch(url, { signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Xatolik');
    
    allMovies = data.data || [];
    renderMovies(allMovies);
    isFirstLoad = false;
  } catch (error) {
    console.error('Yuklash xatosi:', error);
    if (error.name === 'AbortError') {
      if (!isFirstLoad) {
        moviesGrid.innerHTML = `<div style="text-align:center;color:var(--color-text-secondary);padding:40px;grid-column:1/-1;">⏳ So'rov bekor qilindi</div>`;
      }
      return;
    }
    moviesGrid.innerHTML = `
      <div style="text-align:center;color:var(--color-danger);padding:40px;grid-column:1/-1;">
        ❌ Xatolik: ${error.message}
        <br />
        <button onclick="loadMovies()" class="btn btn-primary" style="margin-top:10px;padding:8px 20px;border:none;border-radius:8px;background:var(--color-accent);color:#fff;cursor:pointer;">🔄 Qayta yuklash</button>
      </div>
    `;
  }
  hideLoading();
  currentAbortController = null;
}

// =========================================================
// RENDER MOVIES - TUZATILGAN
// =========================================================

function renderMovies(movies) {
  if (!movies || movies.length === 0) {
    moviesGrid.innerHTML = `
      <div style="text-align:center;color:var(--color-text-secondary);padding:40px;grid-column:1/-1;">
        🎬 Filmlar topilmadi
        <br />
        <button onclick="loadMovies()" class="btn btn-primary" style="margin-top:10px;padding:8px 20px;border:none;border-radius:8px;background:var(--color-accent);color:#fff;cursor:pointer;">🔄 Qayta yuklash</button>
      </div>
    `;
    return;
  }
  
  const defaultImg = getDefaultImage();
  
  moviesGrid.innerHTML = movies.map((m, index) => {
    const imgUrl = fixImageUrl(m.rasm);
    const isWide = (index % 3 === 0);
    const cardClass = isWide ? 'movie-card-wide' : 'movie-card';
    
    return `
      <div class="${cardClass}" onclick="openMovie('${m._id}')">
        <img 
          src="${imgUrl}" 
          alt="${m.nomi}" 
          class="movie-poster"
          loading="lazy"
          onerror="this.onerror=null; this.src='${defaultImg}'"
        />
        <div class="movie-info">
          <div>
            <div class="movie-title">${m.nomi}</div>
            ${isWide ? `<div class="movie-genre">${m.janr || ''}</div>` : ''}
          </div>
          <div class="movie-meta">
            <span>${m.yili}</span>
            <span>${m.turi === 'film' ? '🎬' : '📺'}</span>
            ${!isWide ? `<span>${m.janr || ''}</span>` : ''}
          </div>
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
    const timeoutId = setTimeout(() => controller.abort(), 10000);
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
        videoHtml = `<div class="modal-video"><iframe src="${embedUrl}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" loading="lazy" sandbox="allow-same-origin allow-scripts allow-popups allow-forms"></iframe></div>`;
      } else {
        videoHtml = `<div class="modal-video"><video controls width="100%" id="player" preload="metadata"><source src="${videoUrl}" type="video/mp4" /></video></div>`;
      }
    } else {
      videoHtml = `<p style="color:var(--color-text-secondary);padding:20px;">🎬 Video mavjud emas</p>`;
    }
  } else if (m.qismlar?.length) {
    const firstVideo = fixVideoUrl(m.qismlar[0]?.video);
    if (firstVideo) {
      if (isYouTubeUrl(firstVideo)) {
        const embedUrl = getYouTubeEmbedUrl(firstVideo);
        videoHtml = `<div class="modal-video"><iframe src="${embedUrl}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" loading="lazy" sandbox="allow-same-origin allow-scripts allow-popups allow-forms"></iframe></div>`;
      } else {
        videoHtml = `<div class="modal-video"><video controls width="100%" id="player" preload="metadata"><source src="${firstVideo}" type="video/mp4" /></video></div>`;
      }
    } else {
      videoHtml = `<p style="color:var(--color-text-secondary);padding:20px;">📺 Video mavjud emas</p>`;
    }
    qismlarHtml = `
      <div class="qismlar-container">
        <div class="qismlar-list">
          ${m.qismlar.map((q, i) => `
            <div class="qism-item-wrapper">
              <button class="qism-btn ${i===0?'active':''}" onclick="playQism(${i})">${q.qismRaqami}-qism</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  modalBody.innerHTML = `
    <div class="modal-movie-detail">
      <div class="modal-left">
        <div class="modal-poster-container">
          <img src="${posterUrl}" alt="${m.nomi}" class="modal-poster" onerror="this.onerror=null; this.src='${defaultImg}'" />
        </div>
        ${qismlarHtml}
      </div>
      <div class="modal-right">
        ${videoHtml}
        <h2>${m.nomi}</h2>
        <div class="movie-meta">
          <span>${m.turi === 'film' ? '🎬 Film' : '📺 Serial'}</span>
          <span>${m.yili}</span>
          <span>${m.davlati}</span>
          <span>🔞 ${m.yoshChegarasi || '0+'}</span>
          <span>⏱ ${m.davomiyligi || 'Noma\'lum'}</span>
        </div>
        <p><strong>Janr:</strong> ${m.janr} | <strong>Til:</strong> ${m.tili || 'Noma\'lum'}</p>
      </div>
    </div>
  `;
  movieModal.classList.add('active');
  setTimeout(() => { currentVideoPlayer = document.getElementById('player'); }, 100);
}

// =========================================================
// PLAY QISM
// =========================================================

function playQism(index) {
  if (!currentMovie) return;
  if (!currentMovie.qismlar || currentMovie.qismlar.length === 0) return;
  const qism = currentMovie.qismlar[index];
  if (!qism) return;
  stopVideo();
  document.querySelectorAll('.qism-btn').forEach((btn, i) => btn.classList.toggle('active', i === index));
  const videoUrl = fixVideoUrl(qism.video);
  if (!videoUrl) return;
  let videoContainer = document.querySelector('.modal-right .modal-video');
  if (!videoContainer) {
    const modalRight = document.querySelector('.modal-right');
    if (modalRight) {
      const newVideoContainer = document.createElement('div');
      newVideoContainer.className = 'modal-video';
      modalRight.insertBefore(newVideoContainer, modalRight.firstChild);
      videoContainer = newVideoContainer;
    }
  }
  if (!videoContainer) return;
  videoContainer.innerHTML = '';
  if (isYouTubeUrl(videoUrl)) {
    const embedUrl = getYouTubeEmbedUrl(videoUrl);
    videoContainer.innerHTML = `<iframe src="${embedUrl}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" loading="lazy" sandbox="allow-same-origin allow-scripts allow-popups allow-forms"></iframe>`;
  } else {
    videoContainer.innerHTML = `<video controls width="100%" id="player" preload="metadata"><source src="${videoUrl}" type="video/mp4" /></video>`;
  }
  setTimeout(() => {
    currentVideoPlayer = document.getElementById('player');
    if (currentVideoPlayer) currentVideoPlayer.play().catch(() => {});
  }, 100);
}

// =========================================================
// MODAL YOPISH
// =========================================================

function closeModal() {
  stopVideo();
  const videoContainer = document.querySelector('.modal-video');
  if (videoContainer) {
    const iframe = videoContainer.querySelector('iframe');
    if (iframe) iframe.src = 'about:blank';
    const video = videoContainer.querySelector('video');
    if (video) { video.pause(); video.currentTime = 0; video.removeAttribute('src'); video.load(); }
  }
  movieModal.classList.remove('active');
  ageModal.classList.remove('active');
  document.body.style.overflow = '';
}

// =========================================================
// QIDIRUV EVENTS
// =========================================================

searchInput.addEventListener('input', function(e) {
  const query = this.value.trim();
  if (searchTimeout) clearTimeout(searchTimeout);
  if (query.length === 0) {
    suggestionsContainer.classList.remove('active');
    suggestionsContainer.innerHTML = '';
    loadMovies('');
    return;
  }
  searchTimeout = setTimeout(() => {
    showSuggestions(allMovies, query);
  }, 300);
});

searchBtn.addEventListener('click', function() {
  const query = searchInput.value.trim();
  suggestionsContainer.classList.remove('active');
  suggestionsContainer.innerHTML = '';
  if (query.length > 0) loadMovies(query);
  else loadMovies('');
});

searchInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') searchBtn.click();
});

document.addEventListener('click', function(e) {
  if (!e.target.closest('.search-container') && !e.target.closest('.suggestions-container')) {
    suggestionsContainer.classList.remove('active');
    suggestionsContainer.innerHTML = '';
  }
});

// =========================================================
// EVENTS
// =========================================================

ageYes.addEventListener('click', () => { ageModal.classList.remove('active'); showDetails(currentMovie); });
ageNo.addEventListener('click', closeModal);
modalClose.addEventListener('click', closeModal);
movieModal.addEventListener('click', (e) => { if (e.target === movieModal) closeModal(); });

// =========================================================
// LOAD
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  renderLoadingCards();
  setTimeout(() => loadMovies(), 100);
});

// Global funksiyalar
window.loadMovies = loadMovies;
window.openMovie = openMovie;
window.playQism = playQism;
window.closeModal = closeModal;
window.selectSuggestion = selectSuggestion;
