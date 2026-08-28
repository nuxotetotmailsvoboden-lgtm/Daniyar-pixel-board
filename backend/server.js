const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Логирование запросов (для отладки)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Подключаем SQLite
const db = new sqlite3.Database('./database.sqlite');

// Создаём таблицы
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS advertisements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    image_data TEXT,
    target_url TEXT,
    title TEXT,
    user_id INTEGER,
    status TEXT DEFAULT 'PUBLISHED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_ad_status ON advertisements(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ad_user ON advertisements(user_id)`);
});

// GET /api/board – список всех реклам
app.get('/api/board', (req, res) => {
  db.all(`SELECT id, x, y, width, height, image_data, target_url, title FROM advertisements WHERE status = 'PUBLISHED'`, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST /api/ads – создание новой рекламы
app.post('/api/ads', (req, res) => {
  const { x, y, width, height, image_data, target_url, title } = req.body;

  // Валидация
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    return res.status(400).json({ error: 'Не все координаты переданы' });
  }
  if (!image_data) {
    return res.status(400).json({ error: 'Изображение обязательно' });
  }
  if (!target_url) {
    return res.status(400).json({ error: 'Ссылка обязательна' });
  }

  // Проверка пересечений
  const conflictQuery = `
    SELECT * FROM advertisements 
    WHERE status = 'PUBLISHED'
    AND x < ? + ? 
    AND x + width > ? 
    AND y < ? + ? 
    AND y + height > ?
  `;
  const params = [x + width, x, y + height, y];

  db.all(conflictQuery, params, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
    if (rows.length > 0) {
      return res.status(409).json({ error: 'Эта область уже занята!', conflict: rows[0] });
    }

    // Вставка
    const insertQuery = `
      INSERT INTO advertisements (x, y, width, height, image_data, target_url, title, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PUBLISHED')
    `;
    const insertParams = [x, y, width, height, image_data, target_url, title || 'Моя реклама'];

    db.run(insertQuery, insertParams, function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        id: this.lastID,
        x, y, width, height,
        image_data,
        target_url,
        title: title || 'Моя реклама',
        status: 'PUBLISHED'
      });
    });
  });
});

// Запуск
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  console.log(`📊 База данных: database.sqlite`);
});
