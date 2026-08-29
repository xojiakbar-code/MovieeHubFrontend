// MovieHub - Admin Panel JavaScript

const API_URL = 'http://localhost:5000/api';

// DOM elementlari
const loginForm = document.getElementById('loginForm');
const loginFormElement = document.getElementById('loginFormElement');
const adminPanel = document.getElementById('adminPanel');
const logoutBtn = document.getElementById('logoutBtn');
const loginError = document.getElementById('loginError');
const movieForm = document.getElementById('movieForm');
const formMessage = document.getElementById('formMessage');
const moviesList = document.getElementById('moviesList');
const turiSelect = document.getElementById('turi');
const videoField = document.getElementById('videoField');
const serialFields = document.getElementById('serialFields');
const addQismBtn = document.getElementById('addQismBtn');
const qismlarContainer = document.getElementById('qismlarContainer');

let editMovieId = null;

// ==================== ADMIN HOLATINI TEKSHIRISH ====================
function checkAuth() {
  const token = localStorage.getItem('adminToken');
  if (token) {
    showAdminPanel();
  } else {
    showLoginForm();
  }
}

function showLoginForm() {
  loginForm.style.display = 'block';
  adminPanel.style.display = 'none';
  logoutBtn.style.display = 'none';
}

function showAdminPanel() {
  loginForm.style.display = 'none';
  adminPanel.style.display = 'block';
  logoutBtn.style.display = 'flex';
  loadMovies();
}

