// js/firebase-auth.js

// Инициализация глобальных переменных
const auth = firebase.auth();
const db = firebase.firestore();

// ================== АВТОРИЗАЦИЯ ==================

async function firebaseRegister(email, password, username, department) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Отправляем письмо для подтверждения email
    await user.sendEmailVerification();
    
    await db.collection('users').doc(user.uid).set({
      username: username,
      email: email,
      department: department,
      points: 0,
      lokoin_balance: 0,
      purchasedItems: [],
      role: 'user',
      description: '',
      achievements: [],
      easterEggsFound: [],
      completedGames: [],
      disabled: false,
      lastActive: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      dailyLogin: {
        lastLoginDate: null,
        streak: 0,
        longestStreak: 0,
        totalLogins: 0,
        loginHistory: []
      }
    });
    const userData = {
      uid: user.uid,
      email: email,
      username: username,
      department: department,
      points: 0,
      lokoin_balance: 0,
      purchasedItems: [],
      role: 'user',
      description: '',
      achievements: [],
      easterEggsFound: [],
      completedGames: [],
      disabled: false,
      dailyLogin: {
        lastLoginDate: null,
        streak: 0,
        longestStreak: 0,
        totalLogins: 0,
        loginHistory: []
      }
    };
    setCurrentUser(userData);
    updateAuthUI(user);
    return userData;
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    throw error;
  }
}

async function firebaseLogin(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Проверяем подтверждение email
    if (!user.emailVerified) {
      await user.sendEmailVerification();
      await auth.signOut();
      throw new Error('Email не подтверждён. Новое письмо отправлено. Проверьте почту и перейдите по ссылке.');
    }
    
    const doc = await db.collection('users').doc(user.uid).get();
    if (doc.exists) {
      const data = doc.data();
      
      // Проверяем, не заблокирован ли пользователь
      if (data.disabled) {
        await auth.signOut();
        throw new Error('Ваша учётная запись заблокирована. Обратитесь к администратору.');
      }
      
      const userData = {
        uid: user.uid,
        email: user.email,
        username: data.username,
        department: data.department,
        points: data.points || 0,
        lokoin_balance: data.lokoin_balance || 0,
        purchasedItems: data.purchasedItems || [],
        role: data.role || 'user',
        description: data.description || '',
        achievements: data.achievements || [],
        easterEggsFound: data.easterEggsFound || [],
        completedGames: data.completedGames || [],
        disabled: data.disabled || false,
        dailyLogin: data.dailyLogin || {
          lastLoginDate: null,
          streak: 0,
          longestStreak: 0,
          totalLogins: 0,
          loginHistory: []
        }
      };
      setCurrentUser(userData);
      updateAuthUI(user);
      
      // Обновляем время последней активности
      await updateLastActive(user.uid);
      
      // Обрабатываем ежедневный вход
      const loginResult = await processDailyLogin(user.uid);
      if (loginResult) {
        userData._dailyReward = loginResult;
        setCurrentUser(userData);
      }
      
      return userData;
    } else {
      throw new Error('Документ пользователя не найден');
    }
  } catch (error) {
    console.error('Ошибка входа:', error);
    throw error;
  }
}

function firebaseLogout() {
  auth.signOut().then(() => {
    localStorage.removeItem('krugames_currentUser');
    updateAuthUI(null);
    window.location.href = 'index.html';
  }).catch(error => {
    console.error('Ошибка выхода:', error);
  });
}

// ================== ЕЖЕДНЕВНЫЙ ВХОД ==================

// Прогрессивные награды по дням
function getDailyReward(day) {
  const rewards = {
    1: { points: 2, lokoin: 1, label: 'День 1' },
    2: { points: 3, lokoin: 1, label: 'День 2' },
    3: { points: 5, lokoin: 2, label: 'День 3' },
    4: { points: 5, lokoin: 2, label: 'День 4' },
    5: { points: 8, lokoin: 3, label: 'День 5' },
    6: { points: 8, lokoin: 3, label: 'День 6' },
    7: { points: 12, lokoin: 5, label: 'День 7' }
  };
  // После 7 дней награда повторяется как в 7-й день
  if (day > 7) return { points: 12, lokoin: 5, label: `День ${day}` };
  return rewards[day] || rewards[1];
}

