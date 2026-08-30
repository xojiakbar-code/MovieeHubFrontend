// =========================================================
// MOVIEHUB ADMIN PANEL - TO'LIQ
// =========================================================

const API_URL = 'https://movieehubbackend.onrender.com/api';
const BASE_URL = 'https://movieehubbackend.onrender.com';

const $ = id => document.getElementById(id);

const loginForm = $('loginForm');
const loginFormElement = $('loginFormElement');
const adminPanel = $('adminPanel');
const logoutBtn = $('logoutBtn');
const loginError = $('loginError');
const usernameInput = $('username');
const passwordInput = $('password');

const movieForm = $('movieForm');
const formMessage = $('formMessage');
const moviesList = $('moviesList');

const turiSelect = $('turi');
const videoField = $('videoField');
const serialFields = $('serialFields');
const qismlarContainer = $('qismlarContainer');
const addQismBtn = $('addQismBtn');

let editMovieId = null;

// =========================================================
// AUTH
// =========================================================

function checkAuth() {
  const token = localStorage.getItem('adminToken');
  if (token) {
    verifyToken();
  } else {
    showLoginForm();
  }
}

async function verifyToken() {
  try {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_URL}/movies`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(3000)
    });
    
    if (res.ok) {
      showAdminPanel();
    } else {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUsername');
      showLoginForm();
    }
  } catch {
    showLoginForm();
  }
}

function showLoginForm() {
  loginForm.style.display = 'block';
  adminPanel.style.display = 'none';
  logoutBtn.style.display = 'none';
  loginError.textContent = '';
}

function showAdminPanel() {
  loginForm.style.display = 'none';
  adminPanel.style.display = 'block';
  logoutBtn.style.display = 'flex';
  loadMovies();
}

// =========================================================
// LOGIN (TEZKOR)
// =========================================================

loginFormElement.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  
  if (!username || !password) {
    loginError.textContent = 'Username va parolni kiriting';
    return;
  }
  
  loginError.textContent = '';
  const btn = loginFormElement.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  btn.textContent = '⏳ Kirilmoqda...';
  btn.disabled = true;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(`${API_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Noto\'g\'ri ma\'lumotlar');
    }
    
    localStorage.setItem('adminToken', data.token);
    localStorage.setItem('adminUsername', data.admin.username);
    
    showAdminPanel();
    loginFormElement.reset();
    loginError.textContent = '';
    
  } catch (error) {
    if (error.name === 'AbortError') {
      loginError.textContent = '⏳ So\'rov uzoq davom etmoqda. Qayta urinib ko\'ring.';
    } else {
      loginError.textContent = error.message || 'Noto\'g\'ri ma\'lumotlar';
    }
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
});

// =========================================================
// LOGOUT
// =========================================================

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUsername');
  showLoginForm();
});

// =========================================================
// API HEADERS
// =========================================================

function getAuthHeaders() {
  const token = localStorage.getItem('adminToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// =========================================================
// FILMLARNI YUKLASH (TEZKOR)
// =========================================================

async function loadMovies() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(`${API_URL}/movies`, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const data = await res.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Xatolik');
    }
    
    renderMoviesList(data.data || []);
  } catch (error) {
    if (error.name === 'AbortError') {
      moviesList.innerHTML = `
        <div style="color:var(--color-danger);padding:20px;text-align:center;grid-column:1/-1;">
          ⏳ So'rov uzoq davom etmoqda
          <br />
          <button onclick="loadMovies()" class="btn btn-primary" style="margin-top:10px;">Qayta urinish</button>
        </div>
      `;
    } else {
      moviesList.innerHTML = `
        <div style="color:var(--color-danger);padding:20px;text-align:center;grid-column:1/-1;">
          ❌ ${error.message}
          <br />
          <button onclick="loadMovies()" class="btn btn-primary" style="margin-top:10px;">Qayta urinish</button>
        </div>
      `;
    }
  }
}

// =========================================================
// RENDER
// =========================================================

