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

// Функции инициалов и цвета
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

// Бургер-меню
document.addEventListener('DOMContentLoaded', () => {
  const burgerBtn = document.getElementById('burger-btn');
  const mainNav = document.getElementById('main-nav');
  if (burgerBtn && mainNav) {
    burgerBtn.addEventListener('click', () => {
      mainNav.classList.toggle('nav--open');
    });
  }

  // Инициализация пасхалок (должна быть определена в easter-eggs.js)
  if (typeof initEasterEggs === 'function') {
    initEasterEggs();
  }

  // Инициализация обратной связи (если добавлена)
  if (typeof initFeedback === 'function') {
    initFeedback();
  }
});
