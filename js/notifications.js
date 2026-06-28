// js/notifications.js

let notificationsUnreadCount = 0;
let notificationsList = [];
let notificationsOpen = false;
let notificationDropdown = null;
let notificationsListener = null;

function initNotifications() {
  // Создаём кнопку колокольчика в шапке
  const headerInner = document.querySelector('.header__inner');
  if (!headerInner) return;

  const bellContainer = document.createElement('div');
  bellContainer.className = 'notification-bell-container';
  bellContainer.innerHTML = `
    <button class="notification-bell" id="notification-bell">
      🔔
      <span class="notification-badge" id="notification-badge" style="display:none;">0</span>
    </button>
    <div class="notification-dropdown" id="notification-dropdown" style="display:none;">
      <div class="notification-list" id="notification-list"></div>
      <button class="btn-clear" id="clear-notifications-btn">Очистить все</button>
    </div>
  `;
  // Вставляем перед auth-status
  const authStatus = document.getElementById('auth-status');
  if (authStatus) {
    headerInner.insertBefore(bellContainer, authStatus);
  } else {
    headerInner.appendChild(bellContainer);
  }

  notificationDropdown = document.getElementById('notification-dropdown');
  const bellBtn = document.getElementById('notification-bell');
  const badge = document.getElementById('notification-badge');
  const listEl = document.getElementById('notification-list');
  const clearBtn = document.getElementById('clear-notifications-btn');

  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (notificationDropdown.style.display === 'block') {
      notificationDropdown.style.display = 'none';
    } else {
      notificationDropdown.style.display = 'block';
      // Отмечаем все как прочитанные при открытии
      markAllRead();
    }
  });

  clearBtn.addEventListener('click', async () => {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.uid) return;
    const notifRef = db.collection('users').doc(currentUser.uid).collection('notifications');
    const snapshot = await notifRef.get();
    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    notificationsUnreadCount = 0;
    notificationsList = [];
    updateBadge();
    renderNotifications();
  });

  document.addEventListener('click', () => {
    if (notificationDropdown) notificationDropdown.style.display = 'none';
  });

  // Подписываемся на изменения в уведомлениях
  auth.onAuthStateChanged((user) => {
    if (user) {
      if (notificationsListener) notificationsListener();
      notificationsListener = db.collection('users').doc(user.uid)
        .collection('notifications')
        .orderBy('timestamp', 'desc')
        .limit(20)
        .onSnapshot(snapshot => {
          notificationsList = [];
          notificationsUnreadCount = 0;
          snapshot.forEach(doc => {
            const data = doc.data();
            notificationsList.push({ id: doc.id, ...data });
            if (!data.read) notificationsUnreadCount++;
          });
          updateBadge();
          renderNotifications();
          // Показываем браузерное уведомление для последнего
          const last = notificationsList[0];
          if (last && !last.read && last.timestamp) {
            showBrowserNotification(last.message);
          }
        });
    } else {
      if (notificationsListener) notificationsListener();
      notificationsListener = null;
      notificationsList = [];
      notificationsUnreadCount = 0;
      updateBadge();
      renderNotifications();
    }
  });

  function updateBadge() {
    if (!badge) return;
    if (notificationsUnreadCount > 0) {
      badge.style.display = 'inline';
      badge.textContent = notificationsUnreadCount;
    } else {
      badge.style.display = 'none';
    }
  }

  function renderNotifications() {
    if (!listEl) return;
    if (notificationsList.length === 0) {
       = '<div class="notification-item">Нет уведомлений</div>';
      return;
    }
listEl.innerHTML = notificationsList.map(n => {
  const date = n.timestamp ? new Date(n.timestamp.seconds * 1000).toLocaleString('ru-RU') : '';
  const msg = n.message || 'Новое достижение';
  return `<div class="notification-item ${n.read ? 'read' : 'unread'}" data-id="${n.id}">
    <span class="notif-message">${msg}</span>
    <small class="notif-date">${date}</small>
  </div>`;
}).join('');

    // Клик по уведомлению отмечает как прочитанное (но не удаляет)
    listEl.querySelectorAll('.notification-item.unread').forEach(item => {
      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = item.dataset.id;
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.uid) {
          await db.collection('users').doc(currentUser.uid)
            .collection('notifications').doc(id).update({ read: true });
        }
      });
    });
  }

  async function markAllRead() {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.uid) return;
    const notifRef = db.collection('users').doc(currentUser.uid).collection('notifications');
    const snapshot = await notifRef.where('read', '==', false).get();
    const batch = db.batch();
    snapshot.forEach(doc => batch.update(doc.ref, { read: true }));
    await batch.commit();
    // Обновление локального счётчика произойдёт через слушатель автоматически
  }
}

function showBrowserNotification(message) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification('КЦ-Игры', { body: message, icon: '/favicon.ico' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        new Notification('КЦ-Игры', { body: message, icon: '/favicon.ico' });
      }
    });
  }
}
