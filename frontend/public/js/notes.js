const API_URL = '/notes';
const token = localStorage.getItem('token'); // Giriş yaptıktan sonra saklanan JWT

// Eğer token yoksa giriş sayfasına yönlendir
if (!token) {
  window.location.href = '/login.html';
}


// DOM elemanları
const noteList = document.getElementById('noteList');
const noteForm = document.getElementById('noteForm');
const noteContent = document.getElementById('noteContent');

// 🟢 NOTLARI GETİR
async function fetchNotes() {
  try {
    const res = await fetch(API_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const notes = await res.json();

    noteList.innerHTML = '';
    notes.forEach((note) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${note.created_at.slice(0, 10)}:</strong> ${note.content}
        <button onclick="deleteNote(${note.id})">🗑 Sil</button>
        <button onclick="editNote(${note.id}, \`${
        note.content
      }\`)">✏ Güncelle</button>
      `;
      noteList.appendChild(li);
    });
  } catch (err) {
    alert('Notlar alınamadı!');
  }
}

// 🟢 NOT EKLE
noteForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: noteContent.value }),
    });

    const data = await res.json();
    if (res.ok) {
      noteContent.value = '';
      fetchNotes(); // yenile
    } else {
      alert(data.message || 'Not eklenemedi!');
    }
  } catch (err) {
    alert('Sunucu hatası!');
  }
});

// 🟢 NOT SİL
async function deleteNote(id) {
  if (!confirm('Bu not silinsin mi?')) return;

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (res.ok) {
      fetchNotes();
    } else {
      alert(data.message || 'Silme işlemi başarısız.');
    }
  } catch (err) {
    alert('Sunucu hatası!');
  }
}

// 🟢 NOT GÜNCELLE
async function editNote(id, oldContent) {
  const newContent = prompt('Yeni not içeriğini girin:', oldContent);
  if (!newContent || newContent === oldContent) return;

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: newContent }),
    });

    const data = await res.json();
    if (res.ok) {
      fetchNotes();
    } else {
      alert(data.message || 'Güncelleme başarısız!');
    }
  } catch (err) {
    alert('Sunucu hatası!');
  }
}

// Sayfa yüklendiğinde notları getir
fetchNotes();
