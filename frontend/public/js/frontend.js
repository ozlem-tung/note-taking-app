// ✅ frontend.js (localStorage ile kalıcı oturum - güncel ve çalışan)
const API_URL = 'http://localhost:3000';

let token = null;
let currentUser = null;

window.addEventListener('DOMContentLoaded', () => {
  // Token'ı localStorage'dan al
  token = localStorage.getItem('token');
  currentUser = localStorage.getItem('username');

  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  if (usernameInput) usernameInput.value = '';
  if (passwordInput) passwordInput.value = '';

  const addNoteBtn = document.getElementById('addNoteBtn');
  if (addNoteBtn) {
    addNoteBtn.addEventListener('click', async () => {
      const noteInput = document.getElementById('noteInput');
      if (!noteInput) return;
      const content = noteInput.value.trim();
      if (!content) {
        showCustomAlert('Lütfen boş bir not yazmayın.', false);
        return;
      }
      try {
        const res = await fetch('/notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        });
        const data = await res.json();
        if (res.ok) {
          noteInput.value = '';
          loadNotes();
        } else {
          showCustomAlert(data.message || 'Not eklenemedi.', false);
        }
      } catch (err) {
        showCustomAlert('Sunucu hatası: not eklenemedi.', false);
      }
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      showConfirmDialog('Çıkış yapmak istediğinize emin misiniz?', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        token = null;
        currentUser = null;
        window.location.href = 'login.html';
      });
    });
  }

  // Eğer not sayfasındaysak notları yükle
  if (document.getElementById('noteList')) {
    if (!token) {
      window.location.href = 'login.html';
    } else {
      loadNotes();
    }
  }
});

function loadNotes() {
  fetch('/notes', {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => res.json())
    .then((notes) => {
      const notesContainer = document.getElementById('noteList');
      if (!notesContainer) return;
      notesContainer.innerHTML = '';
      notes.forEach((note) => {
        const li = document.createElement('li');
        const contentSpan = document.createElement('span');
        contentSpan.textContent = note.content;
        const small = document.createElement('small');
        small.textContent = ` - ${new Date(note.created_at).toLocaleString()}`;
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Sil';
        deleteBtn.addEventListener('click', () => {
          showConfirmDialog('Bu notu silmek istediğinize emin misiniz?', () => {
            deleteNote(note.id);
          });
        });

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Düzenle';
        editBtn.addEventListener('click', () => {
          const textarea = document.createElement('textarea');
          textarea.value = note.content;
          textarea.style.width = '100%';
          textarea.style.height = '80px';
          textarea.style.marginTop = '10px';
          textarea.focus();
          const saveBtn = document.createElement('button');
          saveBtn.textContent = 'Kaydet';
          saveBtn.style.marginLeft = '10px';
          saveBtn.addEventListener('click', async () => {
            const newContent = textarea.value.trim();
            if (newContent && newContent !== note.content) {
              await editNote(note.id, newContent);
            }
          });
          li.innerHTML = '';
          li.appendChild(textarea);
          li.appendChild(saveBtn);
        });
        li.appendChild(contentSpan);
        li.appendChild(small);
        li.appendChild(deleteBtn);
        li.appendChild(editBtn);
        notesContainer.appendChild(li);
      });
    });
}

async function deleteNote(noteId) {
  const res = await fetch(`/notes/${noteId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) loadNotes();
  else showCustomAlert('Not silinemedi!', false);
}

async function editNote(noteId, newContent) {
  const res = await fetch(`/notes/${noteId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content: newContent }),
  });
  if (res.ok) loadNotes();
  else showCustomAlert('Not güncellenemedi!', false);
}

function showConfirmDialog(message, onConfirm) {
  const overlay = document.getElementById('messageOverlay');
  const messageText = document.getElementById('messageText');
  const yesBtn = document.getElementById('confirmYes');
  const noBtn = document.getElementById('confirmNo');
  const closeBtn = document.getElementById('closeModalBtn');
  if (!overlay || !messageText || !yesBtn || !noBtn || !closeBtn) return;
  messageText.textContent = message;
  overlay.classList.add('active');
  const cleanup = () => {
    overlay.classList.remove('active');
    yesBtn.onclick = null;
    noBtn.onclick = null;
    closeBtn.onclick = null;
  };
  yesBtn.onclick = () => {
    cleanup();
    onConfirm();
  };
  noBtn.onclick = closeBtn.onclick = cleanup;
}

function isPasswordValid(password) {
  const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
  return pattern.test(password);
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;

    if (!isPasswordValid(password)) {
      showCustomAlert(
        'Şifre en az 8 karakter olmalı ve en az 1 büyük harf, 1 küçük harf, 1 rakam ve 1 özel karakter içermelidir.',
        false
      );
      return;
    }
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      showCustomAlert('Kayıt başarılı, giriş yapabilirsiniz.', true);
      const registerSection = document.getElementById('registerSection');
      const loginSection = document.getElementById('loginSection');
      if (registerSection) registerSection.style.display = 'none';
      if (loginSection) loginSection.style.display = 'block';
    } else {
      showCustomAlert(data.message || 'Kayıt başarısız', false);
    }
  });
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', username);
      window.location.href = 'notes.html';
    } else {
      showCustomAlert(data.message || 'Giriş başarısız', false);
    }
  });
}

function showCustomAlert(message, isSuccess = true) {


  const overlay = document.getElementById('messageOverlay');
  const messageText = document.getElementById('messageText');
  const confirmYes = document.getElementById('confirmYes');
  const confirmNo = document.getElementById('confirmNo');
  if (!messageText || !overlay || !confirmNo || !confirmYes) return;
  messageText.textContent = message;
  overlay.classList.add('active');
  confirmYes.style.display = 'none';
  confirmNo.textContent = 'Tamam';
  confirmNo.style.backgroundColor = isSuccess ? 'green' : 'crimson';
  confirmNo.style.color = 'white';


  const closeOverlay = () => {
    overlay.classList.remove('active');
    confirmYes.style.display = 'inline-block';
    confirmNo.textContent = '❌ Hayır';
    confirmNo.style.backgroundColor = '';
    confirmNo.style.color = '';
  };

  confirmNo.onclick = closeOverlay;
  const closeBtn = document.getElementById('closeModalBtn');
  if (closeBtn) closeBtn.onclick = closeOverlay;
}


const showRegisterBtn = document.getElementById('showRegisterBtn');
if (showRegisterBtn) {
  showRegisterBtn.addEventListener('click', () => {
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');
    if (loginSection) loginSection.style.display = 'none';
    if (registerSection) registerSection.style.display = 'block';
  });
}

const showLoginBtn = document.getElementById('showLoginBtn');
if (showLoginBtn) {
  showLoginBtn.addEventListener('click', () => {
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');
    if (registerSection) registerSection.style.display = 'none';
    if (loginSection) loginSection.style.display = 'block';
  });
}




