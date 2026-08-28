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
let currentScale = 1; // для отрисовки

// DOM
const infoPanel = document.getElementById('infoPanel');
const infoSize = document.getElementById('infoSize');
const infoPrice = document.getElementById('infoPrice');
const infoPixels = document.getElementById('infoPixels');
const infoCoords = document.getElementById('infoCoords');
const editWidth = document.getElementById('editWidth');
const editHeight = document.getElementById('editHeight');
const sizeWarning = document.getElementById('sizeWarning');
const adUrlInput = document.getElementById('adUrl');

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
  try {
    const res = await fetch('http://localhost:3000/api/board');
    if (!res.ok) throw new Error('Сервер не отвечает');
    const data = await res.json();
    ads = data.map(ad => ({
      ...ad,
      image_url: ad.image_data,
      target_url: ad.target_url,
      title: ad.title || 'Реклама'
    }));
  } catch (e) {
    console.warn('Не удалось загрузить данные с сервера, используем пустой холст:', e);
    ads = [];
  }
  updateProgress();
  drawBoard();
}

function drawBoard() {
  ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

  // --- ДИНАМИЧЕСКАЯ СЕТКА (в зависимости от scale) ---
  let gridStep;
  if (currentScale < 2) gridStep = 50;
  else if (currentScale < 4) gridStep = 10;
  else if (currentScale < 8) gridStep = 5;
  else gridStep = 1;

  // Рисуем сетку (светло-серые линии)
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= BOARD_SIZE; i += gridStep) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, BOARD_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(BOARD_SIZE, i);
    ctx.stroke();
  }

  // Если шаг сетки = 1, рисуем дополнительно очень тонкие линии между пикселями (эффект пикселизации)
  if (gridStep === 1) {
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.2;
    // можно не рисовать, т.к. шаг 1 уже даёт линии через каждый пиксель
  }

  // --- Рисуем рекламные блоки ---
  ads.forEach(ad => {
    let img = null;
    if (ad.image_url && !ad._img) {
      const imgObj = new Image();
      imgObj.src = ad.image_url;
      ad._img = imgObj;
      img = imgObj;
    } else if (ad._img) {
      img = ad._img;
    }
    drawAdBlock(ctx, ad.x, ad.y, ad.width, ad.height, img, ad.title, ad.target_url);
  });

  // --- Выделение пользователя ---
  if (selectedArea) {
    const x = Math.min(selectedArea.startX, selectedArea.endX);
    const y = Math.min(selectedArea.startY, selectedArea.endY);
    const w = Math.abs(selectedArea.endX - selectedArea.startX);
    const h = Math.abs(selectedArea.endY - selectedArea.startY);
    const clampedX = Math.max(0, Math.min(x, BOARD_SIZE));
    const clampedY = Math.max(0, Math.min(y, BOARD_SIZE));
    const clampedW = Math.min(w, BOARD_SIZE - clampedX);
    const clampedH = Math.min(h, BOARD_SIZE - clampedY);

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
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#f5c518';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(clampedX, clampedY, clampedW, clampedH);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(clampedX, clampedY, clampedW, 30);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐ Ваш логотип здесь', clampedX + clampedW/2, clampedY + 15);
    } else {
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

  if (img && img.complete && img.naturalWidth > 0) {
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

// --- ПАНЕЛЬ ---
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

// --- МЫШЬ ---
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

// --- РЕДАКТИРОВАНИЕ ---
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

// --- КУПИТЬ ---
document.getElementById('buyBtn').addEventListener('click', async () => {
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

  if (!uploadedImage) {
    alert('Сначала загрузите изображение!');
    return;
  }

  const targetUrl = adUrlInput.value.trim();
  if (!targetUrl) {
    alert('Введите ссылку (URL) для рекламы!');
    return;
  }

  const imageData = uploadedImage.src;

  try {
    const response = await fetch('http://localhost:3000/api/ads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x: clampedX,
        y: clampedY,
        width: clampedW,
        height: clampedH,
        image_data: imageData,
        target_url: targetUrl,
        title: 'Моя реклама'
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      if (response.status === 409) {
        alert(`❌ Область занята! ${errData.error || ''}`);
        return;
      } else {
        throw new Error(errData.error || 'Ошибка сервера');
      }
    }

    const newAd = await response.json();
    const adToShow = {
      ...newAd,
      image_url: newAd.image_data,
      _img: uploadedImage
    };
    ads.push(adToShow);
    selectedArea = null;
    uploadedImage = null;
    document.getElementById('imageInfo').classList.add('hidden');
    document.getElementById('imageUpload').value = '';
    adUrlInput.value = '';
    infoPanel.classList.add('hidden');
    updateProgress();
    drawBoard();
    alert('✅ Реклама успешно сохранена на сервере!');
  } catch (e) {
    alert('❌ Ошибка при сохранении: ' + e.message);
    console.error(e);
  }
});

// --- ОТМЕНА ---
document.getElementById('cancelBtn').addEventListener('click', () => {
  selectedArea = null;
  infoPanel.classList.add('hidden');
  drawBoard();
});

// --- ZOOM (обновляем currentScale и перерисовываем) ---
let scale = 1;
document.getElementById('zoomIn').addEventListener('click', () => {
  scale *= 1.1;
  if (scale > 16) scale = 16; // ограничим, чтобы не слишком мелко
  canvas.style.transform = `scale(${scale})`;
  currentScale = scale;
  drawBoard(); // перерисовать с новым шагом сетки
});
document.getElementById('zoomOut').addEventListener('click', () => {
  scale /= 1.1;
  if (scale < 0.3) scale = 0.3;
  canvas.style.transform = `scale(${scale})`;
  currentScale = scale;
  drawBoard();
});
document.getElementById('resetView').addEventListener('click', () => {
  scale = 1;
  canvas.style.transform = 'scale(1)';
  currentScale = 1;
  drawBoard();
});

// --- ПРОГРЕСС ---
function updateProgress() {
  const totalPixels = 1000000;
  let sold = ads.reduce((sum, ad) => sum + ad.width * ad.height, 0);
  document.getElementById('soldCount').textContent = sold;
  document.getElementById('progressFill').style.width = (sold / totalPixels * 100) + '%';
}

// --- ЗАПУСК ---
fetchBoard();
