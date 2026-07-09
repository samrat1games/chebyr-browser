const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Читаем PNG файл
const pngPath = path.join(__dirname, '..', 'assets', 'icon.png');
const pngData = fs.readFileSync(pngPath);

// Создаём ICO файл с несколькими размерами
function createIco(pngBuffers, sizes) {
  const numImages = pngBuffers.length;

  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // Reserved
  header.writeUInt16LE(1, 2);     // Type: ICO
  header.writeUInt16LE(numImages, 4); // Count

  // Calculate offsets
  let dataOffset = 6 + (numImages * 16); // header + dir entries

  const dirEntries = [];
  const imageData = [];

  for (let i = 0; i < numImages; i++) {
    const size = sizes[i];
    const pngBuf = pngBuffers[i];

    // Directory entry: 16 bytes
    const entry = Buffer.alloc(16);
    entry[0] = size === 256 ? 0 : size; // Width (0 = 256)
    entry[1] = size === 256 ? 0 : size; // Height (0 = 256)
    entry[2] = 0;   // Color palette
    entry[3] = 0;   // Reserved
    entry.writeUInt16LE(1, 4);    // Color planes
    entry.writeUInt16LE(32, 6);   // Bits per pixel
    entry.writeUInt32LE(pngBuf.length, 8);  // Size of image data
    entry.writeUInt32LE(dataOffset, 12);    // Offset

    dirEntries.push(entry);
    imageData.push(pngBuf);
    dataOffset += pngBuf.length;
  }

  return Buffer.concat([header, ...dirEntries, ...imageData]);
}

// Генерируем PNG разных размеров (упрощённо — берём оригинальный)
// Для простоты используем один размер 256x256
const sizes = [16, 32, 48, 64, 128, 256];
const pngBuffers = sizes.map(() => pngData); // Используем тот же PNG

const ico = createIco(pngBuffers, sizes);
const icoPath = path.join(__dirname, '..', 'assets', 'icon.ico');
fs.writeFileSync(icoPath, ico);
console.log(`ICO создан: ${icoPath} (${ico.length} bytes)`);
