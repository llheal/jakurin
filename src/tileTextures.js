/**
 * tileTextures.js — Canvas2D Texture Atlas Generator
 * Generates all mahjong tile face textures programmatically.
 */

const TILE_SIZE = 128;
const ATLAS_COLS = 8;

// All 42 unique tile types
export const TILE_TYPES = {
  // 萬子 (Characters) 1-9
  MAN_1: { suit: 'man', num: 1, label: '一萬', char: '一', sub: '萬' },
  MAN_2: { suit: 'man', num: 2, label: '二萬', char: '二', sub: '萬' },
  MAN_3: { suit: 'man', num: 3, label: '三萬', char: '三', sub: '萬' },
  MAN_4: { suit: 'man', num: 4, label: '四萬', char: '四', sub: '萬' },
  MAN_5: { suit: 'man', num: 5, label: '五萬', char: '五', sub: '萬' },
  MAN_6: { suit: 'man', num: 6, label: '六萬', char: '六', sub: '萬' },
  MAN_7: { suit: 'man', num: 7, label: '七萬', char: '七', sub: '萬' },
  MAN_8: { suit: 'man', num: 8, label: '八萬', char: '八', sub: '萬' },
  MAN_9: { suit: 'man', num: 9, label: '九萬', char: '九', sub: '萬' },

  // 筒子 (Circles) 1-9
  PIN_1: { suit: 'pin', num: 1, label: '一筒' },
  PIN_2: { suit: 'pin', num: 2, label: '二筒' },
  PIN_3: { suit: 'pin', num: 3, label: '三筒' },
  PIN_4: { suit: 'pin', num: 4, label: '四筒' },
  PIN_5: { suit: 'pin', num: 5, label: '五筒' },
  PIN_6: { suit: 'pin', num: 6, label: '六筒' },
  PIN_7: { suit: 'pin', num: 7, label: '七筒' },
  PIN_8: { suit: 'pin', num: 8, label: '八筒' },
  PIN_9: { suit: 'pin', num: 9, label: '九筒' },

  // 索子 (Bamboo) 1-9
  SOU_1: { suit: 'sou', num: 1, label: '一索' },
  SOU_2: { suit: 'sou', num: 2, label: '二索' },
  SOU_3: { suit: 'sou', num: 3, label: '三索' },
  SOU_4: { suit: 'sou', num: 4, label: '四索' },
  SOU_5: { suit: 'sou', num: 5, label: '五索' },
  SOU_6: { suit: 'sou', num: 6, label: '六索' },
  SOU_7: { suit: 'sou', num: 7, label: '七索' },
  SOU_8: { suit: 'sou', num: 8, label: '八索' },
  SOU_9: { suit: 'sou', num: 9, label: '九索' },

  // 風牌 (Winds)
  WIND_E: { suit: 'wind', label: '東', char: '東' },
  WIND_S: { suit: 'wind', label: '南', char: '南' },
  WIND_W: { suit: 'wind', label: '西', char: '西' },
  WIND_N: { suit: 'wind', label: '北', char: '北' },

  // 三元牌 (Dragons)
  DRAGON_W: { suit: 'dragon', label: '白', char: '白' },
  DRAGON_G: { suit: 'dragon', label: '發', char: '發' },
  DRAGON_R: { suit: 'dragon', label: '中', char: '中' },

  // 花牌 (Flowers) — 8 unique tiles, paired as 4 groups of 2
  FLOWER_1: { suit: 'flower', label: '春', char: '春' },
  FLOWER_2: { suit: 'flower', label: '夏', char: '夏' },
  FLOWER_3: { suit: 'flower', label: '秋', char: '秋' },
  FLOWER_4: { suit: 'flower', label: '冬', char: '冬' },
  FLOWER_5: { suit: 'flower', label: '梅', char: '梅' },
  FLOWER_6: { suit: 'flower', label: '蘭', char: '蘭' },
  FLOWER_7: { suit: 'flower', label: '竹', char: '竹' },
  FLOWER_8: { suit: 'flower', label: '菊', char: '菊' },
};

export const TILE_TYPE_KEYS = Object.keys(TILE_TYPES);

// For matching: flowers/seasons match within their group
export function getMatchGroup(typeKey) {
  const t = TILE_TYPES[typeKey];
  if (t.suit === 'flower') {
    const idx = TILE_TYPE_KEYS.indexOf(typeKey);
    const flowerStart = TILE_TYPE_KEYS.indexOf('FLOWER_1');
    // Group flowers into pairs: 1&2, 3&4, 5&6, 7&8
    return 'flower_' + Math.floor((idx - flowerStart) / 2);
  }
  return typeKey;
}

