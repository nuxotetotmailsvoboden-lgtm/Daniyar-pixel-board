const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');

const BOARD_SIZE = 1000;
let ads = [];
let selectedArea = null;
let isSelecting = false;

// Хранилище загруженных изображений для кеша
const imageCache = {};

// 🔥 ДЕМО-ДАННЫЕ С ЛОГОТИПАМИ (используем реальные картинки)
const DEMO_ADS = [
  { 
    id: 1, x: 10, y: 10, width: 80, height: 80, 
    image_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f37a.png', 
    target_url: 'https://www.instagram.com/cocacola_kz', 
    title: 'Coca-Cola' 
  },
  { 
    id: 2, x: 150, y: 150, width: 100, height: 70, 
    image_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f37b.png', 
    target_url: 'https://www.instagram.com/pepsi', 
    title: 'Pepsi' 
  },
  { 
    id: 3, x: 500, y: 400, width: 120, height: 120, 
    image_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3a5.png', 
    target_url: 'https://www.youtube.com', 
    title: 'YouTube' 
  },
  { 
    id: 4, x: 70, y: 250, width: 60, height: 60, 
    image_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4bb.png', 
    target_url: 'https://github.com', 
    title: 'GitHub' 
  },
  { 
    id: 5, x: 350, y: 200, width: 90, height: 90, 
    image_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3c8.png', 
    target_url: 'https://www.instagram.com/nike', 
    title: 'Nike' 
  },
  { 
    id: 6, x: 750, y: 600, width: 130, height: 80, 
    image_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f34e.png', 
    target_url: 'https://www.apple.com', 
    title: 'Apple' 
  },
];

async function fetchBoard() {
  // Пока используем демо-данные (позже подключим API)
  ads = DEMO_ADS;
  await loadAllImages();
  updateProgress();
  drawBoard();
}

