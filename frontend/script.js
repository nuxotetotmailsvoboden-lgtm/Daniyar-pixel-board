const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');

const BOARD_SIZE = 1000;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let selectedArea = null; // { startX, startY, endX, endY }
let isDragging = false;
let dragStartX, dragStartY;

// Загружаем данные с сервера (если сервер не запущен, используем демо-данные)
let ads = [];
let isSelecting = false;
let selectionStart = null;

// Функция для получения данных с сервера
async function fetchBoard() {
  try {
    // Если сервер на VPS запущен, используем его. Пока оставим заглушку.
    // const res = await fetch('http://YOUR_VPS_IP:3000/api/board');
    // ads = await res.json();
    
    // 🔥 ДЕМО-ДАННЫЕ (чтобы сразу видеть занятые области)
    ads = [
      { id: 1, x: 10, y: 10, width: 50, height: 50, image_url: null },
      { id: 2, x: 200, y: 150, width: 80, height: 60, image_url: null },
      { id: 3, x: 500, y: 400, width: 100, height: 100, image_url: null },
      { id: 4, x: 70, y: 80, width: 40, height: 90, image_url: null },
    ];
    updateProgress();
    drawBoard();
  } catch (e) {
    console.log('Сервер не доступен, показываем демо-данные');
    drawBoard();
  }
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Рисуем фоновую сетку (серые линии)
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

  // 2. Рисуем занятые области
  ads.forEach(ad => {
    ctx.fillStyle = '#2a6d3c'; // зелёный для занятых
    ctx.fillRect(ad.x, ad.y, ad.width, ad.height);
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = 2;
    ctx.strokeRect(ad.x, ad.y, ad.width, ad.height);
    
    // Подпись размера
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${ad.width}×${ad.height}`, ad.x + 5, ad.y + 20);
  });

  // 3. Если пользователь выделяет область — рисуем прозрачный синий прямоугольник
  if (selectedArea) {
    const x = Math.min(selectedArea.startX, selectedArea.endX);
    const y = Math.min(selectedArea.startY, selectedArea.endY);
    const w = Math.abs(selectedArea.endX - selectedArea.startX);
    const h = Math.abs(selectedArea.endY - selectedArea.startY);
    
    ctx.fillStyle = 'rgba(30, 144, 255, 0.3)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#1e90ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Показываем информацию в панели
    const pixelCount = w * h;
    const price = pixelCount * 10;
    document.getElementById('infoSize').textContent = `Размер: ${w} x ${h}`;
    document.getElementById('infoPrice').textContent = `Цена: ${price.toLocaleString()} ₸`;
    document.getElementById('infoPanel').classList.remove('hidden');
  }
}

// Обработка мыши для выбора области
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  // Проверяем, не кликнули ли мы по занятой области
  const clickedAd = ads.find(ad => 
    mouseX >= ad.x && mouseX <= ad.x + ad.width &&
    mouseY >= ad.y && mouseY <= ad.y + ad.height
  );
  
  if (clickedAd) {
    alert(`Это место занято! ID: ${clickedAd.id}`);
    return;
  }

  // Начинаем выделение
  selectedArea = { startX: mouseX, endX: mouseX, startY: mouseY, endY: mouseY };
  isSelecting = true;
});

canvas.addEventListener('mousemove', (e) => {
  if (!isSelecting || !selectedArea) return;
  
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  selectedArea.endX = (e.clientX - rect.left) * scaleX;
  selectedArea.endY = (e.clientY - rect.top) * scaleY;
  
  drawBoard();
});

canvas.addEventListener('mouseup', () => {
  isSelecting = false;
  drawBoard();
});

// Отмена выбора
document.getElementById('cancelBtn').addEventListener('click', () => {
  selectedArea = null;
  document.getElementById('infoPanel').classList.add('hidden');
  drawBoard();
});

// Покупка (заглушка)
document.getElementById('buyBtn').addEventListener('click', async () => {
  if (!selectedArea) return;
  
  const x = Math.min(selectedArea.startX, selectedArea.endX);
  const y = Math.min(selectedArea.startY, selectedArea.endY);
  const w = Math.abs(selectedArea.endX - selectedArea.startX);
  const h = Math.abs(selectedArea.endY - selectedArea.startY);
  
  const pixelCount = w * h;
  const price = pixelCount * 10;
  
  // Проверяем на сервере (пока заглушка)
  alert(`✅ Вы выбрали ${pixelCount} пикселей за ${price.toLocaleString()} ₸. Переходим к оплате!`);
  
  // Сброс выделения после покупки
  selectedArea = null;
  document.getElementById('infoPanel').classList.add('hidden');
  drawBoard();
});

function updateProgress() {
  const totalPixels = 1000000;
  let sold = ads.reduce((sum, ad) => sum + ad.width * ad.height, 0);
  document.getElementById('soldCount').textContent = sold;
  document.getElementById('progressFill').style.width = (sold / totalPixels * 100) + '%';
}

// Zoom (для красоты)
document.getElementById('zoomIn').addEventListener('click', () => {
  // Масштабирование через CSS transform (позже сделаем полноценное)
  canvas.style.transform = `scale(${scale + 0.1})`;
  scale += 0.1;
});
document.getElementById('zoomOut').addEventListener('click', () => {
  if (scale > 0.3) {
    canvas.style.transform = `scale(${scale - 0.1})`;
    scale -= 0.1;
  }
});
document.getElementById('resetView').addEventListener('click', () => {
  canvas.style.transform = 'scale(1)';
  scale = 1;
});

// Запускаем
fetchBoard();