// Получение текущей даты по московскому времени (UTC+3)
function getMoscowDate() {
  const now = new Date();
  const moscowTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
  return moscowTime.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Получение вчерашней даты по московскому времени
function getYesterdayMoscow() {
  const now = new Date();
  const moscowTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
  moscowTime.setDate(moscowTime.getDate() - 1);
  return moscowTime.toISOString().slice(0, 10);
}

async function processDailyLogin(uid) {
  if (!uid) return null;
  
  try {
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    if (!doc.exists) return null;
    
    const data = doc.data();
    const dailyLogin = data.dailyLogin || {
      lastLoginDate: null,
      streak: 0,
      longestStreak: 0,
      totalLogins: 0,
      loginHistory: []
    };
    
    const today = getMoscowDate();
    const yesterday = getYesterdayMoscow();
    
    // Если уже заходили сегодня — ничего не делаем
    if (dailyLogin.lastLoginDate === today) {
      return null;
    }
    
    let newStreak = dailyLogin.streak || 0;
    
    // Проверяем, была ли активность вчера
    if (dailyLogin.lastLoginDate === yesterday) {
      // Серия продолжается
      newStreak += 1;
    } else {
      // Серия прервалась — начинаем заново
      newStreak = 1;
    }
    
    const reward = getDailyReward(newStreak);
    
    // Обновляем данные
    const loginHistory = dailyLogin.loginHistory || [];
    loginHistory.push(today);
    
    // Оставляем только последние 60 дней в истории
    const trimmedHistory = loginHistory.slice(-60);
    
    const newDailyLogin = {
      lastLoginDate: today,
      streak: newStreak,
      longestStreak: Math.max(dailyLogin.longestStreak || 0, newStreak),
      totalLogins: (dailyLogin.totalLogins || 0) + 1,
      loginHistory: trimmedHistory
    };
    
    // Начисляем баллы и локоины
    const oldPoints = data.points || 0;
    const newPoints = oldPoints + reward.points;
    const oldLokoin = data.lokoin_balance || 0;
    const newLokoin = oldLokoin + reward.lokoin;
    
    await userRef.update({
      dailyLogin: newDailyLogin,
      points: newPoints,
      lokoin_balance: newLokoin
    });
    
    // Отправляем уведомление
    if (typeof addNotification === 'function') {
      await addNotification(
        uid,
        `Ежедневный вход (${reward.label}): +${reward.points} баллов, +${reward.lokoin} локоинов`,
        'game',
        'profile.html'
      );
    }
    
    // Проверяем достижения для ежедневного входа
    if (typeof checkAndAwardAchievements === 'function') {
      await checkAndAwardAchievements();
    }
    
    // Обновляем кэш
    const current = getCurrentUser();
    if (current) {
      current.points = newPoints;
      current.lokoin_balance = newLokoin;
      current.dailyLogin = newDailyLogin;
      setCurrentUser(current);
    }
    
    return {
      streak: newStreak,
      points: reward.points,
      lokoin: reward.lokoin,
      label: reward.label
    };
  } catch (e) {
    console.error('Ошибка ежедневного входа:', e);
    return null;
  }
}

// ================== ОБНОВЛЕНИЕ ПРОФИЛЯ ==================

async function firebaseUpdateProfile(uid, data) {
  try {
    await db.collection('users').doc(uid).update(data);
    const current = getCurrentUser();
    if (current && (current.uid === uid || current.id === uid)) {
      Object.assign(current, data);
      setCurrentUser(current);
    }
    return true;
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    throw error;
  }
}

// ================== НАЧИСЛЕНИЕ БАЛЛОВ (С ЛОКОИНАМИ) ==================

async function addPointsToCurrentUser(points, gameId = null) {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    if (!doc.exists) return false;
    const data = doc.data();
    const oldPoints = data.points || 0;
    const newPoints = oldPoints + points;

    // Вычисляем прирост локоинов
    const oldLokoin = Math.floor(oldPoints / 10);
    const newLokoin = Math.floor(newPoints / 10);
    const delta = newLokoin - oldLokoin;
    const currentLokoinBalance = data.lokoin_balance || 0;
    const newLokoinBalance = currentLokoinBalance + delta;

    const updateData = { points: newPoints };

    if (gameId) {
      const completedGames = data.completedGames || [];
      if (!completedGames.includes(gameId)) {
        completedGames.push(gameId);
        updateData.completedGames = completedGames;
      }
      const gameHistory = data.gameHistory || [];
      gameHistory.push({
        game: gameId,
        points: points,
        timestamp: Date.now()
      });
      updateData.gameHistory = gameHistory;
    }

    // Обновляем локоины, если есть прирост
    if (delta > 0) {
      updateData.lokoin_balance = newLokoinBalance;
    }

    // Всегда обновляем lastActive при начислении баллов
    updateData.lastActive = firebase.firestore.FieldValue.serverTimestamp();

    await userRef.update(updateData);

    // Отправляем уведомление о пополнении локоинов
    if (delta > 0 && typeof addLokoinNotification === 'function') {
      addLokoinNotification(user.uid, delta).catch(e => console.error('Ошибка уведомления:', e));
    }

    // Синхронизируем локальный кэш
    const current = getCurrentUser();
    if (current) {
      current.points = newPoints;
      if (delta > 0) current.lokoin_balance = newLokoinBalance;
      if (updateData.completedGames) current.completedGames = updateData.completedGames;
      if (updateData.gameHistory) current.gameHistory = updateData.gameHistory;
      setCurrentUser(current);
    }
    return true;
  } catch (error) {
    console.error('Ошибка начисления баллов:', error);
    return false;
  }
}

