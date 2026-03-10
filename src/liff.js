/**
 * liff.js — LINE LIFF SDK Integration
 */

const LIFF_ID = '2009395480-MyZyNk0a';

let liffReady = false;

/**
 * Initialize LIFF SDK
 */
export async function initLiff() {
  try {
    const liff = (await import('@line/liff')).default;
    await liff.init({ liffId: LIFF_ID });
    window.liff = liff;
    liffReady = true;
    console.log('LIFF initialized successfully');
  } catch (err) {
    console.warn('LIFF init failed (running outside LINE?):', err.message);
    window.liff = null;
    liffReady = false;
  }
}

/**
 * Share game result via LINE (4-level fallback)
 */
export async function shareResult(timeStr, moves) {
  const message = {
    type: 'text',
    text: `🀄 雀輪 クリア！\n⏱ タイム: ${timeStr}\n🎯 手数: ${moves}\n\n一緒にプレイしよう！`,
  };

  const liff = window.liff;

  // Level 1: shareTargetPicker
  if (liff && liff.isApiAvailable('shareTargetPicker')) {
    try {
      await liff.shareTargetPicker([message]);
      return true;
    } catch (e) {
      console.warn('shareTargetPicker failed:', e);
    }
  }

  // Level 2: sendMessages (in-client only)
  if (liff && liff.isInClient && liff.isInClient()) {
    try {
      await liff.sendMessages([message]);
      return true;
    } catch (e) {
      console.warn('sendMessages failed:', e);
    }
  }

  // Level 3: navigator.share
  if (navigator.share) {
    try {
      await navigator.share({
        title: '雀輪 JAKURIN',
        text: message.text,
      });
      return true;
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('navigator.share failed:', e);
    }
  }

  // Level 4: Clipboard
  try {
    await navigator.clipboard.writeText(message.text);
    alert('結果をクリップボードにコピーしました！');
    return true;
  } catch (e) {
    console.warn('Clipboard failed:', e);
  }

  return false;
}
