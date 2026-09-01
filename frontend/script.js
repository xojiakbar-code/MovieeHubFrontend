// =========================================================
// MOVIEHUB FRONTEND - TO'LIQ (AQLLI QIDIRUV, HARFLARGA MOSLASHUVCHI)
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
let allMovies = [];       // backenddan kelgan TO'LIQ ro'yxat (bo'sh qidiruv bilan yuklangan)
let activeSuggestionIndex = -1;

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
// URL FIX
// =========================================================

function fixImageUrl(url) {
  if (!url) return getDefaultImage();
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return BASE_URL + url;
  if (url.startsWith('uploads/')) return BASE_URL + '/' + url;
  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    return BASE_URL + '/uploads/' + url;
  }
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
// AQLLI QIDIRUV — HARFLARGA MOSLASHUVCHI (FUZZY + SUBSEQUENCE)
// =========================================================
// "Conset"/"Consert" -> "Konsert" ni topadi:
//  1) Harflarni sinflarga normallashtiradi (c/k/q, s/z, o/a, ...)
//  2) Subsequence matching — orada boshqa harflar bo'lsa ham
//     ketma-ket mos kelgan harflarni hisoblaydi.

const CHAR_CLASS_MAP = {
  'k': 'k', 'c': 'k', 'q': 'k',
  's': 's', 'z': 's',
  'o': 'o', 'a': 'o',
  'e': 'e', 'i': 'e', 'y': 'e',
  'u': 'u', 'v': 'v', 'w': 'v',
  'g': 'g', "g'": 'g', 'gʻ': 'g', 'ğ': 'g',
  'x': 'x', 'h': 'x'
};

function normalizeChar(ch) {
  return CHAR_CLASS_MAP[ch] || ch;
}