// Загружаем все картинки в кеш
function loadAllImages() {
  return new Promise((resolve) => {
    let loaded = 0;
    const total = ads.length;
    if (total === 0) { resolve(); return; }

    ads.forEach(ad => {
      if (!ad.image_url) {
        loaded++;
        if (loaded === total) resolve();
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous'; // чтобы не было CORS проблем
      img.onload = () => {
        imageCache[ad.image_url] = img;
        loaded++;
        if (loaded === total) resolve();
      };
      img.onerror = () => {
        // Если картинка не загрузилась, используем заглушку
        loaded++;
        if (loaded === total) resolve();
      };
      img.src = ad.image_url;
    });
  });
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Рисуем сетку (полупрозрачную)
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= BOARD_SIZE; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, BOARD_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(BOARD_SIZE, i);
    ctx.stroke();
  }

  // 2. Рисуем рекламные блоки с картинками
  ads.forEach(ad => {
    const img = imageCache[ad.image_url];
    const x = ad.x, y = ad.y, w = ad.width, h = ad.height;

    // --- Тень под блоком (для объёма) ---
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;

    // --- Скруглённая рамка ---
    const radius = 8;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    // Заливка фона (если картинка не загружена)
    if (img) {
      // Обрезаем картинку по форме (clip)
      ctx.save();
      ctx.clip();
      // Рисуем изображение с масштабированием cover
      const imgRatio = img.width / img.height;
      const blockRatio = w / h;
      let drawW, drawH, dx, dy;
      if (imgRatio > blockRatio) {
        drawH = h;
        drawW = h * imgRatio;
        dx = x + (w - drawW) / 2;
        dy = y;
      } else {
        drawW = w;
        drawH = w / imgRatio;
        dx = x;
        dy = y + (h - drawH) / 2;
      }
      ctx.drawImage(img, dx, dy, drawW, drawH);
      ctx.restore();
    } else {
      // fallback цвет
      ctx.fillStyle = '#2a6d3c';
      ctx.fillRect(x, y, w, h);
    }

    // --- Обводка (золотая) ---
    ctx.shadowBlur = 0; // сброс тени для рамки
    ctx.strokeStyle = '#f5c518';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // --- Подпись бренда (внизу) ---
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y + h - 24, w, 24);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(ad.title || 'Реклама', x + w/2, y + h - 4);

    // --- Размер (в углу) ---
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${w}×${h}`, x + 4, y + h - 26);
  });

  // 3. Выделение пользователя
  if (selectedArea) {
    const x = Math.min(selectedArea.startX, selectedArea.endX);
    const y = Math.min(selectedArea.startY, selectedArea.endY);
    const w = Math.abs(selectedArea.endX - selectedArea.startX);
    const h = Math.abs(selectedArea.endY - selectedArea.startY);

    const clampedX = Math.max(0, Math.min(x, BOARD_SIZE));
    const clampedY = Math.max(0, Math.min(y, BOARD_SIZE));
    const clampedW = Math.min(w, BOARD_SIZE - clampedX);
    const clampedH = Math.min(h, BOARD_SIZE - clampedY);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(30, 144, 255, 0.25)';
    ctx.fillRect(clampedX, clampedY, clampedW, clampedH);
    ctx.strokeStyle = '#1e90ff';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(clampedX, clampedY, clampedW, clampedH);
    ctx.setLineDash([]);

    // Обновляем панель
    const pixelCount = clampedW * clampedH;
    const price = pixelCount * 10;
    document.getElementById('infoSize').textContent = `Размер: ${Math.round(clampedW)} × ${Math.round(clampedH)}`;
    document.getElementById('infoPrice').textContent = `Цена: ${price.toLocaleString()} ₸`;
    document.getElementById('infoPanel').classList.remove('hidden');
  } else {
    document.getElementById('infoPanel').classList.add('hidden');
  }
}

// --- ОБРАБОТЧИКИ МЫШИ ---
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  const clickedAd = ads.find(ad => 
    mouseX >= ad.x && mouseX <= ad.x + ad.width &&
    mouseY >= ad.y && mouseY <= ad.y + ad.height
  );
  if (clickedAd) {
    window.open(clickedAd.target_url, '_blank');
    return;
  }

  selectedArea = { startX: mouseX, endX: mouseX, startY: mouseY, endY: mouseY };
  isSelecting = true;
});

canvas.addEventListener('mousemove', (e) => {
  if (!isSelecting || !selectedArea) return;
  
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  let endX = (e.clientX - rect.left) * scaleX;
  let endY = (e.clientY - rect.top) * scaleY;

  endX = Math.max(0, Math.min(endX, BOARD_SIZE));
  endY = Math.max(0, Math.min(endY, BOARD_SIZE));

  selectedArea.endX = endX;
  selectedArea.endY = endY;

  drawBoard();
});

canvas.addEventListener('mouseup', () => {
  isSelecting = false;
  if (selectedArea) {
    const w = Math.abs(selectedArea.endX - selectedArea.startX);
    const h = Math.abs(selectedArea.endY - selectedArea.startY);
    if (w < 5 || h < 5) {
      selectedArea = null;
      document.getElementById('infoPanel').classList.add('hidden');
    }
  }
  drawBoard();
});

canvas.addEventListener('mouseleave', () => {
  if (isSelecting) {
    isSelecting = false;
    selectedArea = null;
    document.getElementById('infoPanel').classList.add('hidden');
    drawBoard();
  }
});

// --- КНОПКИ ---
document.getElementById('cancelBtn').addEventListener('click', () => {
  selectedArea = null;
  document.getElementById('infoPanel').classList.add('hidden');
  drawBoard();
});

document.getElementById('buyBtn').addEventListener('click', async () => {
  if (!selectedArea) return;
  
  const x = Math.min(selectedArea.startX, selectedArea.endX);
  const y = Math.min(selectedArea.startY, selectedArea.endY);
  const w = Math.abs(selectedArea.endX - selectedArea.startX);
  const h = Math.abs(selectedArea.endY - selectedArea.startY);
  
  const finalX = Math.round(Math.max(0, Math.min(x, BOARD_SIZE - w)));
  const finalY = Math.round(Math.max(0, Math.min(y, BOARD_SIZE - h)));
  const finalW = Math.round(Math.min(w, BOARD_SIZE - finalX));
  const finalH = Math.round(Math.min(h, BOARD_SIZE - finalY));

  const pixelCount = finalW * finalH;
  const price = pixelCount * 10;
  
  alert(`✅ Вы выбрали ${pixelCount} пикселей (${finalW}×${finalH}) за ${price.toLocaleString()} ₸.\nПереходим к оплате...`);
  
  selectedArea = null;
  document.getElementById('infoPanel').classList.add('hidden');
  drawBoard();
});

// --- ZOOM ---
document.getElementById('zoomIn').addEventListener('click', () => {
  canvas.style.transform = `scale(${1 + (scale || 1) * 0.1})`;
  scale = (scale || 1) * 1.1;
});
document.getElementById('zoomOut').addEventListener('click', () => {
  scale = (scale || 1) / 1.1;
  if (scale < 0.3) scale = 0.3;
  canvas.style.transform = `scale(${scale})`;
});
document.getElementById('resetView').addEventListener('click', () => {
  canvas.style.transform = 'scale(1)';
  scale = 1;
});
let scale = 1;

function updateProgress() {
  const totalPixels = 1000000;
  let sold = ads.reduce((sum, ad) => sum + ad.width * ad.height, 0);
  document.getElementById('soldCount').textContent = sold;
  document.getElementById('progressFill').style.width = (sold / totalPixels * 100) + '%';
}

// СТАРТ
fetchBoard();
