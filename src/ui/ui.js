/**
 * ui.js — HTML UI Overlay Controller
 */

export class UIController {
  constructor() {
    // Screens
    this.mainMenu = document.getElementById('main-menu');
    this.gameHud = document.getElementById('game-hud');
    this.modalWin = document.getElementById('modal-win');
    this.modalDeadlock = document.getElementById('modal-deadlock');

    // HUD elements
    this.hudRemaining = document.getElementById('hud-remaining');
    this.hudTimer = document.getElementById('hud-timer');

    // Buttons
    this.btnStart = document.getElementById('btn-start');
    this.btnTheme = document.getElementById('btn-theme');
    this.btnHint = document.getElementById('btn-hint');
    this.btnShuffle = document.getElementById('btn-shuffle');
    this.btnCatToggle = document.getElementById('btn-cat-toggle');
    this.btnReplay = document.getElementById('btn-replay');
    this.btnShare = document.getElementById('btn-share');
    this.btnAutoShuffle = document.getElementById('btn-auto-shuffle');
    this.btnRestart = document.getElementById('btn-restart');

    // Stats
    this.winStats = document.getElementById('win-stats');

    // Callbacks
    this.onStart = null;
    this.onThemeToggle = null;
    this.onHint = null;
    this.onShuffle = null;
    this.onReplay = null;
    this.onShare = null;
    this.onRestart = null;

    this.isCatTheme = false;
    this.setupListeners();
  }

  setupListeners() {
    this.btnStart.addEventListener('click', () => this.onStart?.());
    this.btnTheme.addEventListener('click', () => {
      this.isCatTheme = !this.isCatTheme;
      this.updateThemeButton();
      this.onThemeToggle?.();
    });
    if (this.btnHint) this.btnHint.addEventListener('click', () => this.onHint?.());
    this.btnShuffle.addEventListener('click', () => this.onShuffle?.());
    this.btnCatToggle.addEventListener('click', () => {
      this.isCatTheme = !this.isCatTheme;
      this.updateThemeButton();
      this.onThemeToggle?.();
    });
    this.btnReplay.addEventListener('click', () => this.onReplay?.());
    this.btnShare.addEventListener('click', () => this.onShare?.());
    this.btnAutoShuffle.addEventListener('click', () => {
      this.hideModal(this.modalDeadlock);
      this.onShuffle?.();
    });
    this.btnRestart.addEventListener('click', () => {
      this.hideModal(this.modalDeadlock);
      this.onRestart?.();
    });
  }

  updateThemeButton() {
    this.btnCatToggle.classList.toggle('cat-active', this.isCatTheme);
    this.btnTheme.innerHTML = this.isCatTheme
      ? '<span class="btn-icon">🀄</span><span>標準テーマ</span>'
      : '<span class="btn-icon">🐱</span><span>猫テーマ</span>';
  }

  showScreen(screen) {
    [this.mainMenu, this.gameHud].forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
  }

  showGame() {
    this.showScreen(this.gameHud);
    const footer = document.getElementById('app-footer');
    if (footer) footer.style.display = 'none';
  }

  showMenu() {
    this.showScreen(this.mainMenu);
    const footer = document.getElementById('app-footer');
    if (footer) footer.style.display = '';
  }

  showModal(modal) {
    modal.classList.add('active');
  }

  hideModal(modal) {
    modal.classList.remove('active');
  }

  showWin(stats) {
    this.winStats.textContent = `クリアタイム: ${stats.time} ／ 手数: ${stats.moves}`;
    this.showModal(this.modalWin);
  }

  showDeadlock() {
    this.showModal(this.modalDeadlock);
  }

  updateHUD(remaining, timeStr) {
    this.hudRemaining.textContent = remaining;
    this.hudTimer.textContent = timeStr;
  }
}