function normalizeString(str) {
  return String(str)
    .toLowerCase()
    .replace(/[’'ʻ`]/g, '')
    .split('')
    .map(normalizeChar)
    .join('');
}

function fuzzyScore(query, name) {
  const q = normalizeString(query.trim());
  const n = normalizeString(name);

  if (!q) return 0;

  if (n.includes(q)) {
    return 1;
  }

  let qi = 0;
  let firstMatch = -1;
  let lastMatch = -1;
  let matchedCount = 0;

  for (let ni = 0; ni < n.length && qi < q.length; ni++) {
    if (n[ni] === q[qi]) {
      if (firstMatch === -1) firstMatch = ni;
      lastMatch = ni;
      matchedCount++;
      qi++;
    }
  }

  const coverage = matchedCount / q.length;

  if (matchedCount === 0) return 0;

  if (q.length <= 2) {
    return n.startsWith(q) ? 0.9 : (coverage >= 1 ? 0.5 : 0);
  }

  if (coverage < 0.55) return 0;

  const span = lastMatch - firstMatch + 1;
  const density = q.length / span;

  return 0.3 + coverage * 0.4 + density * 0.3;
}

function getSearchSuggestions(movies, query) {
  if (!query || query.length < 1) return [];

  const q = query.trim();
  if (!q) return [];

  const scored = movies.map(m => {
    const nameScore = fuzzyScore(q, m.nomi || '');
    const genreScore = fuzzyScore(q, m.janr || '') * 0.6;
    const score = Math.max(nameScore, genreScore);
    return { movie: m, score };
  });

  return scored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.movie);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlightMatch(text, query) {
  const nText = normalizeString(text);
  const nQuery = normalizeString(query.trim());
  const idx = nText.indexOf(nQuery);
  if (idx === -1 || !nQuery) return escapeHtml(text);

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + nQuery.length);
  const after = text.slice(idx + nQuery.length);
  return `${escapeHtml(before)}<mark style="background:var(--color-accent);color:#fff;border-radius:3px;padding:0 2px;">${escapeHtml(match)}</mark>${escapeHtml(after)}`;
}

function showSuggestions(movies, query) {
  activeSuggestionIndex = -1;

  if (!query || query.length < 1) {
    suggestionsContainer.classList.remove('active');
    suggestionsContainer.innerHTML = '';
    return;
  }

  const suggestions = getSearchSuggestions(movies, query);

  if (suggestions.length === 0) {
    suggestionsContainer.innerHTML = `
      <div class="suggestion-item no-result">
        <span>🔍 Natija topilmadi: "${escapeHtml(query)}"</span>
      </div>
    `;
    suggestionsContainer.classList.add('active');
    return;
  }

  const topSuggestions = suggestions.slice(0, 6);

  suggestionsContainer.innerHTML = topSuggestions.map((m, i) => {
    const imgUrl = fixImageUrl(m.rasm);
    const titleHtml = highlightMatch(m.nomi, query);
    return `
      <div class="suggestion-item" data-index="${i}" onclick="selectSuggestion('${m._id}')">
        <div class="suggestion-poster">
          <img src="${imgUrl}" alt="${escapeHtml(m.nomi)}" onerror="this.src='${getDefaultImage()}'" />
        </div>
        <div class="suggestion-info">
          <div class="suggestion-title">${titleHtml}</div>
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

function updateActiveSuggestion(items) {
  items.forEach((el, i) => {
    el.classList.toggle('active-suggestion', i === activeSuggestionIndex);
  });
  if (activeSuggestionIndex >= 0 && items[activeSuggestionIndex]) {
    items[activeSuggestionIndex].scrollIntoView({ block: 'nearest' });
  }
}

searchInput.addEventListener('keydown', function(e) {
  const items = Array.from(suggestionsContainer.querySelectorAll('.suggestion-item:not(.no-result)'));

  if (e.key === 'Enter') {
    if (suggestionsContainer.classList.contains('active') && activeSuggestionIndex >= 0 && items[activeSuggestionIndex]) {
      e.preventDefault();
      items[activeSuggestionIndex].click();
      return;
    }
    e.preventDefault();
    runSearch();
    return;
  }

  if (!suggestionsContainer.classList.contains('active') || items.length === 0) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
    updateActiveSuggestion(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
    updateActiveSuggestion(items);
  } else if (e.key === 'Escape') {
    suggestionsContainer.classList.remove('active');
    suggestionsContainer.innerHTML = '';
  }
});

// =========================================================
// ENTER / QIDIRUV TUGMASI BOSILGANDA — TUZATILDI
// =========================================================
// MUAMMO EDI: backendga so'rov ketib, backend bo'sh natija
// qaytarsa, u local fuzzy natijalarni "topilmadi" bilan
// bosib ketardi. Endi: local fuzzy natija topilsa, backend
// javobi bo'sh bo'lganda ham O'SHA natija grid'da qoladi.

function runSearch() {
  const query = searchInput.value.trim();
  suggestionsContainer.classList.remove('active');
  suggestionsContainer.innerHTML = '';

  if (query.length === 0) {
    loadMovies('');
    return;
  }

  // 1) Darhol LOCAL fuzzy natijalarni ko'rsatish
  //    (allMovies — bo'sh so'rov bilan yuklangan TO'LIQ ro'yxat)
  const localResults = getSearchSuggestions(allMovies, query);

  if (localResults.length > 0) {
    renderMovies(localResults);
  } else {
    renderLoadingCards();
  }

  // 2) Backendga ham so'rov yuboramiz, lekin natijani faqat
  //    backend NATIJA BERGANDA almashtiramiz — bo'sh javob
  //    local natijalarni o'chirmaydi.
  searchOnServer(query, localResults);
}

async function searchOnServer(query, fallbackResults) {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  currentAbortController = new AbortController();
  const signal = currentAbortController.signal;

  try {
    const timeoutId = setTimeout(() => { if (currentAbortController) currentAbortController.abort(); }, 10000);
    const res = await fetch(`${API_URL}/movies/search?q=${encodeURIComponent(query)}`, { signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Xatolik');

    const serverResults = data.data || [];

    if (serverResults.length > 0) {
      // Backend natija topsa — uni ko'rsatamiz (aniqroq bo'lishi mumkin)
      renderMovies(serverResults);
    } else if (fallbackResults.length > 0) {
      // Backend bo'sh qaytardi, lekin LOCAL fuzzy natija bor edi —
      // O'SHANI saqlab qolamiz, "topilmadi" ko'rsatmaymiz
      renderMovies(fallbackResults);
    } else {
      // Ikkalasida ham natija yo'q — endi "topilmadi" to'g'ri
      renderMovies([]);
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error('Qidiruv xatosi:', error);
    // Xatolik bo'lsa ham, local natijalar bo'lsa ko'rsatishda davom etamiz
    if (fallbackResults.length > 0) {
      renderMovies(fallbackResults);
    }
  }
  currentAbortController = null;
}

// =========================================================
// LOADING KARTOCHKALAR — .movies-grid ICHIGA to'g'ridan-to'g'ri
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
  moviesGrid.innerHTML = cards.join('');
}

// =========================================================
// FILMLARNI YUKLASH (bosh sahifa / bo'sh qidiruv)
// =========================================================

async function loadMovies(search = '') {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  if (!isFirstLoad && moviesGrid.children.length === 0) {
    renderLoadingCards();
  }
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

    const results = data.data || [];

    // Faqat bo'sh qidiruv (bosh sahifa yuklanishi) allMovies'ni
    // TO'LIQ ro'yxat sifatida saqlaydi — shu fuzzy qidiruv uchun ishlatiladi
    if (!search) {
      allMovies = results;
    }

    renderMovies(results);
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
// RENDER MOVIES
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
        <div class="poster-wrap">
          <img
            src="${imgUrl}"
            alt="${escapeHtml(m.nomi)}"
            class="movie-poster"
            loading="lazy"
            onerror="this.onerror=null; this.src='${defaultImg}'"
          />
        </div>
        <div class="movie-info">
          <div>
            <div class="movie-title">${escapeHtml(m.nomi)}</div>
            ${isWide ? `<div class="movie-genre">${escapeHtml(m.janr || '')}</div>` : ''}
          </div>
          <div class="movie-meta">
            <span>${m.yili}</span>
            <span>${m.turi === 'film' ? '🎬' : '📺'}</span>
            ${!isWide ? `<span>${escapeHtml(m.janr || '')}</span>` : ''}
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
          <img src="${posterUrl}" alt="${escapeHtml(m.nomi)}" class="modal-poster" onerror="this.onerror=null; this.src='${defaultImg}'" />
        </div>
        ${qismlarHtml}
      </div>
      <div class="modal-right">
        ${videoHtml}
        <h2>${escapeHtml(m.nomi)}</h2>
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
// QIDIRUV EVENTS — REAL-TIME (YOUTUBE / UZMOVI KABI)
// =========================================================

searchInput.addEventListener('input', function(e) {
  const query = this.value;
  if (searchTimeout) clearTimeout(searchTimeout);

  if (query.trim().length === 0) {
    suggestionsContainer.classList.remove('active');
    suggestionsContainer.innerHTML = '';
    loadMovies('');
    return;
  }

  searchTimeout = setTimeout(() => {
    showSuggestions(allMovies, query);
  }, 120);
});

searchInput.addEventListener('focus', function() {
  const query = this.value;
  if (query.trim().length > 0) {
    showSuggestions(allMovies, query);
  }
});

searchBtn.addEventListener('click', runSearch);

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
