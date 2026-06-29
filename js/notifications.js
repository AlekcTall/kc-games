// js/notifications.js

let notificationsUnreadCount = 0;
let notificationsList = [];
let notificationsListener = null;
let notificationDropdown = null;

function initNotifications() {
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

  // Слушатель авторизации
  if (typeof auth !== 'undefined') {
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
              showBrowserNotification(last.message || 'Новое уведомление');
            }
          });
      } else {
        if (notificationsListener) {
          notificationsListener();
          notificationsListener = null;
        }
        notificationsList = [];
        notificationsUnreadCount = 0;
        updateBadge();
        renderNotifications();
      }
    });
  }

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
      listEl.innerHTML = '<div class="notification-item">Нет уведомлений</div>';
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

    // Отмечаем прочитанными при клике
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
  }
}

// Вспомогательная функция для добавления уведомления
async function _addNotificationToUser(userId, message) {
  if (!userId || !message) return;
  await db.collection('users').doc(userId).collection('notifications').add({
    message: message,
    read: false,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// Уведомление о пополнении/списании локоинов (автоматическое или от админа)
async function addLokoinNotification(userId, amount, comment = '') {
  if (!userId || amount === 0) return;
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return;
  const balance = userDoc.data().lokoin_balance || 0;
  const absAmount = Math.abs(amount);
  const plural = pluralizeLokoin(absAmount);
  const balancePlural = pluralizeLokoin(balance);
  let message;
  if (amount > 0) {
    message = `Баланс пополнен на ${absAmount} локоин${plural}`;
    if (comment) message += ` (${comment})`;
    message += `. Общий баланс: ${balance} локоин${balancePlural}.`;
  } else {
    message = `Баланс уменьшен на ${absAmount} локоин${plural}`;
    if (comment) message += ` (${comment})`;
    message += `. Общий баланс: ${balance} локоин${balancePlural}.`;
  }
  await _addNotificationToUser(userId, message);
}

// Уведомление о покупке товара
async function addPurchaseNotification(userId, itemName, price, newBalance) {
  if (!userId) return;
  const pluralPrice = pluralizeLokoin(price);
  const pluralBalance = pluralizeLokoin(newBalance);
  const message = `Вы приобрели «${itemName}» за ${price} локоин${pluralPrice}. Общий баланс: ${newBalance} локоин${pluralBalance}.`;
  await _addNotificationToUser(userId, message);
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
