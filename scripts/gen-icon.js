// Генерация простой иконки PNG без зависимостей
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(width, height, r, g, b) {
  // Создаём пиксели (RGBA)
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // Круглая форма
      const cx = width / 2, cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist < width / 2 - 2) {
        // Внутри круга
        if (dist < width / 2 - 12) {
          // Внутренний круг — красный
          pixels[i] = 233; pixels[i+1] = 69; pixels[i+2] = 96; pixels[i+3] = 255;
        } else {
          // Обводка — тёмная
          pixels[i] = 26; pixels[i+1] = 26; pixels[i+2] = 46; pixels[i+3] = 255;
        }
      } else if (dist < width / 2) {
        // Край — тёмный
        pixels[i] = 26; pixels[i+1] = 26; pixels[i+2] = 46; pixels[i+3] = 255;
      } else {
        pixels[i] = 0; pixels[i+1] = 0; pixels[i+2] = 0; pixels[i+3] = 0;
      }
    }
  }

  // Формируем PNG
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type);
    const crcData = Buffer.concat([typeB, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData));
    return Buffer.concat([len, typeB, data, crc]);
  }

  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
      }
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // IDAT — добавляем filter byte 0 перед каждой строкой
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter none
    pixels.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(raw);

  // IEND
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', iend)
  ]);
}

const png = createPNG(256, 256, 233, 69, 96);
fs.writeFileSync(path.join(__dirname, '..', 'assets', 'icon.png'), png);
console.log('Иконка создана: assets/icon.png (' + png.length + ' bytes)');
