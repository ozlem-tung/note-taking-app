// Sunucu başlatıldığında geçici olarak giriş yapılmış kullanıcıyı sıfırla
let currentSessionToken = null;

const express = require('express');
const app = express(); // Express uygulamasını oluşturduk
const sql = require('mssql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('./db');
const verifyToken = require('./verifyToken');

const SECRET_KEY = 'ozlem-tug-not-uygulamasi';

const PORT = 3000;

// Middleware'ler
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statik dosyaları (HTML, CSS, JS) 'public' klasöründen sun
app.use(express.static('public'));

// Ana sayfa
app.get('/', (req, res) => {
  res.send('Merhaba, Not Tutma Uygulamasina Hoşgeldiniz!');
});

// Kayıt
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res
        .status(400)
        .json({ message: 'Kullanıcı adı ve şifre gerekli' });

    const pool = await sql.connect(config);

    // Kullanıcı var mı kontrol et
    const existingUser = await pool
      .request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM Users WHERE username = @username');

    if (existingUser.recordset.length > 0) {
      return res
        .status(409)
        .json({ message: 'Bu kullanıcı adı zaten kullanılıyor' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool
      .request()
      .input('username', sql.NVarChar, username)
      .input('password', sql.NVarChar, hashedPassword)
      .query(
        'INSERT INTO Users (username, password) VALUES (@username, @password)'
      );

    res.status(201).json({ message: 'Kayıt başarılı' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Giriş
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res
        .status(400)
        .json({ message: 'Kullanıcı adı ve şifre gerekli' });

    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM Users WHERE username = @username');

    const user = result.recordset[0];
    if (!user) return res.status(401).json({ message: 'Kullanıcı bulunamadı' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Şifre hatalı' });

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      SECRET_KEY,
      {
        expiresIn: '1h',
      }
    );

    res.status(200).json({ message: 'Giriş başarılı', token });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Not ekleme (şimdilik user_id = 1 sabit)
app.post('/notes', verifyToken, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content)
      return res.status(400).json({ message: 'Not içeriği gerekli' });

    const userId = req.user.userId; // 🔐 Token'dan gelen kullanıcı ID

    const pool = await sql.connect(config);

    await pool
      .request()
      .input('user_id', sql.Int, userId)
      .input('content', sql.NVarChar, content)
      .query(
        'INSERT INTO Notes (user_id, content) VALUES (@user_id, @content)'
      );

    res.status(201).json({ message: 'Not eklendi' });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Not listeleme
app.get('/notes', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId; // JWT'den gelen kullanıcı ID'si
    const pool = await sql.connect(config);

    const result = await pool
      .request()
      .input('user_id', sql.Int, userId)
      .query(
        'SELECT * FROM Notes WHERE user_id = @user_id ORDER BY created_at DESC'
      );

    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

//Not silme
app.delete('/notes/:id', verifyToken, async (req, res) => {
  console.log('🟢 DELETE /notes/:id çalıştı:', req.params.id);
  try {
    const noteId = req.params.id;
    const userId = req.user.userId;

    const pool = await sql.connect(config);

    const check = await pool
      .request()
      .input('noteId', sql.Int, noteId)
      .input('userId', sql.Int, userId)
      .query('SELECT * FROM Notes WHERE id = @noteId AND user_id = @userId');

    if (check.recordset.length === 0) {
      return res.status(403).json({ message: 'Bu nota erişim izniniz yok' });
    }

    await pool
      .request()
      .input('noteId', sql.Int, noteId)
      .query('DELETE FROM Notes WHERE id = @noteId');

    res.status(200).json({ message: 'Not silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

//Not Güncelleme
app.put('/notes/:id', verifyToken, async (req, res) => {
  try {
    const noteId = req.params.id;
    const { content } = req.body;
    const userId = req.user.userId;

    if (!content) {
      return res.status(400).json({ message: 'Not içeriği gerekli' });
    }

    const pool = await sql.connect(config);

    // Notun kullanıcıya ait olup olmadığını kontrol et
    const check = await pool
      .request()
      .input('noteId', sql.Int, noteId)
      .input('userId', sql.Int, userId)
      .query('SELECT * FROM Notes WHERE id = @noteId AND user_id = @userId');

    if (check.recordset.length === 0) {
      return res
        .status(403)
        .json({ message: 'Bu notu güncelleme yetkiniz yok' });
    }

    // Güncelleme işlemi
    await pool
      .request()
      .input('noteId', sql.Int, noteId)
      .input('content', sql.NVarChar, content)
      .query('UPDATE Notes SET content = @content WHERE id = @noteId');

    res.status(200).json({ message: 'Not güncellendi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Sunucu başlat
app.listen(PORT, () => {
  console.log(`🚀 Sunucu çalışıyor: http://localhost:${PORT}`);
});
process.on('uncaughtException', (err) => {
  console.error('💥 Beklenmeyen Hata:', err);
});
