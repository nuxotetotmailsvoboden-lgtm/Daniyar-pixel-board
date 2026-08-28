const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');

const BOARD_SIZE = 1000;
let ads = [];
let selectedArea = null;
let isSelecting = false;
let selectionStart = null;

// 🔥 ДЕМО-ДАННЫЕ (добавили новые блоки с ссылками)
const DEMO_ADS = [
  { id: 1, x: 10, y: 10, width: 50, height: 50, image_url: null, target_url: 'https://www.instagram.com/cocacola_kz', title: 'Coca-Cola' },
  { id: 2, x: 200, y: 150, width: 80, height: 60, image_url: null, target_url: 'https://www.instagram.com/pepsi', title: 'Pepsi' },
  { id: 3, x: 500, y: 400, width: 100, height: 100, image_url: null, target_url: 'https://www.youtube.com', title: 'YouTube' },
  { id: 4, x: 70, y: 80, width: 40, height: 90, image_url: null, target_url: 'https://github.com', title: 'GitHub' },
  // 🔥 НОВЫЕ БЛОКИ (кликабельные)
  { id: 5, x: 350, y: 200, width: 70, height: 70, image_url: null, target_url: 'https://www.instagram.com/nike', title: 'Nike' },
  { id: 6, x: 750, y: 600, width: 120, height: 80, image_url: null, target_url: 'https://www.apple.com', title: 'Apple' },
];

async function fetchBoard() {
  // Если у вас запущен сервер на localhost:3000, раскомментируйте:
  // try {
  //   const res = await fetch('http://localhost:3000/api/board');
  //   ads = await res.json();
  // } catch(e) {
  //   ads = DEMO_ADS;
  // }
  // Пока используем демо
  ads = DEMO_ADS;
  updateProgress();
  drawBoard();
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Сетка
  ctx.strokeStyle = '#222';
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

  // Рисуем рекламные блоки
  ads.forEach(ad => {
    // Заливка
    ctx.fillStyle = '#2a6d3c';
    ctx.fillRect(ad.x, ad.y, ad.width, ad.height);
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = 2;
    ctx.strokeRect(ad.x, ad.y, ad.width, ad.height);
    
    // Название бренда
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ad.title || 'Реклама', ad.x + ad.width/2, ad.y + ad.height/2);
    
    // Подпись размера
    ctx.fillStyle = '#aaa';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${ad.width}×${ad.height}`, ad.x + 4, ad.y + ad.height - 4);
  });

  // Выделение пользователя
  if (selectedArea) {
    const x = Math.min(selectedArea.startX, selectedArea.endX);
    const y = Math.min(selectedArea.startY, selectedArea.endY);
    const w = Math.abs(selectedArea.endX - selectedArea.startX);
    const h = Math.abs(selectedArea.endY - selectedArea.startY);

    // Ограничим, чтобы не выходило за 1000
    const clampedX = Math.max(0, Math.min(x, BOARD_SIZE));
    const clampedY = Math.max(0, Math.min(y, BOARD_SIZE));
    const clampedW = Math.min(w, BOARD_SIZE - clampedX);
    const clampedH = Math.min(h, BOARD_SIZE - clampedY);

    ctx.fillStyle = 'rgba(30, 144, 255, 0.3)';
    ctx.fillRect(clampedX, clampedY, clampedW, clampedH);
    ctx.strokeStyle = '#1e90ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(clampedX, clampedY, clampedW, clampedH);

    // Обновляем панель
    const pixelCount = clampedW * clampedH;
    const price = pixelCount * 10;
    document.getElementById('infoSize').textContent = `Размер: ${Math.round(clampedW)} x ${Math.round(clampedH)}`;
    document.getElementById('infoPrice').textContent = `Цена: ${price.toLocaleString()} ₸`;
    document.getElementById('infoPanel').classList.remove('hidden');
  } else {
    document.getElementById('infoPanel').classList.add('hidden');
  }
}

// --- ОБРАБОТЧИКИ МЫШИ (с исправлением бага 1) ---
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  // Проверяем, не кликнули ли по существующей рекламе
  const clickedAd = ads.find(ad => 
    mouseX >= ad.x && mouseX <= ad.x + ad.width &&
    mouseY >= ad.y && mouseY <= ad.y + ad.height
  );
  if (clickedAd) {
    // 🔥 КЛИКАБЕЛЬНАЯ РЕКЛАМА: открываем ссылку в новой вкладке
    window.open(clickedAd.target_url, '_blank');
    return;
  }

  // Если кликнули по пустому месту – начинаем выделение
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

  // Ограничиваем координаты границами доски (0..BOARD_SIZE)
  endX = Math.max(0, Math.min(endX, BOARD_SIZE));
  endY = Math.max(0, Math.min(endY, BOARD_SIZE));

  selectedArea.endX = endX;
  selectedArea.endY = endY;

  drawBoard();
});

canvas.addEventListener('mouseup', () => {
  isSelecting = false;
  // Если выделение слишком маленькое (меньше 5 пикселей) – отменяем
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

// Если мышь ушла за пределы канваса – сбрасываем выделение (баг 1 фикс)
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
  
  // Округляем и ограничиваем
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

// --- ZOOM (упрощённо) ---
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

// --- ПРОГРЕСС ---
function updateProgress() {
  const totalPixels = 1000000;
  let sold = ads.reduce((sum, ad) => sum + ad.width * ad.height, 0);
  document.getElementById('soldCount').textContent = sold;
  document.getElementById('progressFill').style.width = (sold / totalPixels * 100) + '%';
}

// СТАРТ
fetchBoard();
