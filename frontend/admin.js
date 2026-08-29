// Admin Panel - Optimallashtirilgan
const API_URL = 'https://movieehubbackend.onrender.com/api';

const $ = id => document.getElementById(id);
const loginForm = $('loginForm');
const adminPanel = $('adminPanel');
const logoutBtn = $('logoutBtn');
const loginError = $('loginError');
const moviesList = $('moviesList');
const formMessage = $('formMessage');
const turiSelect = $('turi');
const videoField = $('videoField');
const serialFields = $('serialFields');
const qismlarContainer = $('qismlarContainer');

let editId = null;

// ============ AUTH ============
function checkAuth() {
  const token = localStorage.getItem('adminToken');
  if (token) { showPanel(); } else { showLogin(); }
}

function showLogin() {
  loginForm.style.display = 'block';
  adminPanel.style.display = 'none';
  logoutBtn.style.display = 'none';
}

function showPanel() {
  loginForm.style.display = 'none';
  adminPanel.style.display = 'block';
  logoutBtn.style.display = 'flex';
  loadMovies();
}

// ============ LOGIN ============
document.getElementById('loginFormElement').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('username').value.trim();
  const password = $('password').value.trim();
  if (!username || !password) { loginError.textContent = 'Iltimos, barcha maydonlarni to\'ldiring'; return; }
  loginError.textContent = '';
  
  try {
    const res = await fetch(`${API_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Login xatosi');
    localStorage.setItem('adminToken', data.token);
    showPanel();
  } catch (e) {
    loginError.textContent = e.message;
  }
});

// ============ LOGOUT ============
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('adminToken');
  showLogin();
});

// ============ HEADERS ============
function getHeaders() {
  return { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` };
}

// ============ FILMLARNI YUKLASH ============
async function loadMovies() {
  try {
    const res = await fetch(`${API_URL}/movies`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    renderList(data.data);
  } catch (e) {
    moviesList.innerHTML = `<div style="color:var(--accent-red);padding:20px;">❌ ${e.message}</div>`;
  }
}

function renderList(movies) {
  if (!movies?.length) {
    moviesList.innerHTML = '<div style="color:var(--text-secondary);padding:20px;">Hali film yo\'q</div>';
    return;
  }
  const base = 'https://movieehubbackend.onrender.com';
  moviesList.innerHTML = movies.map(m => `
    <div class="movie-item">
      <img src="${m.rasm.startsWith('http') ? m.rasm : base + m.rasm}" alt="${m.nomi}" onerror="this.src='https://via.placeholder.com/200x200/222/00ff88?text=No+Image'" />
      <h4>${m.nomi}</h4>
      <p style="color:var(--text-secondary);font-size:0.8rem;">${m.yili} • ${m.turi}</p>
      <div class="movie-actions">
        <button class="edit-btn" onclick="editMovie('${m._id}')">✏️</button>
        <button class="delete-btn" onclick="deleteMovie('${m._id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

// ============ TURI ============
turiSelect.addEventListener('change', function() {
  if (this.value === 'serial') {
    videoField.style.display = 'none';
    serialFields.style.display = 'block';
  } else {
    videoField.style.display = 'block';
    serialFields.style.display = 'none';
  }
});

// ============ QISM QO'SHISH ============
$('addQismBtn').addEventListener('click', () => {
  const div = document.createElement('div');
  div.className = 'qism-item';
  div.innerHTML = `<input type="number" class="qismRaqami" value="${qismlarContainer.children.length+1}" placeholder="Raqam" />
                  <input type="text" class="qismVideo" placeholder="Video URL" />
                  <button type="button" class="btn btn-danger" onclick="this.parentElement.remove()">✕</button>`;
  qismlarContainer.appendChild(div);
});

// ============ SAQLASH ============
document.getElementById('movieForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const data = {
    nomi: $('nomi').value.trim(),
    turi: $('turi').value,
    janr: $('janr').value.trim(),
    davlati: $('davlati').value.trim(),
    yili: parseInt($('yili').value),
    tili: $('tili').value.trim(),
    yoshChegarasi: $('yoshChegarasi').value,
    davomiyligi: $('davomiyligi').value.trim(),
    rasm: $('rasm').value.trim()
  };

  if (data.turi === 'film') {
    data.video = $('video').value.trim();
  } else {
    const items = qismlarContainer.querySelectorAll('.qism-item');
    data.qismlar = Array.from(items).map((item, i) => ({
      qismRaqami: parseInt(item.querySelector('.qismRaqami').value) || i+1,
      video: item.querySelector('.qismVideo').value.trim()
    }));
  }

  try {
    const url = editId ? `${API_URL}/movies/${editId}` : `${API_URL}/movies`;
    const method = editId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message);
    
    formMessage.className = 'form-message success';
    formMessage.textContent = editId ? 'Yangilandi! ✅' : 'Qo\'shildi! ✅';
    editId = null;
    document.getElementById('movieForm').reset();
    loadMovies();
    setTimeout(() => { formMessage.className = 'form-message'; formMessage.textContent = ''; }, 3000);
  } catch (e) {
    formMessage.className = 'form-message error';
    formMessage.textContent = '❌ ' + e.message;
  }
});

// ============ TAHRIRLASH ============
async function editMovie(id) {
  try {
    const res = await fetch(`${API_URL}/movies/${id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    const m = data.data;
    editId = id;
    $('nomi').value = m.nomi;
    $('turi').value = m.turi;
    $('janr').value = m.janr;
    $('davlati').value = m.davlati;
    $('yili').value = m.yili;
    $('tili').value = m.tili;
    $('yoshChegarasi').value = m.yoshChegarasi;
    $('davomiyligi').value = m.davomiyligi;
    $('rasm').value = m.rasm;
    
    if (m.turi === 'film') {
      $('video').value = m.video || '';
    } else {
      qismlarContainer.innerHTML = '';
      m.qismlar?.forEach((q, i) => {
        const div = document.createElement('div');
        div.className = 'qism-item';
        div.innerHTML = `<input type="number" class="qismRaqami" value="${q.qismRaqami || i+1}" placeholder="Raqam" />
                        <input type="text" class="qismVideo" value="${q.video}" placeholder="Video URL" />
                        <button type="button" class="btn btn-danger" onclick="this.parentElement.remove()">✕</button>`;
        qismlarContainer.appendChild(div);
      });
    }
    turiSelect.dispatchEvent(new Event('change'));
    formMessage.className = 'form-message';
    formMessage.textContent = '✏️ Tahrirlash rejimi';
    document.querySelector('#adminPanel h2').scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    alert('Xatolik: ' + e.message);
  }
}

// ============ O'CHIRISH ============
async function deleteMovie(id) {
  if (!confirm('O\'chirilsinmi?')) return;
  try {
    const res = await fetch(`${API_URL}/movies/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    loadMovies();
  } catch (e) {
    alert('Xatolik: ' + e.message);
  }
}

// ============ LOAD ============
document.addEventListener('DOMContentLoaded', checkAuth);
