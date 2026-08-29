// =========================================================
// MOVIEHUB ADMIN PANEL - TO'LIQ
// =========================================================

const API_URL = 'https://movieehubbackend.onrender.com/api';
const BASE_URL = 'https://movieehubbackend.onrender.com';

// DOM elementlari
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
// AUTH FUNKSIYALAR
// =========================================================

function checkAuth() {
  const token = localStorage.getItem('adminToken');
  if (token) {
    // Token mavjud, lekin yaroqliligini tekshirish kerak
    verifyToken();
  } else {
    showLoginForm();
  }
}

async function verifyToken() {
  try {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_URL}/movies`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (res.ok) {
      showAdminPanel();
    } else {
      // Token yaroqsiz
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUsername');
      showLoginForm();
    }
  } catch (error) {
    console.error('Token tekshirish xatosi:', error);
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
// LOGIN
// =========================================================

loginFormElement.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  
  console.log('========================================');
  console.log('📤 LOGIN SO\'ROVI YUBORILMOQDA');
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password ? '*****' : 'Yo\'q'}`);
  console.log(`   API URL: ${API_URL}/admin/login`);
  console.log('========================================');
  
  if (!username || !password) {
    loginError.textContent = 'Iltimos, username va parolni kiriting';
    return;
  }
  
  loginError.textContent = '';
  const btn = loginFormElement.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  btn.textContent = '⏳ Kirilmoqda...';
  btn.disabled = true;
  
  try {
    const res = await fetch(`${API_URL}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    console.log(`📥 Javob status: ${res.status}`);
    
    const data = await res.json();
    console.log('📥 Javob:', data);
    
    if (!res.ok) {
      throw new Error(data.message || `HTTP ${res.status} xatosi`);
    }
    
    if (!data.success) {
      throw new Error(data.message || 'Noto\'g\'ri ma\'lumotlar');
    }
    
    // Tokenni saqlash
    localStorage.setItem('adminToken', data.token);
    localStorage.setItem('adminUsername', data.admin.username);
    
    console.log('✅ LOGIN MUVAFFAQIYATLI!');
    showAdminPanel();
    loginFormElement.reset();
    loginError.textContent = '';
    
  } catch (error) {
    console.error('❌ LOGIN XATOSI:', error);
    loginError.textContent = error.message || 'Noto\'g\'ri ma\'lumotlar';
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
  console.log('👋 Logout qilindi');
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
// FILMLARNI YUKLASH
// =========================================================

async function loadMovies() {
  try {
    const res = await fetch(`${API_URL}/movies`);
    const data = await res.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Filmlarni yuklashda xatolik');
    }
    
    renderMoviesList(data.data);
  } catch (error) {
    console.error('Filmlarni yuklash xatosi:', error);
    moviesList.innerHTML = `
      <div style="color:var(--color-danger);padding:20px;text-align:center;grid-column:1/-1;">
        ❌ ${error.message}
        <br />
        <button onclick="loadMovies()" class="btn btn-primary" style="margin-top:10px;">
          Qayta urinish
        </button>
      </div>
    `;
  }
}

// =========================================================
// FILMLAR RO'YXATINI CHIQARISH
// =========================================================

function renderMoviesList(movies) {
  if (!movies || movies.length === 0) {
    moviesList.innerHTML = `
      <div style="color:var(--color-text-secondary);padding:20px;text-align:center;grid-column:1/-1;">
        📺 Hali hech qanday film qo'shilmagan
      </div>
    `;
    return;
  }

  moviesList.innerHTML = movies.map(movie => {
    // Rasm URL ni to'g'rilash
    let imgUrl = '';
    if (movie.rasm) {
      if (movie.rasm.startsWith('http://') || movie.rasm.startsWith('https://')) {
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
          src="${imgUrl || 'https://via.placeholder.com/200x300/222/00ff88?text=No+Image'}" 
          alt="${movie.nomi}"
          onerror="this.src='https://via.placeholder.com/200x300/222/00ff88?text=No+Image'"
        />
        <h4>${movie.nomi}</h4>
        <p style="color:var(--color-text-secondary);font-size:0.8rem;">
          ${movie.yili} • ${movie.turi === 'film' ? '🎬 Film' : '📺 Serial'}
        </p>
        <div class="movie-actions">
          <button class="edit-btn" onclick="editMovie('${movie._id}')">
            ✏️ Tahrirlash
          </button>
          <button class="delete-btn" onclick="deleteMovie('${movie._id}')">
            🗑️ O'chirish
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// =========================================================
// TURI O'ZGARGANDA
// =========================================================

turiSelect.addEventListener('change', function() {
  if (this.value === 'serial') {
    videoField.style.display = 'none';
    serialFields.style.display = 'block';
    // Video URL majburiy emas
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
  const qismCount = qismlarContainer.children.length + 1;
  const qismDiv = document.createElement('div');
  qismDiv.className = 'qism-item';
  qismDiv.innerHTML = `
    <div class="form-group" style="flex:1;margin:0;">
      <label>Qism raqami</label>
      <input type="number" class="qismRaqami" value="${qismCount}" min="1" />
    </div>
    <div class="form-group" style="flex:2;margin:0;">
      <label>Video URL</label>
      <input type="text" class="qismVideo" placeholder="https://example.com/video.mp4 yoki YouTube embed" />
    </div>
    <button type="button" class="btn btn-danger" onclick="this.parentElement.remove()" style="margin-top:18px;">
      ✕
    </button>
  `;
  qismlarContainer.appendChild(qismDiv);
});

// =========================================================
// FILM SAQLASH (QO'SHISH / YANGILASH)
// =========================================================

movieForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Ma'lumotlarni yig'ish
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

  // Film uchun video
  if (movieData.turi === 'film') {
    movieData.video = $('video').value.trim();
    movieData.qismlar = [];
  } 
  // Serial uchun qismlar
  else {
    movieData.video = '';
    const qismItems = qismlarContainer.querySelectorAll('.qism-item');
    movieData.qismlar = Array.from(qismItems).map((item) => {
      const raqam = item.querySelector('.qismRaqami').value;
      const video = item.querySelector('.qismVideo').value.trim();
      return {
        qismRaqami: parseInt(raqam) || 1,
        video: video
      };
    }).filter(q => q.video); // Faqat video mavjud qismlarni olish
  }

  // Validatsiya
  if (!movieData.nomi) {
    showMessage('Iltimos, film nomini kiriting', 'error');
    return;
  }
  if (!movieData.rasm) {
    showMessage('Iltimos, poster rasmi URL ini kiriting', 'error');
    return;
  }
  if (movieData.turi === 'film' && !movieData.video) {
    showMessage('Iltimos, video URL ini kiriting', 'error');
    return;
  }
  if (movieData.turi === 'serial' && movieData.qismlar.length === 0) {
    showMessage('Iltimos, hech bo\'lmaganda bitta qism qo\'shing', 'error');
    return;
  }

  // Saqlash
  const isEdit = editMovieId !== null;
  const url = isEdit ? `${API_URL}/movies/${editMovieId}` : `${API_URL}/movies`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    showMessage('⏳ Saqlanmoqda...', 'info');
    
    const res = await fetch(url, {
      method: method,
      headers: getAuthHeaders(),
      body: JSON.stringify(movieData)
    });
    
    const data = await res.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Saqlashda xatolik');
    }
    
    showMessage(isEdit ? '✅ Film muvaffaqiyatli yangilandi!' : '✅ Film muvaffaqiyatli qo\'shildi!', 'success');
    
    // Formani tozalash
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
          <input type="text" class="qismVideo" placeholder="https://example.com/video.mp4 yoki YouTube embed" />
        </div>
        <button type="button" class="btn btn-danger" onclick="this.parentElement.remove()" style="margin-top:18px;">
          ✕
        </button>
      </div>
    `;
    
    // Ro'yxatni yangilash
    loadMovies();
    
    // Tahrirlash rejimidan chiqish
    document.querySelector('#adminPanel h2').textContent = '📽️ Yangi Film/Serial Qo\'shish';
    
  } catch (error) {
    console.error('Saqlash xatosi:', error);
    showMessage('❌ ' + error.message, 'error');
  }
});