// Cat theme tile definitions
const CAT_BREEDS = [
  { name: 'スコティッシュ', emoji: '🐱', color: '#F4A460' },
  { name: 'マンチカン', emoji: '😺', color: '#DEB887' },
  { name: 'ペルシャ', emoji: '😸', color: '#FAFAD2' },
  { name: 'ラグドール', emoji: '😻', color: '#E6E6FA' },
  { name: 'ロシアンブルー', emoji: '😽', color: '#B0C4DE' },
  { name: 'ベンガル', emoji: '🐈', color: '#DAA520' },
  { name: 'アメショ', emoji: '😼', color: '#C0C0C0' },
  { name: 'ブリティッシュ', emoji: '😹', color: '#BC8F8F' },
  { name: 'シャム', emoji: '🙀', color: '#FAEBD7' },
];

const PAW_COLORS = [
  '#FFB6C1', '#FF69B4', '#DDA0DD', '#FFC0CB',
  '#F08080', '#FA8072', '#E6B0AA', '#F5B7B1',
  '#FADBD8',
];

/**
 * Generate texture atlas for standard mahjong tiles
 */
export function generateStandardAtlas() {
  const rows = Math.ceil(TILE_TYPE_KEYS.length / ATLAS_COLS);
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * TILE_SIZE;
  canvas.height = rows * TILE_SIZE;
  const ctx = canvas.getContext('2d');

  TILE_TYPE_KEYS.forEach((key, i) => {
    const col = i % ATLAS_COLS;
    const row = Math.floor(i / ATLAS_COLS);
    const x = col * TILE_SIZE;
    const y = row * TILE_SIZE;
    drawStandardTile(ctx, x, y, key, TILE_TYPES[key]);
  });

  return { canvas, rows };
}

/**
 * Generate texture atlas for cat theme tiles
 */
export function generateCatAtlas() {
  const rows = Math.ceil(TILE_TYPE_KEYS.length / ATLAS_COLS);
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * TILE_SIZE;
  canvas.height = rows * TILE_SIZE;
  const ctx = canvas.getContext('2d');

  TILE_TYPE_KEYS.forEach((key, i) => {
    const col = i % ATLAS_COLS;
    const row = Math.floor(i / ATLAS_COLS);
    const x = col * TILE_SIZE;
    const y = row * TILE_SIZE;
    drawCatTile(ctx, x, y, key, i);
  });

  return { canvas, rows };
}

function drawStandardTile(ctx, x, y, key, tile) {
  // Background — slightly warm ivory
  ctx.fillStyle = '#F8F2E4';
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  // Subtle recessed border (engraved frame feel)
  ctx.strokeStyle = '#D0C8B0';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);

  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;

  // Helper: draw text with engraved shadow for carved look
  function drawEngraved(text, px, py, font, color) {
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Dark shadow (carved depression)
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillText(text, px + 1.5, py + 2);
    // Main color (bold)
    ctx.fillStyle = color;
    ctx.fillText(text, px, py);
  }

  if (tile.suit === 'pin') {
    drawPinTile(ctx, x, y, tile.num);
  } else if (tile.suit === 'sou') {
    drawSouTile(ctx, x, y, tile.num);
  } else if (tile.suit === 'man') {
    // Main character — deep red, large bold
    drawEngraved(tile.char, cx, cy - 10,
      `bold ${TILE_SIZE * 0.52}px "Noto Serif JP", serif`, '#B91C1C');
    // Sub text "萬" — deep navy
    drawEngraved(tile.sub, cx, cy + TILE_SIZE * 0.32,
      `bold ${TILE_SIZE * 0.26}px "Noto Serif JP", serif`, '#1E3A5F');
  } else if (tile.suit === 'wind') {
    drawEngraved(tile.char, cx, cy,
      `bold ${TILE_SIZE * 0.62}px "Noto Serif JP", serif`, '#0F2B4C');
  } else if (tile.suit === 'dragon') {
    let color;
    if (tile.char === '中') color = '#B91C1C';
    else if (tile.char === '發') color = '#166534';
    else color = '#1E293B';
    drawEngraved(tile.char, cx, cy,
      `bold ${TILE_SIZE * 0.65}px "Noto Serif JP", serif`, color);
  } else if (tile.suit === 'flower') {
    const colors = ['#B91C1C', '#166534', '#92400E', '#0F2B4C',
                     '#7C2D12', '#3F6212', '#1E40AF', '#6B21A8'];
    const idx = TILE_TYPE_KEYS.indexOf(key) - TILE_TYPE_KEYS.indexOf('FLOWER_1');
    drawEngraved(tile.char, cx, cy,
      `bold ${TILE_SIZE * 0.55}px "Noto Serif JP", serif`, colors[idx] || '#1E293B');
  }
}