function renderMoviesList(movies) {
  if (!movies || movies.length === 0) {
    moviesList.innerHTML = `
      <div style="color:var(--color-text-secondary);padding:20px;text-align:center;grid-column:1/-1;">
        📺 Hali film qo'shilmagan
      </div>
    `;
    return;
  }

  moviesList.innerHTML = movies.map(movie => {
    let imgUrl = '';
    if (movie.rasm) {
      if (movie.rasm.startsWith('http')) {
        imgUrl = movie.rasm;
      } else if (movie.rasm.startsWith('/uploads/')) {
        imgUrl = BASE_URL + movie.rasm;
      } else {
        imgUrl = BASE_URL + '/uploads/' + movie.rasm;
      }
    }

    return `
      <div class="movie-item" data-id="${movie._id}">
        <img 
          src="${imgUrl || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect fill=%22%23222%22 width=%22200%22 height=%22300%22/%3E%3Ctext x=%22100%22 y=%22150%22 font-family=%22Arial%22 font-size=%2230%22 text-anchor=%22middle%22 fill=%22%23666%22%3E🎬%3C/text%3E%3C/svg%3E'}" 
          alt="${movie.nomi}"
          loading="lazy"
          onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect fill=%22%23222%22 width=%22200%22 height=%22300%22/%3E%3Ctext x=%22100%22 y=%22150%22 font-family=%22Arial%22 font-size=%2230%22 text-anchor=%22middle%22 fill=%22%23666%22%3E🎬%3C/text%3E%3C/svg%3E'"
        />
        <h4>${movie.nomi}</h4>
        <p style="color:var(--color-text-secondary);font-size:0.8rem;">
          ${movie.yili} • ${movie.turi === 'film' ? '🎬 Film' : '📺 Serial'}
        </p>
        <div class="movie-actions">
          <button class="edit-btn" onclick="editMovie('${movie._id}')">✏️</button>
          <button class="delete-btn" onclick="deleteMovie('${movie._id}')">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

// =========================================================
// TURI
// =========================================================

turiSelect.addEventListener('change', function() {
  if (this.value === 'serial') {
    videoField.style.display = 'none';
    serialFields.style.display = 'block';
    $('video').removeAttribute('required');
  } else {
    videoField.style.display = 'block';
    serialFields.style.display = 'none';
    $('video').setAttribute('required', 'required');
  }
});

// =========================================================
// QISM QO'SHISH
// =========================================================

addQismBtn.addEventListener('click', () => {
  const count = qismlarContainer.children.length + 1;
  const div = document.createElement('div');
  div.className = 'qism-item';
  div.innerHTML = `
    <div class="form-group" style="flex:1;margin:0;">
      <label>Qism raqami</label>
      <input type="number" class="qismRaqami" value="${count}" min="1" />
    </div>
    <div class="form-group" style="flex:2;margin:0;">
      <label>Video URL</label>
      <input type="text" class="qismVideo" placeholder="Video URL" />
    </div>
    <button type="button" class="btn btn-danger" onclick="this.parentElement.remove()" style="margin-top:18px;">✕</button>
  `;
  qismlarContainer.appendChild(div);
});

// =========================================================
// SAQLASH
// =========================================================

movieForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const movieData = {
    nomi: $('nomi').value.trim(),
    turi: $('turi').value,
    janr: $('janr').value.trim(),
    davlati: $('davlati').value.trim(),
    yili: parseInt($('yili').value) || 0,
    tili: $('tili').value.trim(),
    yoshChegarasi: $('yoshChegarasi').value,
    davomiyligi: $('davomiyligi').value.trim(),
    rasm: $('rasm').value.trim()
  };

  if (movieData.turi === 'film') {
    movieData.video = $('video').value.trim();
    movieData.qismlar = [];
  } else {
    movieData.video = '';
    const items = qismlarContainer.querySelectorAll('.qism-item');
    movieData.qismlar = Array.from(items).map((item) => ({
      qismRaqami: parseInt(item.querySelector('.qismRaqami').value) || 1,
      video: item.querySelector('.qismVideo').value.trim()
    })).filter(q => q.video);
  }

  if (!movieData.nomi) { showMessage('Film nomini kiriting', 'error'); return; }
  if (!movieData.rasm) { showMessage('Poster URL kiriting', 'error'); return; }
  if (movieData.turi === 'film' && !movieData.video) { showMessage('Video URL kiriting', 'error'); return; }
  if (movieData.turi === 'serial' && movieData.qismlar.length === 0) { showMessage('Hech bo\'lmaganda bitta qism qo\'shing', 'error'); return; }

  const isEdit = editMovieId !== null;
  const url = isEdit ? `${API_URL}/movies/${editMovieId}` : `${API_URL}/movies`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    showMessage('⏳ Saqlanmoqda...', 'info');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(url, {
      method: method,
      headers: getAuthHeaders(),
      body: JSON.stringify(movieData),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const data = await res.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Saqlashda xatolik');
    }
    
    showMessage(isEdit ? '✅ Yangilandi!' : '✅ Qo\'shildi!', 'success');
    
    movieForm.reset();
    editMovieId = null;
    qismlarContainer.innerHTML = `
      <div class="qism-item">
        <div class="form-group" style="flex:1;margin:0;">
          <label>Qism raqami</label>
          <input type="number" class="qismRaqami" value="1" min="1" />
        </div>
        <div class="form-group" style="flex:2;margin:0;">
          <label>Video URL</label>
          <input type="text" class="qismVideo" placeholder="Video URL" />
        </div>
        <button type="button" class="btn btn-danger" onclick="this.parentElement.remove()" style="margin-top:18px;">✕</button>
      </div>
    `;
    
    loadMovies();
    document.querySelector('#adminPanel h2').textContent = '📽️ Yangi Film/Serial Qo\'shish';
    
  } catch (error) {
    if (error.name === 'AbortError') {
      showMessage('⏳ So\'rov uzoq davom etmoqda. Qayta urinib ko\'ring.', 'error');
    } else {
      showMessage('❌ ' + error.message, 'error');
    }
  }
});

// =========================================================
// TAHRIRLASH
// =========================================================

async function editMovie(movieId) {
  try {
    showMessage('⏳ Yuklanmoqda...', 'info');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(`${API_URL}/movies/${movieId}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Xatolik');
    
    const movie = data.data;
    editMovieId = movieId;
    
    $('nomi').value = movie.nomi || '';
    $('turi').value = movie.turi || 'film';
    $('janr').value = movie.janr || '';
    $('davlati').value = movie.davlati || '';
    $('yili').value = movie.yili || '';
    $('tili').value = movie.tili || '';
    $('yoshChegarasi').value = movie.yoshChegarasi || '0+';
    $('davomiyligi').value = movie.davomiyligi || '';
    $('rasm').value = movie.rasm || '';
    
    turiSelect.dispatchEvent(new Event('change'));
    
    if (movie.turi === 'film') {
      $('video').value = movie.video || '';
    } else if (movie.turi === 'serial' && movie.qismlar?.length) {
      qismlarContainer.innerHTML = '';
      movie.qismlar.forEach((qism, index) => {
        const div = document.createElement('div');
        div.className = 'qism-item';
        div.innerHTML = `
          <div class="form-group" style="flex:1;margin:0;">
            <label>Qism raqami</label>
            <input type="number" class="qismRaqami" value="${qism.qismRaqami || index + 1}" min="1" />
          </div>
          <div class="form-group" style="flex:2;margin:0;">
            <label>Video URL</label>
            <input type="text" class="qismVideo" value="${qism.video || ''}" placeholder="Video URL" />
          </div>
          <button type="button" class="btn btn-danger" onclick="this.parentElement.remove()" style="margin-top:18px;">✕</button>
        `;
        qismlarContainer.appendChild(div);
      });
    }
    
    document.querySelector('#adminPanel h2').scrollIntoView({ behavior: 'smooth' });
    document.querySelector('#adminPanel h2').textContent = '✏️ Filmni Tahrirlash';
    showMessage('✏️ Tahrirlash rejimi', 'info');
    
  } catch (error) {
    if (error.name === 'AbortError') {
      showMessage('⏳ So\'rov uzoq davom etmoqda. Qayta urinib ko\'ring.', 'error');
    } else {
      showMessage('❌ ' + error.message, 'error');
    }
  }
}

// =========================================================
// O'CHIRISH
// =========================================================

async function deleteMovie(movieId) {
  if (!confirm('Bu filmni o\'chirishga ishonchingiz komilmi?')) return;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(`${API_URL}/movies/${movieId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const data = await res.json();
    
    if (!data.success) {
      throw new Error(data.message || 'O\'chirishda xatolik');
    }
    
    showMessage('🗑️ Film o\'chirildi', 'success');
    loadMovies();
    
  } catch (error) {
    if (error.name === 'AbortError') {
      showMessage('⏳ So\'rov uzoq davom etmoqda. Qayta urinib ko\'ring.', 'error');
    } else {
      showMessage('❌ ' + error.message, 'error');
    }
  }
}

// =========================================================
// XABAR
// =========================================================

function showMessage(text, type = 'info') {
  formMessage.textContent = text;
  formMessage.className = 'form-message';
  
  if (type === 'success') {
    formMessage.classList.add('success');
  } else if (type === 'error') {
    formMessage.classList.add('error');
  } else if (type === 'info') {
    formMessage.classList.add('info');
  }
  
  clearTimeout(formMessage._timeout);
  formMessage._timeout = setTimeout(() => {
    formMessage.textContent = '';
    formMessage.className = 'form-message';
  }, 4000);
}

// =========================================================
// LOAD
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('📺 Admin panel yuklandi');
  checkAuth();
});

window.loadMovies = loadMovies;
window.editMovie = editMovie;
window.deleteMovie = deleteMovie;