// =========================================================
// FILMNI TAHRIRLASH
// =========================================================

async function editMovie(movieId) {
  try {
    showMessage('⏳ Ma\'lumotlar yuklanmoqda...', 'info');
    
    const res = await fetch(`${API_URL}/movies/${movieId}`);
    const data = await res.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Film ma\'lumotlarini yuklashda xatolik');
    }
    
    const movie = data.data;
    editMovieId = movieId;
    
    // Formani to'ldirish
    $('nomi').value = movie.nomi || '';
    $('turi').value = movie.turi || 'film';
    $('janr').value = movie.janr || '';
    $('davlati').value = movie.davlati || '';
    $('yili').value = movie.yili || '';
    $('tili').value = movie.tili || '';
    $('yoshChegarasi').value = movie.yoshChegarasi || '0+';
    $('davomiyligi').value = movie.davomiyligi || '';
    $('rasm').value = movie.rasm || '';
    
    // Turiga qarab maydonlarni ko'rsatish
    turiSelect.dispatchEvent(new Event('change'));
    
    if (movie.turi === 'film') {
      $('video').value = movie.video || '';
    } else if (movie.turi === 'serial' && movie.qismlar && movie.qismlar.length > 0) {
      // Qismlarni to'ldirish
      qismlarContainer.innerHTML = '';
      movie.qismlar.forEach((qism, index) => {
        const qismDiv = document.createElement('div');
        qismDiv.className = 'qism-item';
        qismDiv.innerHTML = `
          <div class="form-group" style="flex:1;margin:0;">
            <label>Qism raqami</label>
            <input type="number" class="qismRaqami" value="${qism.qismRaqami || index + 1}" min="1" />
          </div>
          <div class="form-group" style="flex:2;margin:0;">
            <label>Video URL</label>
            <input type="text" class="qismVideo" value="${qism.video || ''}" placeholder="https://example.com/video.mp4" />
          </div>
          <button type="button" class="btn btn-danger" onclick="this.parentElement.remove()" style="margin-top:18px;">
            ✕
          </button>
        `;
        qismlarContainer.appendChild(qismDiv);
      });
    }
    
    // Sahifani skroll qilish
    document.querySelector('#adminPanel h2').scrollIntoView({ behavior: 'smooth' });
    document.querySelector('#adminPanel h2').textContent = '✏️ Filmni Tahrirlash';
    
    showMessage('✏️ Tahrirlash rejimi. O\'zgarishlarni saqlang.', 'info');
    
  } catch (error) {
    console.error('Filmni tahrirlash xatosi:', error);
    showMessage('❌ ' + error.message, 'error');
  }
}