function drawPinTile(ctx, x, y, num) {
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;
  const r = TILE_SIZE * 0.13;
  const colors = ['#991B1B', '#14532D', '#1E3A5F', '#78350F'];

  const positions = getPinPositions(num, cx, cy, TILE_SIZE);
  positions.forEach((pos, i) => {
    // Engraved shadow
    ctx.beginPath();
    ctx.arc(pos.x + 1, pos.y + 1.5, r + 1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fill();
    // Outer circle — bold
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    // Dark outline
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.stroke();
    // Inner circle
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#F8F2E4';
    ctx.fill();
  });
}

function getPinPositions(num, cx, cy, size) {
  const s = size * 0.2;
  const positions = [];
  if (num === 1) {
    positions.push({ x: cx, y: cy });
  } else if (num === 2) {
    positions.push({ x: cx, y: cy - s }, { x: cx, y: cy + s });
  } else if (num === 3) {
    positions.push({ x: cx, y: cy - s }, { x: cx, y: cy }, { x: cx, y: cy + s });
  } else if (num === 4) {
    positions.push({ x: cx - s, y: cy - s }, { x: cx + s, y: cy - s },
                    { x: cx - s, y: cy + s }, { x: cx + s, y: cy + s });
  } else if (num === 5) {
    positions.push({ x: cx - s, y: cy - s }, { x: cx + s, y: cy - s },
                    { x: cx, y: cy },
                    { x: cx - s, y: cy + s }, { x: cx + s, y: cy + s });
  } else if (num === 6) {
    positions.push({ x: cx - s, y: cy - s * 1.2 }, { x: cx + s, y: cy - s * 1.2 },
                    { x: cx - s, y: cy }, { x: cx + s, y: cy },
                    { x: cx - s, y: cy + s * 1.2 }, { x: cx + s, y: cy + s * 1.2 });
  } else if (num === 7) {
    positions.push({ x: cx - s, y: cy - s * 1.2 }, { x: cx + s, y: cy - s * 1.2 },
                    { x: cx - s, y: cy }, { x: cx, y: cy }, { x: cx + s, y: cy },
                    { x: cx - s, y: cy + s * 1.2 }, { x: cx + s, y: cy + s * 1.2 });
  } else if (num === 8) {
    const g = s * 0.85;
    for (let r = -1; r <= 1; r += 1) {
      if (r === 0) {
        positions.push({ x: cx - g, y: cy + r * s * 1.2 }, { x: cx + g, y: cy + r * s * 1.2 });
      } else {
        positions.push({ x: cx - g, y: cy + r * s * 1.2 },
                        { x: cx, y: cy + r * s * 1.2 },
                        { x: cx + g, y: cy + r * s * 1.2 });
      }
    }
  } else if (num === 9) {
    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        positions.push({ x: cx + c * s, y: cy + r * s });
      }
    }
  }
  return positions;
}

