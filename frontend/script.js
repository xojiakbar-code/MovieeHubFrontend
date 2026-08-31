// =========================================================
// MOVIEHUB FRONTEND - TO'LIQ (LIKE/DISLIKE BILAN)
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
let currentMovieId = null;

// =========================================================
// SVG ICONLAR
// =========================================================

const SVG_ICONS = {
  like: `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
    </svg>
  `,
  dislike: `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3h7.66z"/>
      <path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/>
    </svg>
  `,
  likeFilled: `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
    </svg>
  `,
  dislikeFilled: `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3h7.66z"/>
      <path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/>
    </svg>
  `
};

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
    try {
      currentVideoPlayer.pause();
      currentVideoPlayer.currentTime = 0;
    } catch(e) {}
    currentVideoPlayer = null;
  }
  
  document.querySelectorAll('.modal-video video').forEach(el => {
    try {
      el.pause();
      el.currentTime = 0;
    } catch(e) {}
  });
  
  document.querySelectorAll('.modal-video iframe').forEach(iframe => {
    if (iframe && iframe.src) {
      try {
        const currentSrc = iframe.src;
        if (currentSrc.includes('youtube.com')) {
          iframe.src = 'about:blank';
          setTimeout(() => {
            iframe.src = currentSrc.replace('autoplay=0', 'autoplay=0');
          }, 100);
        }
      } catch(e) {}
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
  currentMovieId = id;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(`${API_URL}/movies/${id}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Film topilmadi');
    
    currentMovie = data.data;
    
    // Like/Dislike holatini olish
    const ratingRes = await fetch(`${API_URL}/movies/${id}/rating`, { signal: controller.signal });
    if (ratingRes.ok) {
      const ratingData = await ratingRes.json();
      if (ratingData.success) {
        currentMovie.userLiked = ratingData.data.userLiked;
        currentMovie.userDisliked = ratingData.data.userDisliked;
        currentMovie.likes = ratingData.data.likes;
        currentMovie.dislikes = ratingData.data.dislikes;
        
        // Qismlar uchun rating
        if (currentMovie.qismlar && ratingData.data.qismlar) {
          ratingData.data.qismlar.forEach((qRating, index) => {
            if (currentMovie.qismlar[index]) {
              currentMovie.qismlar[index].likes = qRating.likes;
              currentMovie.qismlar[index].dislikes = qRating.dislikes;
              currentMovie.qismlar[index].userLiked = qRating.userLiked;
              currentMovie.qismlar[index].userDisliked = qRating.userDisliked;
            }
          });
        }
      }
    }
    
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
// SHOW DETAILS (LIKE/DISLIKE BILAN)
// =========================================================

function showDetails(m) {
  const defaultImg = getDefaultImage();
  let posterUrl = fixImageUrl(m.rasm);

  let videoHtml = '', qismlarHtml = '', ratingHtml = '';

  // ===== RATING (Like/Dislike) =====
  const likeIcon = m.userLiked ? SVG_ICONS.likeFilled : SVG_ICONS.like;
  const dislikeIcon = m.userDisliked ? SVG_ICONS.dislikeFilled : SVG_ICONS.dislike;
  
  ratingHtml = `
    <div class="rating-container">
      <button class="rating-btn like-btn ${m.userLiked ? 'active' : ''}" onclick="handleLike('${m._id}')">
        ${likeIcon}
        <span class="rating-count" id="likeCount-${m._id}">${m.likes || 0}</span>
      </button>
      <button class="rating-btn dislike-btn ${m.userDisliked ? 'active' : ''}" onclick="handleDislike('${m._id}')">
        ${dislikeIcon}
        <span class="rating-count" id="dislikeCount-${m._id}">${m.dislikes || 0}</span>
      </button>
    </div>
  `;

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
    
    // ===== QISMLAR (LIKE/DISLIKE BILAN) =====
    qismlarHtml = `
      <div class="qismlar-container">
        <div class="qismlar-list">
          ${m.qismlar.map((q, i) => {
            const qismLiked = q.userLiked || false;
            const qismDisliked = q.userDisliked || false;
            const likeIconQ = qismLiked ? SVG_ICONS.likeFilled : SVG_ICONS.like;
            const dislikeIconQ = qismDisliked ? SVG_ICONS.dislikeFilled : SVG_ICONS.dislike;
            
            return `
              <div class="qism-item-wrapper">
                <button class="qism-btn ${i===0?'active':''}" onclick="playQism(${i})">
                  ${q.qismRaqami}-qism
                </button>
                <div class="qism-rating">
                  <button class="qism-like-btn ${qismLiked ? 'active' : ''}" onclick="handleQismLike(${i})">
                    ${likeIconQ}
                    <span class="qism-rating-count" id="qismLikeCount-${m._id}-${i}">${q.likes || 0}</span>
                  </button>
                  <button class="qism-dislike-btn ${qismDisliked ? 'active' : ''}" onclick="handleQismDislike(${i})">
                    ${dislikeIconQ}
                    <span class="qism-rating-count" id="qismDislikeCount-${m._id}-${i}">${q.dislikes || 0}</span>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  modalBody.innerHTML = `
    <div class="modal-movie-detail">
      <div class="modal-left">
        <div class="modal-poster-container">
          <img 
            src="${posterUrl}" 
            alt="${m.nomi}" 
            class="modal-poster"
            onerror="this.onerror=null; this.src='${defaultImg}'"
          />
        </div>
        ${qismlarHtml}
      </div>
      
      <div class="modal-right">
        ${videoHtml}
        
        <!-- LIKE/DISLIKE -->
        ${ratingHtml}
        
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
  
  setTimeout(() => {
    currentVideoPlayer = document.getElementById('player');
  }, 100);
}

// =========================================================
// LIKE / DISLIKE - FILM UCHUN
// =========================================================

async function handleLike(movieId) {
  try {
    const res = await fetch(`${API_URL}/movies/${movieId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    
    updateRatingUI(movieId, data.data);
    
    if (currentMovie && currentMovie._id === movieId) {
      currentMovie.likes = data.data.likes;
      currentMovie.dislikes = data.data.dislikes;
      currentMovie.userLiked = data.data.userLiked;
      currentMovie.userDisliked = data.data.userDisliked;
    }
  } catch (error) {
    console.error('Like xatosi:', error);
    alert('❌ Like qo\'shishda xatolik: ' + error.message);
  }
}

async function handleDislike(movieId) {
  try {
    const res = await fetch(`${API_URL}/movies/${movieId}/dislike`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    
    updateRatingUI(movieId, data.data);
    
    if (currentMovie && currentMovie._id === movieId) {
      currentMovie.likes = data.data.likes;
      currentMovie.dislikes = data.data.dislikes;
      currentMovie.userLiked = data.data.userLiked;
      currentMovie.userDisliked = data.data.userDisliked;
    }
  } catch (error) {
    console.error('Dislike xatosi:', error);
    alert('❌ Dislike qo\'shishda xatolik: ' + error.message);
  }
}

function updateRatingUI(movieId, data) {
  const likeCount = document.getElementById(`likeCount-${movieId}`);
  if (likeCount) {
    likeCount.textContent = data.likes || 0;
  }
  
  const dislikeCount = document.getElementById(`dislikeCount-${movieId}`);
  if (dislikeCount) {
    dislikeCount.textContent = data.dislikes || 0;
  }
  
  const likeBtn = document.querySelector(`.like-btn`);
  if (likeBtn) {
    likeBtn.classList.toggle('active', data.userLiked);
    likeBtn.innerHTML = `${data.userLiked ? SVG_ICONS.likeFilled : SVG_ICONS.like} <span class="rating-count">${data.likes || 0}</span>`;
  }
  
  const dislikeBtn = document.querySelector(`.dislike-btn`);
  if (dislikeBtn) {
    dislikeBtn.classList.toggle('active', data.userDisliked);
    dislikeBtn.innerHTML = `${data.userDisliked ? SVG_ICONS.dislikeFilled : SVG_ICONS.dislike} <span class="rating-count">${data.dislikes || 0}</span>`;
  }
}

// =========================================================
// LIKE / DISLIKE - QISM UCHUN
// =========================================================

async function handleQismLike(qismIndex) {
  if (!currentMovie) return;
  const movieId = currentMovie._id;
  
  try {
    const res = await fetch(`${API_URL}/movies/${movieId}/qism/${qismIndex}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    
    updateQismRatingUI(movieId, qismIndex, data.data);
    
    if (currentMovie && currentMovie.qismlar && currentMovie.qismlar[qismIndex]) {
      currentMovie.qismlar[qismIndex].likes = data.data.likes;
      currentMovie.qismlar[qismIndex].dislikes = data.data.dislikes;
      currentMovie.qismlar[qismIndex].userLiked = data.data.userLiked;
      currentMovie.qismlar[qismIndex].userDisliked = data.data.userDisliked;
    }
  } catch (error) {
    console.error('Qism like xatosi:', error);
    alert('❌ Xatolik: ' + error.message);
  }
}

async function handleQismDislike(qismIndex) {
  if (!currentMovie) return;
  const movieId = currentMovie._id;
  
  try {
    const res = await fetch(`${API_URL}/movies/${movieId}/qism/${qismIndex}/dislike`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    
    updateQismRatingUI(movieId, qismIndex, data.data);
    
    if (currentMovie && currentMovie.qismlar && currentMovie.qismlar[qismIndex]) {
      currentMovie.qismlar[qismIndex].likes = data.data.likes;
      currentMovie.qismlar[qismIndex].dislikes = data.data.dislikes;
      currentMovie.qismlar[qismIndex].userLiked = data.data.userLiked;
      currentMovie.qismlar[qismIndex].userDisliked = data.data.userDisliked;
    }
  } catch (error) {
    console.error('Qism dislike xatosi:', error);
    alert('❌ Xatolik: ' + error.message);
  }
}

function updateQismRatingUI(movieId, qismIndex, data) {
  const likeCount = document.getElementById(`qismLikeCount-${movieId}-${qismIndex}`);
  if (likeCount) {
    likeCount.textContent = data.likes || 0;
  }
  
  const dislikeCount = document.getElementById(`qismDislikeCount-${movieId}-${qismIndex}`);
  if (dislikeCount) {
    dislikeCount.textContent = data.dislikes || 0;
  }
  
  const qismWrapper = document.querySelectorAll('.qism-item-wrapper')[qismIndex];
  if (qismWrapper) {
    const likeBtn = qismWrapper.querySelector('.qism-like-btn');
    const dislikeBtn = qismWrapper.querySelector('.qism-dislike-btn');
    
    if (likeBtn) {
      likeBtn.classList.toggle('active', data.userLiked);
      likeBtn.innerHTML = `${data.userLiked ? SVG_ICONS.likeFilled : SVG_ICONS.like} <span class="qism-rating-count">${data.likes || 0}</span>`;
    }
    
    if (dislikeBtn) {
      dislikeBtn.classList.toggle('active', data.userDisliked);
      dislikeBtn.innerHTML = `${data.userDisliked ? SVG_ICONS.dislikeFilled : SVG_ICONS.dislike} <span class="qism-rating-count">${data.dislikes || 0}</span>`;
    }
  }
}

// =========================================================
// PLAY QISM
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
  
  stopVideo();
  
  document.querySelectorAll('.qism-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });

  const videoUrl = fixVideoUrl(qism.video);
  
  if (!videoUrl) {
    const videoContainer = document.querySelector('.modal-right .modal-video');
    if (videoContainer) {
      videoContainer.innerHTML = `<p style="color:var(--color-text-secondary);padding:20px;">📺 Video URL mavjud emas</p>`;
    }
    return;
  }
  
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
  
  if (!videoContainer) {
    console.error('❌ Video konteyner topilmadi');
    return;
  }
  
  videoContainer.innerHTML = '';
  
  if (isYouTubeUrl(videoUrl)) {
    const embedUrl = getYouTubeEmbedUrl(videoUrl);
    videoContainer.innerHTML = `
      <iframe 
        src="${embedUrl}" 
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
  
  setTimeout(() => {
    currentVideoPlayer = document.getElementById('player');
    if (currentVideoPlayer) {
      currentVideoPlayer.play().catch(() => {});
    }
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
    if (iframe) {
      iframe.src = 'about:blank';
    }
    const video = videoContainer.querySelector('video');
    if (video) {
      video.pause();
      video.currentTime = 0;
      video.removeAttribute('src');
      video.load();
    }
  }
  
  movieModal.classList.remove('active');
  ageModal.classList.remove('active');
  document.body.style.overflow = '';
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
window.handleLike = handleLike;
window.handleDislike = handleDislike;
window.handleQismLike = handleQismLike;
window.handleQismDislike = handleQismDislike;
