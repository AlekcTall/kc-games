// main.js – общая логика сайта
document.addEventListener('DOMContentLoaded', () => {
  initFirebaseAuthListener();

  initFAQ();
  updateAuthUI();
  initEasterEggs();
  initBurger();

  const currentUser = getCurrentUser();
  if (currentUser && typeof checkAndAwardAchievements === 'function') {
    checkAndAwardAchievements(currentUser.id);
  }
});

// ===== Бургер-меню =====
function initBurger() {
  const burgerBtn = document.getElementById('burger-btn');
  const nav = document.getElementById('main-nav');
  if (!burgerBtn || !nav) return;

  burgerBtn.addEventListener('click', () => {
    nav.classList.toggle('nav--open');
    const authStatus = document.getElementById('auth-status');
    if (authStatus) {
      authStatus.classList.toggle('nav--open');
    }
  });
}

// ===== FAQ аккордеон =====
function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  if (faqItems.length === 0) return;

  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-item__question');
    if (!questionBtn) return;

    questionBtn.addEventListener('click', () => {
      faqItems.forEach(otherItem => {
        if (otherItem !== item) otherItem.classList.remove('active');
      });
      item.classList.toggle('active');
    });
  });
}

// ===== Обновление статуса авторизации в шапке =====
window.updateAuthUI = updateAuthUI;

function updateAuthUI() {
  const authContainer = document.getElementById('auth-status');
  if (!authContainer) return;

  const currentUser = getCurrentUser();
  if (currentUser) {
    authContainer.innerHTML = `
      <span class="auth-greeting">Привет, <strong>${currentUser.username}</strong></span>
      <button class="btn-logout-header" id="header-logout-btn">Выйти</button>
    `;
    document.getElementById('header-logout-btn').addEventListener('click', () => {
      firebaseLogout();
    });
  } else {
    authContainer.innerHTML = `<a href="profile.html" class="auth-login-link">Войти</a>`;
  }
}

// ===== Тосты =====
window.showToast = function(message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  toast.offsetHeight;
  toast.classList.add('toast--visible');
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => {
      if (toast.parentNode) toast.remove();
      if (toastContainer.children.length === 0) toastContainer.remove();
    });
  }, 3500);
};
