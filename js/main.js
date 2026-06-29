// main.js

// Функция показа тостов
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  toast.offsetHeight;
  toast.classList.add('toast--visible');
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => {
      if (toast.parentNode) toast.remove();
      if (container.children.length === 0) container.remove();
    });
  }, 3500);
}

// Инициалы и цвет
function getInitials(fullName) {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
    : fullName[0].toUpperCase();
}

function getColorFromUid(uid) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 60%, 70%)`;
}

function renderAvatarDiv(user) {
  const initials = getInitials(user.username);
  const bgColor = getColorFromUid(user.uid || user.id);
  return `<div class="avatar-circle" style="background-color: ${bgColor};" title="${user.username}">${initials}</div>`;
}

// Склонение слова "локоин"
function pluralizeLokoin(n) {
  const abs = Math.abs(n);
  const lastDigit = abs % 10;
  const lastTwoDigits = abs % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'ов';
  if (lastDigit === 1) return '';
  if (lastDigit >= 2 && lastDigit <= 4) return 'а';
  return 'ов';
}

// Обновление статуса в шапке
function updateAuthUI(firebaseUser) {
  const statusEl = document.getElementById('auth-status');
  if (!statusEl) return;
  if (firebaseUser) {
    const current = getCurrentUser();
    const name = current ? current.username : firebaseUser.email;
    statusEl.innerHTML = `👤 ${name} | <a href="#" id="logout-link">Выйти</a>`;
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
      logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof firebaseLogout === 'function') {
          firebaseLogout();
        } else {
          auth.signOut();
        }
      });
    }
  } else {
    statusEl.innerHTML = '<a href="profile.html">Войти</a>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Бургер-меню
  const burgerBtn = document.getElementById('burger-btn');
  const mainNav = document.getElementById('main-nav');
  if (burgerBtn && mainNav) {
    burgerBtn.addEventListener('click', () => {
      mainNav.classList.toggle('nav--open');
    });
  }

  // FAQ аккордеон
  document.querySelectorAll('.faq-item__question').forEach(btn => {
    btn.addEventListener('click', () => {
      const faqItem = btn.parentElement;
      faqItem.classList.toggle('active');
    });
  });

  // Пасхалки
  if (typeof initEasterEggs === 'function') {
    initEasterEggs();
  }

  // Обратная связь
  if (typeof initFeedback === 'function') {
    initFeedback();
  }

  // Уведомления
  if (typeof initNotifications === 'function') {
    initNotifications();
  }

  // Автоматическое обновление статуса авторизации и темы
  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged((user) => {
      updateAuthUI(user);
      // Применение тёмной темы, если пользователь авторизован и она выбрана
      const cu = getCurrentUser();
      if (cu && cu.activeTheme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    });
  } else {
    updateAuthUI(null);
    document.body.classList.remove('dark-theme');
  }
});