// ==================== LOGIN ====================
loginFormElement.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  
  if (!username || !password) {
    loginError.textContent = 'Iltimos, username va parolni kiriting.';
    return;
  }
  
  loginError.textContent = '';
  
  try {
    const response = await fetch(`${API_URL}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      loginError.textContent = data.message || 'Login xatosi.';
      return;
    }
    
    // Tokenni saqlash
    localStorage.setItem('adminToken', data.token);
    localStorage.setItem('adminUsername', data.admin.username);
    
    showAdminPanel();
    loginFormElement.reset();
    
  } catch (error) {
    console.error('Login xatosi:', error);
    loginError.textContent = 'Server bilan bog\'lanishda xatolik.';
  }
});

// ==================== LOGOUT ====================
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUsername');
  showLoginForm();
});

// ==================== API SO'ROVLARI UCHUN HEADER ====================
function getAuthHeaders() {
  const token = localStorage.getItem('adminToken');
  return {
    'Authorization': `Bearer ${token}`
  };
}

// ==================== FILMLARNI YUKLASH (Admin panel) ====================
async function loadMovies() {
  try {
    const response = await fetch(`${API_URL}/movies`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Filmlarni yuklashda xatolik');
    }
    
    renderMoviesList(data.data);
  } catch (error) {
    console.error('Filmlarni yuklash xatosi:', error);
    moviesList.innerHTML = `
      <div style="text-align:center;color:var(--accent-red);padding:20px;grid-column:1/-1;">
        <p>${error.message}</p>
      </div>
    `;
  }
}

// ==================== FILMLAR RO'YXATINI CHIQARISH ====================
function renderMoviesList(movies) {
  if (!movies || movies.length === 0) {
    moviesList.innerHTML = `
      <div style="text-align:center;color:var(--text-secondary);padding:20px;grid-column:1/-1;">
        <p>Hali hech qanday film qo'shilmagan.</p>
      </div>
    `;
    return;
  }
  
  const baseUrl = API_URL.replace('/api', '');
  
  moviesList.innerHTML = movies.map(movie => `
    <div class="movie-item">
      <img 
        src="${movie.rasm.startsWith('http') ? movie.rasm : baseUrl + movie.rasm}" 
        alt="${movie.nomi}"
        onerror="this.src='https://via.placeholder.com/200x200/222222/00ff88?text=No+Image'"
      />
      <h4>${movie.nomi}</h4>
      <p style="color:var(--text-secondary);font-size:0.8rem;">${movie.yili} • ${movie.turi}</p>
      <div class="movie-actions">
        <button class="edit-btn" onclick="editMovie('${movie._id}')">✏️ Tahrirlash</button>
        <button class="delete-btn" onclick="deleteMovie('${movie._id}')">🗑️ O'chirish</button>
      </div>
    </div>
  `).join('');
}

// ==================== FILM QO'SHISH / TAHRIRLASH ====================
// Serial qismlarini boshqarish
turiSelect.addEventListener('change', function() {
  if (this.value === 'serial') {
    videoField.style.display = 'none';
    serialFields.style.display = 'block';
  } else {
    videoField.style.display = 'block';
    serialFields.style.display = 'none';
  }
});

// Qism qo'shish
addQismBtn.addEventListener('click', () => {
  const qismCount = qismlarContainer.children.length + 1;
  const qismDiv = document.createElement('div');
  qismDiv.className = 'qism-item';
  qismDiv.innerHTML = `
    <div class="form-group">
      <label>Qism raqami</label>
      <input type="number" class="qismRaqami" value="${qismCount}" />
    </div>
    <div class="form-group">
      <label>Video fayl</label>
      <input type="file" class="qismVideo" accept="video/*" />
    </div>
    <button type="button" class="btn btn-danger" style="grid-column:1/-1;justify-self:end;" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i> O'chirish
    </button>
  `;
  qismlarContainer.appendChild(qismDiv);
});

// Formani yuborish
movieForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData();
  const movieData = {
    nomi: document.getElementById('nomi').value.trim(),
    turi: document.getElementById('turi').value,
    janr: document.getElementById('janr').value.trim(),
    davlati: document.getElementById('davlati').value.trim(),
    yili: parseInt(document.getElementById('yili').value),
    tili: document.getElementById('tili').value.trim(),
    yoshChegarasi: document.getElementById('yoshChegarasi').value,
    davomiyligi: document.getElementById('davomiyligi').value.trim()
  };
  
  // Rasm
  const rasmFile = document.getElementById('rasm').files[0];
  if (rasmFile) {
    formData.append('rasm', rasmFile);
  }
  
  // Video (film uchun)
  if (movieData.turi === 'film') {
    const videoFile = document.getElementById('video').files[0];
    if (videoFile) {
      formData.append('video', videoFile);
    }
  }
  
  // Serial qismlari
  if (movieData.turi === 'serial') {
    const qismItems = qismlarContainer.querySelectorAll('.qism-item');
    const qismlar = [];
    const videoFiles = [];
    
    qismItems.forEach((item, index) => {
      const raqam = item.querySelector('.qismRaqami').value;
      const video = item.querySelector('.qismVideo').files[0];
      
      qismlar.push({ qismRaqami: parseInt(raqam) || index + 1 });
      if (video) {
        videoFiles.push(video);
      }
    });
    
    formData.append('qismlar', JSON.stringify(qismlar));
    videoFiles.forEach((video, index) => {
      formData.append('qismlarVideo', video);
    });
  }
  
  formData.append('data', JSON.stringify(movieData));
  
  // So'rovni yuborish
  const isEdit = editMovieId !== null;
  const url = isEdit ? `${API_URL}/movies/${editMovieId}` : `${API_URL}/movies`;
  const method = isEdit ? 'PUT' : 'POST';
  
  try {
    const response = await fetch(url, {
      method: method,
      headers: getAuthHeaders(),
      body: formData
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Xatolik yuz berdi');
    }
    
    formMessage.className = 'form-message success';
    formMessage.textContent = isEdit ? 'Film muvaffaqiyatli yangilandi!' : 'Film muvaffaqiyatli qo\'shildi!';
    
    // Formani tozalash
    movieForm.reset();
    editMovieId = null;
    qismlarContainer.innerHTML = `
      <div class="qism-item">
        <div class="form-group">
          <label>Qism raqami</label>
          <input type="number" class="qismRaqami" value="1" />
        </div>
        <div class="form-group">
          <label>Video fayl</label>
          <input type="file" class="qismVideo" accept="video/*" />
        </div>
      </div>
    `;
    
    // Ro'yxatni yangilash
    loadMovies();
    
    setTimeout(() => {
      formMessage.className = 'form-message';
      formMessage.textContent = '';
    }, 5000);
    
  } catch (error) {
    console.error('Film saqlash xatosi:', error);
    formMessage.className = 'form-message error';
    formMessage.textContent = error.message;
  }
});

// ==================== FILMNI TAHRIRLASH ====================
async function editMovie(movieId) {
  try {
    const response = await fetch(`${API_URL}/movies/${movieId}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Film ma\'lumotlarini yuklashda xatolik');
    }
    
    const movie = data.data;
    editMovieId = movieId;
    
    // Formani to'ldirish
    document.getElementById('nomi').value = movie.nomi;
    document.getElementById('turi').value = movie.turi;
    document.getElementById('janr').value = movie.janr;
    document.getElementById('davlati').value = movie.davlati;
    document.getElementById('yili').value = movie.yili;
    document.getElementById('tili').value = movie.tili;
    document.getElementById('yoshChegarasi').value = movie.yoshChegarasi;
    document.getElementById('davomiyligi').value = movie.davomiyligi;
    
    // Turiga qarab maydonlarni ko'rsatish
    turiSelect.dispatchEvent(new Event('change'));
    
    // Serial qismlarini yuklash
    if (movie.turi === 'serial' && movie.qismlar && movie.qismlar.length > 0) {
      qismlarContainer.innerHTML = '';
      movie.qismlar.forEach((qism, index) => {
        const qismDiv = document.createElement('div');
        qismDiv.className = 'qism-item';
        qismDiv.innerHTML = `
          <div class="form-group">
            <label>Qism raqami</label>
            <input type="number" class="qismRaqami" value="${qism.qismRaqami}" />
          </div>
          <div class="form-group">
            <label>Video fayl (hozirgi: ${qism.video.split('/').pop()})</label>
            <input type="file" class="qismVideo" accept="video/*" />
          </div>
          <button type="button" class="btn btn-danger" style="grid-column:1/-1;justify-self:end;" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i> O'chirish
          </button>
        `;
        qismlarContainer.appendChild(qismDiv);
      });
    }
    
    // Sahifani formaga skroll qilish
    document.querySelector('#adminPanel h2').scrollIntoView({ behavior: 'smooth' });
    
    formMessage.className = 'form-message';
    formMessage.textContent = '✏️ Film tahrirlash rejimida. Yangilash uchun saqlang.';
    
  } catch (error) {
    console.error('Filmni tahrirlash xatosi:', error);
    alert('Xatolik: ' + error.message);
  }
}

// ==================== FILMNI O'CHIRISH ====================
async function deleteMovie(movieId) {
  if (!confirm('Bu filmni o\'chirishga ishonchingiz komilmi?')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/movies/${movieId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'O\'chirishda xatolik');
    }
    
    loadMovies();
    
  } catch (error) {
    console.error('Filmni o\'chirish xatosi:', error);
    alert('Xatolik: ' + error.message);
  }
}

// ==================== SAHIFA YUKLANGANDA ====================
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  
  // Agar token mavjud bo'lsa, lekin xato bo'lsa, chiqarib yuborish
  if (localStorage.getItem('adminToken')) {
    // Token tekshiruvi uchun test so'rov
    // (Ixtiyoriy: token yaroqliligini tekshirish)
  }
});
