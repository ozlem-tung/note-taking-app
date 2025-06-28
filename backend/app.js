// ✅ DÜZENLENMİŞ VE HATASIZ HAL - app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const sql = require('mssql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('./db');
const verifyToken = require('./verifyToken');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || app.use(cors());


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend/public')));

app.get('/', (req , res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/login.html'));
});

function isPasswordStrong(password) {
  const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
  return pattern.test(password);
}

// ✅ KAYIT OL
app.post('/register', async (req, res) => {
  try {
    let { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'Kullanıcı adı ve şifre gerekli' });
    }

    username = username.trim().toLowerCase();

    if (!isPasswordStrong(password)) {
      return res.status(400).json({
        message:
          'Şifre en az 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam ve 1 özel karakter içermelidir.',
      });
    }

    const pool = await sql.connect(config);

    const existing = await pool
      .request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM Users WHERE username = @username');

    if (existing.recordset.length > 0) {
      return res
        .status(409)
        .json({ message: 'Bu kullanıcı adı zaten kullanılıyor' });
    }

    const hashed = await bcrypt.hash(password, 10);

    await pool
      .request()
      .input('username', sql.NVarChar, username)
      .input('password', sql.NVarChar, hashed)
      .query(
        'INSERT INTO Users (username, password) VALUES (@username, @password)'
      );

    res.status(201).json({ message: 'Kayıt başarılı' });
  } catch (error) {
    console.error('🛑 Kayıt hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});
// ✅ NOT EKLE
app.post('/notes', verifyToken, async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.userId;

    if (!content) {
      return res.status(400).json({ message: 'Not içeriği gerekli' });
    }

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
    console.error('🛑 Not ekleme hatası:', error);
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// ✅ NOTLARI GETİR
app.get('/notes', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input('user_id', sql.Int, userId)
      .query(
        'SELECT * FROM Notes WHERE user_id = @user_id ORDER BY created_at DESC'
      );

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('🛑 Not listeleme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});
// ✅ NOT SİL
app.delete('/notes/:id', verifyToken, async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = req.user.userId;

    const pool = await sql.connect(config);

    const result = await pool
      .request()
      .input('noteId', sql.Int, noteId)
      .input('userId', sql.Int, userId)
      .query('SELECT * FROM Notes WHERE id = @noteId AND user_id = @userId ');

    if (result.recordset.length === 0) {
      return res.status(403).json({ message: 'Bu nota erişiminiz yok' });
    }

    await pool
      .request()
      .input('noteId', sql.Int, noteId)
      .query('DELETE FROM Notes WHERE id = @noteId');

    res.status(200).json({ message: 'Not silindi' });
  } catch (error) {
    console.error('🛑 Not silme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});
// ✅ NOT GÜNCELLE
app.put('/notes/:id', verifyToken, async (req, res) => {
  try {
    const { content } = req.body;
    const noteId = req.params.id;
    const userId = req.user.userId;

    if (!content) return res.status(400).json({ message: 'İçerik boş olamaz' });

    const pool = await sql.connect(config);

    const result = await pool
      .request()
      .input('noteId', sql.Int, noteId)
      .input('userId', sql.Int, userId)
      .query('SELECT * FROM Notes WHERE id = @noteId AND user_id = @userId');

    if (result.recordset.length === 0) {
      return res.status(403).json({ message: 'Yetkisiz güncelleme' });
    }

    await pool
      .request()
      .input('noteId', sql.Int, noteId)
      .input('content', sql.NVarChar, content)
      .query('UPDATE Notes SET content = @content WHERE id = @noteId');

    res.status(200).json({ message: 'Not güncellendi' });
  } catch (error) {
    console.error('🛑 Not güncelleme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});




// ✅ GİRİŞ YAP
app.post('/login', async (req, res) => {
  try {
    let { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'Kullanıcı adı ve şifre gerekli' });
    }

    username = username.trim().toLowerCase();

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
      { expiresIn: process.env.JWT_EXPIRATION || '1h' }
    );

    res.status(200).json({ message: 'Giriş başarılı', token });
  } catch (error) {
    console.error('🛑 Giriş hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});




app.listen(PORT, () => {
  console.log(`🚀 Sunucu çalışıyor: http://localhost:${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Kritik Sunucu Hatası:', err);
});