// ================== СИНХРОНИЗАЦИЯ ПАСХАЛОК ==================

async function syncEasterEggsToFirestore(easterEggs) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await db.collection('users').doc(user.uid).update({
      easterEggsFound: easterEggs
    });
    const current = getCurrentUser();
    if (current) {
      current.easterEggsFound = easterEggs;
      setCurrentUser(current);
    }
  } catch (error) {
    console.error('Ошибка синхронизации пасхалок:', error);
  }
}

// ================== СИНХРОНИЗАЦИЯ ДОСТИЖЕНИЙ ==================

async function syncAchievementsToFirestore(achievements) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await db.collection('users').doc(user.uid).update({
      achievements: achievements
    });
    const current = getCurrentUser();
    if (current) {
      current.achievements = achievements;
      setCurrentUser(current);
    }
  } catch (error) {
    console.error('Ошибка синхронизации достижений:', error);
  }
}

// ================== СИНХРОНИЗАЦИЯ ИГРОВОЙ СТАТИСТИКИ ==================

async function syncGameStats(gameId, stats) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    if (!doc.exists) return;
    const data = doc.data();
    const gameStats = data.gameStats || {};
    const currentStats = gameStats[gameId] || {};
    const merged = { ...currentStats };

    if (stats.totalClicks !== undefined) {
      merged.totalClicks = Math.max(currentStats.totalClicks || 0, stats.totalClicks);
    }
    if (stats.maxScore !== undefined) {
      merged.maxScore = Math.max(currentStats.maxScore || 0, stats.maxScore);
    }
    if (stats.bestMoves !== undefined) {
      merged.bestMoves = currentStats.bestMoves
        ? Math.min(currentStats.bestMoves, stats.bestMoves)
        : stats.bestMoves;
    }
    if (stats.bestTime !== undefined) {
      merged.bestTime = currentStats.bestTime
        ? Math.min(currentStats.bestTime, stats.bestTime)
        : stats.bestTime;
    }
    // Для 2048 – максимальная собранная плитка
    if (stats.maxTile !== undefined) {
      merged.maxTile = Math.max(currentStats.maxTile || 0, stats.maxTile);
    }
    // Булевы флаги
    if (stats.selfEaten) merged.selfEaten = true;
    if (stats.wallCrash) merged.wallCrash = true;
    if (stats.openedFirst) merged.openedFirst = true;
    if (stats.completed) merged.completed = true;
    if (stats.loss) merged.loss = true;

    gameStats[gameId] = merged;
    await userRef.update({ gameStats });

    const current = getCurrentUser();
    if (current) {
      if (!current.gameStats) current.gameStats = {};
      current.gameStats[gameId] = merged;
      setCurrentUser(current);
    }
    return true;
  } catch (error) {
    console.error('Ошибка синхронизации игровой статистики:', error);
    return false;
  }
}

// ================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==================

function updateAuthUI(firebaseUser) {
  const statusEl = document.getElementById('auth-status');
  if (!statusEl) return;
  if (firebaseUser) {
    const user = getCurrentUser();
    const name = user ? user.username : firebaseUser.email;
    statusEl.innerHTML = `👤 <span class="auth-greeting">${name}</span> | <a href="#" id="logout-link">Выйти</a>`;
    document.getElementById('logout-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      firebaseLogout();
    });
  } else {
    statusEl.innerHTML = '<a href="profile.html">Войти</a>';
  }
}

function syncUserToLocal(userData) {
  setCurrentUser(userData);
}

// Обновление времени последней активности пользователя
async function updateLastActive(uid) {
  if (!uid) return;
  try {
    await db.collection('users').doc(uid).update({
      lastActive: Date.now()
    });
  } catch (e) {
    console.error('Ошибка обновления lastActive:', e);
  }
}
