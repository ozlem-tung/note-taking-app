const jwt = require('jsonwebtoken');

const SECRET_KEY = 'ozlem-tug-not-uygulamasi'; // app.js'tekiyle aynı olmalı

function verifyToken(req, res, next) {
  
const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Token gerekli' });
  }

  const token = authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Token bulunamadı' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded; // userId ve username geliyor
    next(); // işlem başarılı, sıradaki middleware'e geç
  } catch (error) {
    return res.status(403).json({ message: 'Geçersiz token' });
  }
}

module.exports = verifyToken;