function drawSouTile(ctx, x, y, num) {
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;

  if (num === 1) {
    // Bold bird character
    ctx.font = `bold ${TILE_SIZE * 0.55}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillText('🀐', cx + 1, cy + 2);
    ctx.fillStyle = '#14532D';
    ctx.fillText('🀐', cx, cy);
    return;
  }

  // Draw bamboo sticks — bolder
  const stickW = TILE_SIZE * 0.07;
  const stickH = TILE_SIZE * 0.35;
  const positions = getSouPositions(num, cx, cy, TILE_SIZE);
  
  positions.forEach((pos, i) => {
    const color = i % 2 === 0 ? '#14532D' : '#991B1B';
    // Engraved shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.roundRect(pos.x - stickW / 2 + 1, pos.y - stickH / 2 + 1.5, stickW, stickH, 2);
    ctx.fill();
    // Main stick — bold
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(pos.x - stickW / 2, pos.y - stickH / 2, stickW, stickH, 2);
    ctx.fill();
    // Nodes — bold
    for (let n = -1; n <= 1; n++) {
      ctx.fillStyle = n === 0 ? '#B45309' : color;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y + n * stickH * 0.3, stickW * 1.0, stickW * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function getSouPositions(num, cx, cy, size) {
  const s = size * 0.15;
  const positions = [];
  if (num === 2) {
    positions.push({ x: cx, y: cy - s }, { x: cx, y: cy + s });
  } else if (num === 3) {
    positions.push({ x: cx, y: cy - s * 1.1 }, { x: cx, y: cy }, { x: cx, y: cy + s * 1.1 });
  } else if (num === 4) {
    positions.push({ x: cx - s, y: cy - s * 0.7 }, { x: cx + s, y: cy - s * 0.7 },
                    { x: cx - s, y: cy + s * 0.7 }, { x: cx + s, y: cy + s * 0.7 });
  } else if (num <= 9) {
    const cols = num <= 6 ? 2 : 3;
    const rowsN = Math.ceil(num / cols);
    let idx = 0;
    for (let r = 0; r < rowsN; r++) {
      const thisCols = (r === rowsN - 1 && num % cols !== 0) ? num % cols : cols;
      for (let c = 0; c < thisCols; c++) {
        positions.push({
          x: cx + (c - (thisCols - 1) / 2) * s * 1.3,
          y: cy + (r - (rowsN - 1) / 2) * s * 1.2
        });
        idx++;
      }
    }
  }
  return positions;
}

function drawCatTile(ctx, x, y, key, index) {
  // Background
  const bgColor = index % 2 === 0 ? '#FFF5F0' : '#F0F5FF';
  ctx.fillStyle = bgColor;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  ctx.strokeStyle = '#F0D8D8';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;
  const tileInfo = TILE_TYPES[key];

  if (tileInfo.suit === 'pin') {
    // Paw pads
    drawPawPad(ctx, cx, cy, PAW_COLORS[tileInfo.num - 1] || '#FFB6C1', TILE_SIZE * 0.35);
  } else if (tileInfo.suit === 'man' || tileInfo.suit === 'sou') {
    // Cat face
    const breed = CAT_BREEDS[(tileInfo.num - 1) % CAT_BREEDS.length];
    drawCatFace(ctx, cx, cy, breed.color, TILE_SIZE * 0.35);
    // Number indicator
    ctx.fillStyle = '#666';
    ctx.font = `bold ${TILE_SIZE * 0.18}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tileInfo.num, cx, y + TILE_SIZE - 14);
  } else if (tileInfo.suit === 'wind' || tileInfo.suit === 'dragon') {
    // Cat accessories
    const emojis = ['🎀', '🐟', '🧶', '🔔', '🌸', '⭐', '🎵'];
    const eIdx = TILE_TYPE_KEYS.indexOf(key) - TILE_TYPE_KEYS.indexOf('WIND_E');
    ctx.font = `${TILE_SIZE * 0.45}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emojis[eIdx % emojis.length], cx, cy);
  } else if (tileInfo.suit === 'flower') {
    // Cat expressions
    const catEmojis = ['😺', '😸', '😻', '😽', '🙀', '😹', '😼', '😿'];
    const fIdx = TILE_TYPE_KEYS.indexOf(key) - TILE_TYPE_KEYS.indexOf('FLOWER_1');
    ctx.font = `${TILE_SIZE * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(catEmojis[fIdx % catEmojis.length], cx, cy);
  }
}

function drawPawPad(ctx, cx, cy, color, size) {
  // Main pad
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy + size * 0.15, size * 0.4, size * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Toe beans
  const toeR = size * 0.15;
  const toePositions = [
    { x: cx - size * 0.28, y: cy - size * 0.2 },
    { x: cx - size * 0.08, y: cy - size * 0.35 },
    { x: cx + size * 0.08, y: cy - size * 0.35 },
    { x: cx + size * 0.28, y: cy - size * 0.2 },
  ];
  toePositions.forEach(pos => {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, toeR, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCatFace(ctx, cx, cy, color, size) {
  // Face
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.5, cy - size * 0.3);
  ctx.lineTo(cx - size * 0.3, cy - size * 0.75);
  ctx.lineTo(cx - size * 0.05, cy - size * 0.35);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.5, cy - size * 0.3);
  ctx.lineTo(cx + size * 0.3, cy - size * 0.75);
  ctx.lineTo(cx + size * 0.05, cy - size * 0.35);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.2, cy - size * 0.05, size * 0.07, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + size * 0.2, cy - size * 0.05, size * 0.07, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye shine
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(cx - size * 0.18, cy - size * 0.09, size * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + size * 0.22, cy - size * 0.09, size * 0.03, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = '#FF9999';
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.05);
  ctx.lineTo(cx - size * 0.06, cy + size * 0.14);
  ctx.lineTo(cx + size * 0.06, cy + size * 0.14);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.14);
  ctx.quadraticCurveTo(cx - size * 0.12, cy + size * 0.28, cx - size * 0.2, cy + size * 0.22);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.14);
  ctx.quadraticCurveTo(cx + size * 0.12, cy + size * 0.28, cx + size * 0.2, cy + size * 0.22);
  ctx.stroke();
}

/**
 * Get UV offset & scale for a specific tile type in the atlas
 */
export function getTileUV(typeKey) {
  const idx = TILE_TYPE_KEYS.indexOf(typeKey);
  const col = idx % ATLAS_COLS;
  const totalRows = Math.ceil(TILE_TYPE_KEYS.length / ATLAS_COLS);
  const row = Math.floor(idx / ATLAS_COLS);
  return {
    offsetX: col / ATLAS_COLS,
    offsetY: 1 - (row + 1) / totalRows,
    scaleX: 1 / ATLAS_COLS,
    scaleY: 1 / totalRows,
  };
}
