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
  const initials = getInitials(user.username || user.email || '?');
  const bgColor = getColorFromUid(user.uid || user.id);
  return `<div class="avatar-circle" style="background-color: ${bgColor};" title="${user.username || user.email || ''}">${initials}</div>`;
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
async function updateAuthUI(firebaseUser) {
  const statusEl = document.getElementById('auth-status');
  if (!statusEl) return;
  if (firebaseUser) {
    let current = getCurrentUser();
    // Если в кеше нет username, пытаемся загрузить из Firestore
    if (!current || !current.username) {
      try {
        const doc = await db.collection('users').doc(firebaseUser.uid).get();
        if (doc.exists) {
          const data = doc.data();
          current = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            username: data.username || '',
            department: data.department || '',
            points: data.points || 0,
            lokoin_balance: data.lokoin_balance || 0,
            purchasedItems: data.purchasedItems || [],
            role: data.role || 'user',
            description: data.description || '',
            achievements: data.achievements || [],
            easterEggsFound: data.easterEggsFound || [],
            completedGames: data.completedGames || [],
            disabled: data.disabled || false,
            dailyLogin: data.dailyLogin || {},
            activeEffects: data.activeEffects || {}
          };
          setCurrentUser(current);
        }
      } catch (e) {
        console.error('Не удалось загрузить профиль в updateAuthUI:', e);
      }
    }
    const displayName = current?.username || firebaseUser.email;
    statusEl.innerHTML = `👤 <span class="auth-greeting">${displayName}</span> | <a href="#" id="logout-link">Выйти</a>`;
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
    statusEl.style.display = '';
  } else {
    const currentPage = window.location.pathname + window.location.search;
    statusEl.innerHTML = `<a href="login.html?redirect=${encodeURIComponent(currentPage)}" class="auth-login-link">Войти</a>`;
    statusEl.style.display = '';
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

  // Обратная связь
  if (typeof initFeedback === 'function') {
    initFeedback();
  }

  // Уведомления
  if (typeof initNotifications === 'function') {
    initNotifications();
  }

  // Автоматическое обновление статуса авторизации, темы и пинг онлайна
  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(async (user) => {
      await updateAuthUI(user);

      if (user && typeof initEasterEggs === 'function') {
        initEasterEggs();
      }

      const cu = getCurrentUser();
      if (cu && cu.activeTheme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }

      // Пинг онлайна: интервал только для авторизованных
      if (window._pingInterval) {
        clearInterval(window._pingInterval);
        window._pingInterval = null;
      }

      if (user && typeof updateLastActive === 'function') {
        // Первое обновление сразу после входа
        updateLastActive(user.uid);

        // Запускаем периодическое обновление каждые 30 секунд
        window._pingInterval = setInterval(() => {
          if (auth.currentUser && typeof updateLastActive === 'function') {
            updateLastActive(auth.currentUser.uid);
          }
        }, 30000);
      }
    });
  } else {
    updateAuthUI(null);
    document.body.classList.remove('dark-theme');
  }

  // Обновление lastActive при возвращении на вкладку
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && typeof auth !== 'undefined' && auth.currentUser && typeof updateLastActive === 'function') {
      updateLastActive(auth.currentUser.uid);
    }
  });
});
