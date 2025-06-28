window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const currentUser = localStorage.getItem('username');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const usernameBox = document.getElementById('usernameBox');
  if (usernameBox) {
    usernameBox.textContent = `Hoş geldin, ${currentUser}`;
  }

  const addNoteBtn = document.getElementById('addNoteBtn');
  if (addNoteBtn) {
    addNoteBtn.addEventListener('click', async () => {
      const noteInput = document.getElementById('noteInput');
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
          loadNotes(token);
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
        window.location.href = 'login.html';
      });
    });
  }

  loadNotes(token);
});

async function loadNotes(token) {
  try {
    const res = await fetch('/notes', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const notes = await res.json();
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
          deleteNote(note.id, token);
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
            await editNote(note.id, newContent, token);
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
  } catch (err) {
    showCustomAlert('Notlar yüklenemedi.', false);
  }
}
async function editNote(noteId, newContent, token) {
  const res = await fetch(`/notes/${noteId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content: newContent }),
  });

  if (res.ok) {
    loadNotes(token);
  } else {
    showCustomAlert('Not güncellenemedi!', false);
  }
}

async function deleteNote(noteId, token) {
  const res = await fetch(`/notes/${noteId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) {
    loadNotes(token);
  } else {
    showCustomAlert('Not silinemedi!', false);
  }
}
// Uyarı kutusu
function showCustomAlert(message, isSuccess = true) {
  const overlay = document.getElementById('messageOverlay');
  const messageText = document.getElementById('messageText');
  const confirmYes = document.getElementById('confirmYes');
  const confirmNo = document.getElementById('confirmNo');

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
  document.getElementById('closeModalBtn').onclick = closeOverlay;
}

// Onay kutusu
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
