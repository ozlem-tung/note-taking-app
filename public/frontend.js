// frontend.js (güncellenmiş tam sürüm)

let token = null;
let currentUser = null;

// Sayfa yüklendiğinde giriş kutuları temizlensin
window.addEventListener('DOMContentLoaded', () => {
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  if (usernameInput) usernameInput.value = '';
  if (passwordInput) passwordInput.value = '';
});

// Giriş işlemi
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (res.ok) {
      token = data.token;
      currentUser = username;
      showUserPanel();
      loadNotes();
    } else {
      showCustomAlert(data.message || 'Giriş başarısız');
    }
  });
}

// Kayıt formunu göster
const showRegisterBtn = document.getElementById('showRegisterBtn');
if (showRegisterBtn) {
  showRegisterBtn.addEventListener('click', () => {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('registerSection').style.display = 'block';
  });
}

// Çıkış işlemi
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    showConfirmDialog('Çıkış yapmak istediğinize emin misiniz?', () => {
      token = null;
      currentUser = null;
      document.getElementById('loginUsername').value = '';
      document.getElementById('loginPassword').value = '';
      document.getElementById('userPanel').style.display = 'none';
      document.getElementById('loginSection').style.display = 'block';
      document.getElementById('registerSection').style.display = 'none';
    });
  });
}

function showUserPanel() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('registerSection').style.display = 'none';
  document.getElementById('userPanel').style.display = 'block';
  document.getElementById(
    'usernameBox'
  ).innerText = `Hoş geldin, ${currentUser}`;
}

// Notları listele
async function loadNotes() {
  const res = await fetch('/notes', {
    headers: { Authorization: `Bearer ${token}` },
  });

  const notes = await res.json();
  const notesContainer = document.getElementById('noteList');
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
}

// Not silme işlemi
async function deleteNote(noteId) {
  const res = await fetch(`/notes/${noteId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) {
    loadNotes();
  } else {
    showCustomAlert('Not silinemedi!');
  }
}


// NOT EKLEME – Not Ekle butonuna tıklandığında çalışır
document.getElementById('addNoteBtn').addEventListener('click', async () => {
  const noteInput = document.getElementById('noteInput');
  const content = noteInput.value.trim();

  if (!content) {
    showCustomAlert('Lütfen boş bir not yazmayın.');
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
      loadNotes(); // Yeni notu listele
    } else {
      showCustomAlert(data.message || 'Not eklenemedi.');
    }
  } catch (err) {
    showCustomAlert('Sunucu hatası: not eklenemedi.');
    console.error(err);
  }
});


// Not güncelleme işlemi
async function editNote(noteId, newContent) {
  const res = await fetch(`/notes/${noteId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content: newContent }),
  });

  if (res.ok) {
    loadNotes();
  } else {
    showCustomAlert('Not güncellenemedi!');
  }
}


// Özel uyarı kutusu göster
function showCustomAlert(message) {
  const overlay = document.getElementById('messageOverlay');
  const messageText = document.getElementById('messageText');
  const confirmYes = document.getElementById('confirmYes');
  const confirmNo = document.getElementById('confirmNo');

  messageText.textContent = message;
  overlay.classList.add('active');
  confirmYes.style.display = 'none';
  confirmNo.textContent = 'Tamam';

  const closeOverlay = () => {
    overlay.classList.remove('active');
    confirmYes.style.display = 'inline-block';
    confirmNo.textContent = '❌ Hayır';
  };

  confirmNo.onclick = closeOverlay;
  document.getElementById('closeModalBtn').onclick = closeOverlay;
}

// Onay kutusu (evet/hayır)
function showConfirmDialog(message, onConfirm) {
  const overlay = document.getElementById('messageOverlay');
  const messageText = document.getElementById('messageText');

  messageText.textContent = message;
  overlay.classList.add('active');

  const yesBtn = document.getElementById('confirmYes');
  const noBtn = document.getElementById('confirmNo');
  const closeBtn = document.getElementById('closeModalBtn');

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