// =========================================================
// FILMNI O'CHIRISH
// =========================================================

async function deleteMovie(movieId) {
  if (!confirm('Bu filmni o\'chirishga ishonchingiz komilmi?')) {
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/movies/${movieId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    const data = await res.json();
    
    if (!data.success) {
      throw new Error(data.message || 'O\'chirishda xatolik');
    }
    
    showMessage('🗑️ Film muvaffaqiyatli o\'chirildi', 'success');
    loadMovies();
    
  } catch (error) {
    console.error('Filmni o\'chirish xatosi:', error);
    showMessage('❌ ' + error.message, 'error');
  }
}

// =========================================================
// XABAR KO'RSATISH
// =========================================================

function showMessage(text, type = 'info') {
  formMessage.textContent = text;
  formMessage.className = 'form-message';
  
  if (type === 'success') {
    formMessage.classList.add('success');
  } else if (type === 'error') {
    formMessage.classList.add('error');
  } else if (type === 'info') {
    formMessage.style.color = 'var(--color-text-secondary)';
    formMessage.style.border = '1px solid var(--color-border)';
    formMessage.style.background = 'var(--color-surface)';
  }
  
  // 5 soniyadan keyin xabar yo'qoladi
  clearTimeout(formMessage._timeout);
  formMessage._timeout = setTimeout(() => {
    formMessage.textContent = '';
    formMessage.className = 'form-message';
    formMessage.style.color = '';
    formMessage.style.border = '';
    formMessage.style.background = '';
  }, 5000);
}

// =========================================================
// SAHIFA YUKLANGANDA
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('📺 Admin panel yuklandi');
  checkAuth();
});

// Console da yordamchi funksiyalar
window.loadMovies = loadMovies;
window.editMovie = editMovie;
window.deleteMovie = deleteMovie;
