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
  // Принудительный reflow для анимации
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

// Обновление статуса в шапке (будет вызываться при изменении состояния auth)
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
        // Используем глобальную функцию выхода
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

// Бургер-меню и инициализация дополнительных модулей
document.addEventListener('DOMContentLoaded', () => {
  // Бургер
  const burgerBtn = document.getElementById('burger-btn');
  const mainNav = document.getElementById('main-nav');
  if (burgerBtn && mainNav) {
    burgerBtn.addEventListener('click', () => {
      mainNav.classList.toggle('nav--open');
    });
  }

  // Пасхалки
  if (typeof initEasterEggs === 'function') {
    initEasterEggs();
  }

  // Обратная связь
  if (typeof initFeedback === 'function') {
    initFeedback();
  }

  // Автоматическое обновление статуса авторизации
  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged((user) => {
      updateAuthUI(user);
    });
  } else {
    // Если Firebase ещё не готов, просто нарисуем «Войти»
    updateAuthUI(null);
  }
});
