// frontend.js (TAMAMEN GÜNCELLENMİŞ)

let token = null;
let currentUser = null;

// Sayfa yüklendiğinde giriş kutuları sıfırlanır
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
});

// Giriş işlemi
document.getElementById('loginForm').addEventListener('submit', async (e) => {
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

// Kayıt formu göster
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

// Mesaj kutusu gösterimi
function showCustomAlert(message) {
  const overlay = document.getElementById('messageOverlay');
  const messageBox = document.getElementById('messageBox');
  const messageText = document.getElementById('messageText');

  overlay.classList.remove('hidden');
  messageText.innerText = message;

  document.querySelector('.btn-group').innerHTML = `
    <button class="yes-btn" id="confirmOk">Tamam</button>
  `;

  document.getElementById('confirmOk').onclick = () => {
    overlay.classList.add('hidden');
  };
  document.getElementById('closeModalBtn').onclick = () => {
    overlay.classList.add('hidden');
  };
}

function showConfirmDialog(message, onConfirm) {
  const overlay = document.getElementById('messageOverlay');
  const messageText = document.getElementById('messageText');
  messageText.innerText = message;

  overlay.classList.add('show');

  const yesBtn = document.getElementById('confirmYes');
  const noBtn = document.getElementById('confirmNo');
  const closeBtn = document.getElementById('closeModalBtn');

  function closeDialog() {
    overlay.classList.remove('show');
    yesBtn.removeEventListener('click', confirm);
    noBtn.removeEventListener('click', closeDialog);
    closeBtn.removeEventListener('click', closeDialog);
  }

  function confirm() {
    closeDialog();
    onConfirm();
  }

  yesBtn.addEventListener('click', confirm);
  noBtn.addEventListener('click', closeDialog);
  closeBtn.addEventListener('click', closeDialog);
}

// Notları yükle ve listele
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
      showConfirmDialog('Bu notu silmek istediğinize emin misiniz?', () =>
        deleteNote(note.id)
      );
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

// Not silme
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

// Not güncelleme
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
