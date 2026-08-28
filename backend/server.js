const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Разрешаем запросы с фронтенда
app.use(cors());
app.use(express.json());

// Подключаем SQLite базу данных (файл создастся сам)
const db = new sqlite3.Database('./database.sqlite');

// Создаём таблицы с нуля
db.serialize(() => {
  // Таблица пользователей (упрощённо)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  // Таблица занятых областей (реклама)
  db.run(`CREATE TABLE IF NOT EXISTS advertisements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    image_url TEXT,
    target_url TEXT,
    user_id INTEGER,
    status TEXT DEFAULT 'PUBLISHED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Добавим пару демо-реклам, чтобы полотно не было пустым (если таблица пуста)
  db.get(`SELECT COUNT(*) as count FROM advertisements`, (err, row) => {
    if (row.count === 0) {
      const demo = [
        [10, 10, 50, 50, '/images/demo1.jpg', 'https://example.com', 1],
        [200, 150, 80, 60, '/images/demo2.jpg', 'https://google.com', 1],
        [500, 400, 100, 100, '/images/demo3.jpg', 'https://youtube.com', 1],
        [70, 80, 40, 90, '/images/demo4.jpg', 'https://github.com', 1],
      ];
      const stmt = db.prepare(`INSERT INTO advertisements (x, y, width, height, image_url, target_url, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      demo.forEach(item => stmt.run(item));
      stmt.finalize();
      console.log('✅ Добавлены демо-рекламы для красоты');
    }
  });
});

// 🔥 ГЛАВНОЕ API: отдаём список всех активных реклам (все занятые пиксели)
app.get('/api/board', (req, res) => {
  db.all(`SELECT id, x, y, width, height, image_url, target_url FROM advertisements WHERE status = 'PUBLISHED'`, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// API для проверки и резерва области (пока просто проверяем, не занята ли)
app.post('/api/reserve', (req, res) => {
  const { x, y, width, height } = req.body;

  // Проверяем, не пересекается ли с существующими
  const query = `
    SELECT * FROM advertisements 
    WHERE status = 'PUBLISHED' 
    AND x < ? + ? 
    AND x + width > ? 
    AND y < ? + ? 
    AND y + height > ?
  `;
  const params = [x + width, x, y + height, y];

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (rows.length > 0) {
      return res.status(409).json({ message: 'Эта область уже занята!', conflict: rows[0] });
    }

    // Если свободно — резервируем (пока просто говорим "ок")
    res.json({ 
      success: true, 
      message: 'Область свободна! Можете покупать.',
      price: width * height * 10 // 10 ₸ за пиксель
    });
  });
});

// Запускаем сервер
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📊 База данных: database.sqlite`);
});
