//gerekli kütüphaneler
const express = require('express');
const bcrypt = require('bcrypt');
const sql = require('mssql');
const config = require('./db'); // sadece config import

const app = express();
const PORT = 3000;

app.use(express.json());

// Ana sayfa (Sunucu test endpointi)
app.get('/', (req, res) => {
  res.send('Merhaba, Not Tutma Uygulamasina Hoşgeldiniz!');
});

// Kullanıcı kayıt endpoint'i
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: 'Kullanıcı adı ve şifre gerekli' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Bağlantı aç
    const pool = await sql.connect(config);

    await pool
      .request()
      .input('username', sql.NVarChar, username)
      .input('password', sql.NVarChar, hashedPassword)
      .query(
        'INSERT INTO Users (username, password) VALUES (@username, @password)'
      );

    res.status(201).json({ message: 'Kayıt başarılı (database)' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Sunucu çalişiyor: http://localhost:${PORT}`);
});
