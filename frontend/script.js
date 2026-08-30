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

let currentMovie = null;
let isFirstLoad = true;
let currentAbortController = null;
let currentVideoPlayer = null;

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
// VIDEO TO'XTATISH (YANGI FUNKSIYA)
// =========================================================

function stopVideo() {
  // Oddiy video player
  if (currentVideoPlayer) {
    currentVideoPlayer.pause();
    currentVideoPlayer.currentTime = 0;
    currentVideoPlayer = null;
  }
  
  // YouTube iframe
  const iframe = document.querySelector('.modal-video iframe');
  if (iframe && iframe.src) {
    // YouTube iframe ni to'xtatish
    try {
      iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
    } catch(e) {
      // Agar postMessage ishlamasa, iframe ni qayta yuklash
      const src = iframe.src;
      iframe.src = src.replace('autoplay=0', 'autoplay=0');
    }
  }
  
  // Barcha videolarni to'xtatish
  document.querySelectorAll('.modal-video video, .modal-video iframe').forEach(el => {
    if (el.tagName === 'VIDEO') {
      el.pause();
      el.currentTime = 0;
    }
  });
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
    
    const timeoutId = setTimeout(() => {
      if (currentAbortController) {
        currentAbortController.abort();
      }
    }, 10000);
    
    const res = await fetch(url, { signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Xatolik');
    
    renderMovies(data.data || []);
    isFirstLoad = false;
    
  } catch (error) {
    console.error('Yuklash xatosi:', error);
    
    if (error.name === 'AbortError') {
      if (!isFirstLoad) {
        moviesGrid.innerHTML = `
          <div style="text-align:center;color:var(--color-text-secondary);padding:40px;grid-column:1/-1;">
            ⏳ So'rov bekor qilindi
          </div>
        `;
      }
      return;
    }
    
    moviesGrid.innerHTML = `
      <div style="text-align:center;color:var(--color-danger);padding:40px;grid-column:1/-1;">
        ❌ Xatolik: ${error.message}
        <br />
        <button onclick="loadMovies()" class="btn btn-primary" style="margin-top:10px;padding:8px 20px;border:none;border-radius:8px;background:var(--color-accent);color:#fff;cursor:pointer;">
          🔄 Qayta yuklash
        </button>
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
        <button onclick="loadMovies()" class="btn btn-primary" style="margin-top:10px;padding:8px 20px;border:none;border-radius:8px;background:var(--color-accent);color:#fff;cursor:pointer;">
          🔄 Qayta yuklash
        </button>
      </div>
    `;
    return;
  }

  const defaultImg = getDefaultImage();

  moviesGrid.innerHTML = movies.map(m => {
    let imgUrl = fixImageUrl(m.rasm);
    
    return `
      <div class="movie-card" onclick="openMovie('${m._id}')">
        <img 
          src="${imgUrl}" 
          alt="${m.nomi}" 
          class="movie-poster"
          loading="lazy"
          onerror="this.onerror=null; this.src='${defaultImg}'"
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
// SHOW DETAILS (YANGILANGAN)
// =========================================================

function showDetails(m) {
  const defaultImg = getDefaultImage();
  let posterUrl = fixImageUrl(m.rasm);

  let videoHtml = '', qismlarHtml = '';

  // ===== VIDEO =====
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
      videoHtml = `<p style="color:var(--color-text-secondary);padding:20px;">🎬 Video mavjud emas</p>`;
    }
  } else if (m.qismlar?.length) {
    // Birinchi qism video
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
      videoHtml = `<p style="color:var(--color-text-secondary);padding:20px;">📺 Video mavjud emas</p>`;
    }
    
    // ===== QISMLAR =====
    qismlarHtml = `
      <div class="qismlar-list">
        ${m.qismlar.map((q, i) => `
          <button class="qism-btn ${i===0?'active':''}" onclick="playQism(${i})">
            ${q.qismRaqami}-qism
          </button>
        `).join('')}
      </div>
    `;
  }

  modalBody.innerHTML = `
    <div class="modal-movie-detail">
      <div class="modal-poster-container">
        <img 
          src="${posterUrl}" 
          alt="${m.nomi}" 
          class="modal-poster"
          onerror="this.onerror=null; this.src='${defaultImg}'"
        />
      </div>
      <div class="modal-info">
        <!-- VIDEO - YUQORIDA -->
        ${videoHtml}
        
        <!-- QISMLAR - O'RTADA (Komp DA rasm ostida, Telefonda video ostida) -->
        ${qismlarHtml}
        
        <!-- MA'LUMOTLAR - PASTDA -->
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
  
  // Video player ni saqlash
  setTimeout(() => {
    currentVideoPlayer = document.getElementById('player');
  }, 100);
}

// =========================================================
// PLAY QISM (TO'LIQ TUZATILGAN)
// =========================================================

function playQism(index) {
  console.log('🎬 Qism bosildi:', index);
  
  if (!currentMovie) {
    console.error('❌ currentMovie mavjud emas');
    return;
  }
  
  if (!currentMovie.qismlar || currentMovie.qismlar.length === 0) {
    console.error('❌ Qismlar mavjud emas');
    return;
  }
  
  const qism = currentMovie.qismlar[index];
  if (!qism) {
    console.error('❌ Qism topilmadi:', index);
    return;
  }
  
  console.log('📹 Qism ma\'lumoti:', qism);
  
  // Qism tugmalarini yangilash
  document.querySelectorAll('.qism-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });

  // Video URL ni olish
  const videoUrl = fixVideoUrl(qism.video);
  console.log('🔗 Video URL:', videoUrl);
  
  if (!videoUrl) {
    const videoContainer = document.querySelector('.modal-video');
    if (videoContainer) {
      videoContainer.innerHTML = `<p style="color:var(--color-text-secondary);padding:20px;">📺 Video URL mavjud emas</p>`;
    }
    return;
  }
  
  // Video konteynerni topish
  let videoContainer = document.querySelector('.modal-video');
  
  // Agar video konteyner bo'lmasa, yangi yaratish
  if (!videoContainer) {
    const modalInfo = document.querySelector('.modal-info');
    if (modalInfo) {
      const newVideoContainer = document.createElement('div');
      newVideoContainer.className = 'modal-video';
      modalInfo.insertBefore(newVideoContainer, modalInfo.firstChild);
      videoContainer = newVideoContainer;
    }
  }
  
  if (!videoContainer) {
    console.error('❌ Video konteyner topilmadi');
    return;
  }
  
  // Videoni yangilash
  if (isYouTubeUrl(videoUrl)) {
    const embedUrl = getYouTubeEmbedUrl(videoUrl);
    videoContainer.innerHTML = `
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
    videoContainer.innerHTML = `
      <video controls width="100%" id="player" preload="metadata">
        <source src="${videoUrl}" type="video/mp4" />
      </video>
    `;
  }
  
  // Yangi video player ni saqlash
  setTimeout(() => {
    currentVideoPlayer = document.getElementById('player');
    if (currentVideoPlayer) {
      currentVideoPlayer.play().catch(() => {});
    }
  }, 100);
}

// =========================================================
// MODAL YOPISH (VIDEO TO'XTATILADI)
// =========================================================

function closeModal() {
  // Videoni to'xtatish
  stopVideo();
  
  // Modallarni yopish
  movieModal.classList.remove('active');
  ageModal.classList.remove('active');
  
  // Video konteynerni tozalash
  const videoContainer = document.querySelector('.modal-video');
  if (videoContainer) {
    // Videoni butunlay o'chirish (YouTube uchun)
    const iframe = videoContainer.querySelector('iframe');
    if (iframe) {
      iframe.src = '';
    }
    const video = videoContainer.querySelector('video');
    if (video) {
      video.removeAttribute('src');
      video.load();
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
  closeModal();
});

modalClose.addEventListener('click', () => {
  closeModal();
});

movieModal.addEventListener('click', (e) => {
  if (e.target === movieModal) {
    closeModal();
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

// Global funksiyalar
window.loadMovies = loadMovies;
window.openMovie = openMovie;
window.playQism = playQism;
window.closeModal = closeModal;
