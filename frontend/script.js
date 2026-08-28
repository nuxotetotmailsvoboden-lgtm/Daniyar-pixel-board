const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');
const BOARD_SIZE = 1000;

// Состояние
let ads = [];
let selectedArea = null;
let isSelecting = false;
let uploadedImage = null;
let originalImgWidth = 0, originalImgHeight = 0;
let maxAllowedPixels = 0;

// DOM
const infoPanel = document.getElementById('infoPanel');
const infoSize = document.getElementById('infoSize');
const infoPrice = document.getElementById('infoPrice');
const infoPixels = document.getElementById('infoPixels');
const infoCoords = document.getElementById('infoCoords');
const editWidth = document.getElementById('editWidth');
const editHeight = document.getElementById('editHeight');
const sizeWarning = document.getElementById('sizeWarning');

// Демо-реклама (с картинками-эмодзи)
const DEMO_ADS = [
  { id: 1, x: 10, y: 10, width: 80, height: 80, image_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f37a.png', target_url: 'https://www.instagram.com/cocacola_kz', title: 'Coca-Cola' },
  { id: 2, x: 150, y: 150, width: 100, height: 70, image_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f37b.png', target_url: 'https://www.instagram.com/pepsi', title: 'Pepsi' },
  { id: 3, x: 500, y: 400, width: 120, height: 120, image_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3a5.png', target_url: 'https://www.youtube.com', title: 'YouTube' },
  { id: 4, x: 70, y: 250, width: 60, height: 60, image_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4bb.png', target_url: 'https://github.com', title: 'GitHub' },
  { id: 5, x: 350, y: 200, width: 90, height: 90, image_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3c8.png', target_url: 'https://www.instagram.com/nike', title: 'Nike' },
  { id: 6, x: 750, y: 600, width: 130, height: 80, image_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f34e.png', target_url: 'https://www.apple.com', title: 'Apple' },
];

const imageCache = {};

// --- ЗАГРУЗКА ЛОГОТИПА ---
document.getElementById('imageUpload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(ev) {
    const img = new Image();
    img.onload = function() {
      uploadedImage = img;
      originalImgWidth = img.width;
      originalImgHeight = img.height;
      maxAllowedPixels = 3 * (originalImgWidth * originalImgHeight);

      document.getElementById('imgName').textContent = file.name;
      document.getElementById('imgWidth').textContent = originalImgWidth;
      document.getElementById('imgHeight').textContent = originalImgHeight;
      document.getElementById('maxArea').textContent = maxAllowedPixels;
      document.getElementById('imageInfo').classList.remove('hidden');

      // Создаём выделение в центре с пропорциями картинки (не больше 200x200)
      let w = Math.min(originalImgWidth, 200);
      let h = Math.min(originalImgHeight, 200);
      if (w < 20) w = 20;
      if (h < 20) h = 20;
      const ratio = originalImgWidth / originalImgHeight;
      if (w / h > ratio) w = h * ratio;
      else h = w / ratio;
      w = Math.round(w);
      h = Math.round(h);
      const startX = Math.round((BOARD_SIZE - w) / 2);
      const startY = Math.round((BOARD_SIZE - h) / 2);
      selectedArea = { startX, endX: startX + w, startY, endY: startY + h };
      updateInfoPanel();
      drawBoard();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});

// --- ОСНОВНЫЕ ФУНКЦИИ ---
async function fetchBoard() {
  ads = DEMO_ADS;
  await loadAllImages();
  updateProgress();
  drawBoard();
}

function loadAllImages() {
  return new Promise((resolve) => {
    let loaded = 0;
    const total = ads.filter(ad => ad.image_url).length;
    if (total === 0) { resolve(); return; }
    ads.forEach(ad => {
      if (!ad.image_url) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageCache[ad.image_url] = img;
        loaded++;
        if (loaded === total) resolve();
      };
      img.onerror = () => {
        loaded++;
        if (loaded === total) resolve();
      };
      img.src = ad.image_url;
    });
  });
}

function drawBoard() {
  ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

  // Сетка
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

  // Рисуем постоянные рекламные блоки
  ads.forEach(ad => {
    const img = imageCache[ad.image_url];
    drawAdBlock(ctx, ad.x, ad.y, ad.width, ad.height, img, ad.title, ad.target_url);
  });

  // Рисуем выделение пользователя (если есть)
  if (selectedArea) {
    const x = Math.min(selectedArea.startX, selectedArea.endX);
    const y = Math.min(selectedArea.startY, selectedArea.endY);
    const w = Math.abs(selectedArea.endX - selectedArea.startX);
    const h = Math.abs(selectedArea.endY - selectedArea.startY);
    const clampedX = Math.max(0, Math.min(x, BOARD_SIZE));
    const clampedY = Math.max(0, Math.min(y, BOARD_SIZE));
    const clampedW = Math.min(w, BOARD_SIZE - clampedX);
    const clampedH = Math.min(h, BOARD_SIZE - clampedY);

    // Если есть загруженное изображение, показываем его с яркой подсветкой
    if (uploadedImage) {
      ctx.save();
      ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.rect(clampedX, clampedY, clampedW, clampedH);
      ctx.clip();
      const imgRatio = uploadedImage.width / uploadedImage.height;
      const blockRatio = clampedW / clampedH;
      let drawW, drawH, dx, dy;
      if (imgRatio > blockRatio) {
        drawH = clampedH;
        drawW = clampedH * imgRatio;
        dx = clampedX + (clampedW - drawW) / 2;
        dy = clampedY;
      } else {
        drawW = clampedW;
        drawH = clampedW / imgRatio;
        dx = clampedX;
        dy = clampedY + (clampedH - drawH) / 2;
      }
      ctx.drawImage(uploadedImage, dx, dy, drawW, drawH);
      ctx.restore();

      // Рамка с анимацией (пульсирующая)
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#f5c518';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(clampedX, clampedY, clampedW, clampedH);
      ctx.setLineDash([]);

      // Подпись "Ваш логотип"
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(clampedX, clampedY, clampedW, 30);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐ Ваш логотип здесь', clampedX + clampedW/2, clampedY + 15);
    } else {
      // Если нет картинки – просто синяя заливка
      ctx.fillStyle = 'rgba(30, 144, 255, 0.25)';
      ctx.fillRect(clampedX, clampedY, clampedW, clampedH);
      ctx.strokeStyle = '#1e90ff';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(clampedX, clampedY, clampedW, clampedH);
      ctx.setLineDash([]);
    }
  }
}

// Рисование рекламного блока (как демо)
function drawAdBlock(ctx, x, y, w, h, img, title, url) {
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 5;

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

  if (img) {
    ctx.save();
    ctx.clip();
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
    ctx.fillStyle = '#2a6d3c';
    ctx.fillRect(x, y, w, h);
  }

  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#f5c518';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x, y + h - 24, w, 24);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(title || 'Реклама', x + w/2, y + h - 4);

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${w}×${h}`, x + 4, y + h - 26);
}

// --- ОБНОВЛЕНИЕ ПАНЕЛИ ---
function updateInfoPanel() {
  if (!selectedArea) {
    infoPanel.classList.add('hidden');
    return;
  }
  const x = Math.min(selectedArea.startX, selectedArea.endX);
  const y = Math.min(selectedArea.startY, selectedArea.endY);
  const w = Math.abs(selectedArea.endX - selectedArea.startX);
  const h = Math.abs(selectedArea.endY - selectedArea.startY);
  const clampedX = Math.max(0, Math.min(x, BOARD_SIZE));
  const clampedY = Math.max(0, Math.min(y, BOARD_SIZE));
  const clampedW = Math.min(w, BOARD_SIZE - clampedX);
  const clampedH = Math.min(h, BOARD_SIZE - clampedY);

  const pixels = Math.round(clampedW * clampedH);
  const price = pixels * 10;
  infoCoords.textContent = `${Math.round(clampedX)}, ${Math.round(clampedY)}`;
  infoSize.textContent = `${Math.round(clampedW)} × ${Math.round(clampedH)}`;
  infoPixels.textContent = pixels;
  infoPrice.textContent = price.toLocaleString();

  editWidth.value = Math.round(clampedW);
  editHeight.value = Math.round(clampedH);

  if (uploadedImage) {
    const maxArea = maxAllowedPixels;
    if (pixels > maxArea) {
      sizeWarning.style.display = 'inline';
    } else {
      sizeWarning.style.display = 'none';
    }
  } else {
    sizeWarning.style.display = 'none';
  }

  infoPanel.classList.remove('hidden');
}

// --- ОБРАБОТЧИКИ МЫШИ ---
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  // Проверяем клик по существующей рекламе
  const clickedAd = ads.find(ad => 
    mouseX >= ad.x && mouseX <= ad.x + ad.width &&
    mouseY >= ad.y && mouseY <= ad.y + ad.height
  );
  if (clickedAd) {
    window.open(clickedAd.target_url, '_blank');
    return;
  }

  // Начинаем выделение (если нет загруженной картинки, то просто синяя рамка)
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
  updateInfoPanel();
  drawBoard();
});

canvas.addEventListener('mouseup', () => {
  isSelecting = false;
  if (selectedArea) {
    const w = Math.abs(selectedArea.endX - selectedArea.startX);
    const h = Math.abs(selectedArea.endY - selectedArea.startY);
    if (w < 5 || h < 5) {
      selectedArea = null;
      infoPanel.classList.add('hidden');
    }
  }
  drawBoard();
});

canvas.addEventListener('mouseleave', () => {
  if (isSelecting) {
    isSelecting = false;
    selectedArea = null;
    infoPanel.classList.add('hidden');
    drawBoard();
  }
});

// --- РЕДАКТИРОВАНИЕ РАЗМЕРА ---
document.getElementById('applySizeBtn').addEventListener('click', () => {
  if (!selectedArea) return;
  let newW = parseInt(editWidth.value);
  let newH = parseInt(editHeight.value);
  if (isNaN(newW) || newW < 1) newW = 10;
  if (isNaN(newH) || newH < 1) newH = 10;
  
  if (uploadedImage) {
    const area = newW * newH;
    if (area > maxAllowedPixels) {
      sizeWarning.style.display = 'inline';
      return;
    } else {
      sizeWarning.style.display = 'none';
    }
  }

  const x = Math.min(selectedArea.startX, selectedArea.endX);
  const y = Math.min(selectedArea.startY, selectedArea.endY);
  const clampedW = Math.min(newW, BOARD_SIZE - Math.round(x));
  const clampedH = Math.min(newH, BOARD_SIZE - Math.round(y));
  selectedArea.endX = Math.round(x) + clampedW;
  selectedArea.endY = Math.round(y) + clampedH;
  selectedArea.startX = Math.round(x);
  selectedArea.startY = Math.round(y);
  updateInfoPanel();
  drawBoard();
});

// --- КНОПКА "Купить" (теперь размещает рекламу!) ---
document.getElementById('buyBtn').addEventListener('click', () => {
  if (!selectedArea) return;
  const x = Math.min(selectedArea.startX, selectedArea.endX);
  const y = Math.min(selectedArea.startY, selectedArea.endY);
  const w = Math.abs(selectedArea.endX - selectedArea.startX);
  const h = Math.abs(selectedArea.endY - selectedArea.startY);
  const clampedX = Math.round(Math.max(0, Math.min(x, BOARD_SIZE)));
  const clampedY = Math.round(Math.max(0, Math.min(y, BOARD_SIZE)));
  const clampedW = Math.round(Math.min(w, BOARD_SIZE - clampedX));
  const clampedH = Math.round(Math.min(h, BOARD_SIZE - clampedY));
  const pixels = clampedW * clampedH;
  const price = pixels * 10;

  // Если загружено изображение – размещаем его как постоянную рекламу
  if (uploadedImage) {
    // Проверяем пересечение с существующими блоками
    const conflict = ads.some(ad => 
      ad.x < clampedX + clampedW && ad.x + ad.width > clampedX &&
      ad.y < clampedY + clampedH && ad.y + ad.height > clampedY
    );
    if (conflict) {
      alert('❌ Эта область уже занята! Выберите другое место.');
      return;
    }

    // Создаём новый рекламный блок
    const newAd = {
      id: Date.now(),
      x: clampedX,
      y: clampedY,
      width: clampedW,
      height: clampedH,
      image_url: uploadedImage.src, // data URL (позже заменим на серверный URL)
      target_url: 'https://example.com', // пока заглушка
      title: 'Моя реклама'
    };
    ads.push(newAd);
    // Кешируем картинку
    imageCache[newAd.image_url] = uploadedImage;
    // Сбрасываем выделение и состояние
    selectedArea = null;
    uploadedImage = null;
    document.getElementById('imageInfo').classList.add('hidden');
    document.getElementById('imageUpload').value = '';
    infoPanel.classList.add('hidden');
    updateProgress();
    drawBoard();
    alert('✅ Реклама успешно размещена! Кликните на неё, чтобы перейти по ссылке (пока example.com).');
  } else {
    alert(`✅ Вы выбрали ${pixels} пикселей (${clampedW}×${clampedH}) за ${price.toLocaleString()} ₸.\nЗагрузите изображение, чтобы разместить рекламу.`);
  }
});

// --- КНОПКА "Отмена" ---
document.getElementById('cancelBtn').addEventListener('click', () => {
  selectedArea = null;
  infoPanel.classList.add('hidden');
  drawBoard();
});

// --- ZOOM ---
let scale = 1;
document.getElementById('zoomIn').addEventListener('click', () => {
  scale *= 1.1;
  canvas.style.transform = `scale(${scale})`;
});
document.getElementById('zoomOut').addEventListener('click', () => {
  scale /= 1.1;
  if (scale < 0.3) scale = 0.3;
  canvas.style.transform = `scale(${scale})`;
});
document.getElementById('resetView').addEventListener('click', () => {
  scale = 1;
  canvas.style.transform = 'scale(1)';
});

// --- ПРОГРЕСС ---
function updateProgress() {
  const totalPixels = 1000000;
  let sold = ads.reduce((sum, ad) => sum + ad.width * ad.height, 0);
  document.getElementById('soldCount').textContent = sold;
  document.getElementById('progressFill').style.width = (sold / totalPixels * 100) + '%';
}

// СТАРТ
fetchBoard();
