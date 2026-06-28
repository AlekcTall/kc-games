// js/firebase-auth.js

// Инициализация глобальных переменных
const auth = firebase.auth();
const db = firebase.firestore();

// ================== АВТОРИЗАЦИЯ ==================

async function firebaseRegister(email, password, username, department) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    await db.collection('users').doc(user.uid).set({
      username: username,
      email: email,
      department: department,
      points: 0,
      role: 'user',
      description: '',
      achievements: [],
      easterEggsFound: [],
      completedGames: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    const userData = {
      uid: user.uid,
      email: email,
      username: username,
      department: department,
      points: 0,
      role: 'user',
      description: '',
      achievements: [],
      easterEggsFound: [],
      completedGames: []
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
    const doc = await db.collection('users').doc(user.uid).get();
    if (doc.exists) {
      const data = doc.data();
      const userData = {
        uid: user.uid,
        email: user.email,
        username: data.username,
        department: data.department,
        points: data.points || 0,
        role: data.role || 'user',
        description: data.description || '',
        achievements: data.achievements || [],
        easterEggsFound: data.easterEggsFound || [],
        completedGames: data.completedGames || []
      };
      setCurrentUser(userData);
      updateAuthUI(user);
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

// ================== НАЧИСЛЕНИЕ БАЛЛОВ ==================

async function addPointsToCurrentUser(points, gameId = null) {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    if (!doc.exists) return false;
    const data = doc.data();
    const newPoints = (data.points || 0) + points;
    const updateData = { points: newPoints };
    if (gameId) {
      const completedGames = data.completedGames || [];
      if (!completedGames.includes(gameId)) {
        completedGames.push(gameId);
        updateData.completedGames = completedGames;
      }
      // Добавляем запись в историю
      const gameHistory = data.gameHistory || [];
      gameHistory.push({
        game: gameId,
        points: points,
        timestamp: Date.now()
      });
      updateData.gameHistory = gameHistory;
    }
    await userRef.update(updateData);
    const current = getCurrentUser();
    if (current) {
      current.points = newPoints;
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
      merged.bestMoves = currentStats.bestMoves ? Math.min(currentStats.bestMoves, stats.bestMoves) : stats.bestMoves;
    }
    if (stats.bestTime !== undefined) {
      merged.bestTime = currentStats.bestTime ? Math.min(currentStats.bestTime, stats.bestTime) : stats.bestTime;
    }
    if (stats.selfEaten) merged.selfEaten = true;
    if (stats.wallCrash) merged.wallCrash = true;
    if (stats.openedFirst) merged.openedFirst = true;
    if (stats.completed) merged.completed = true;
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
    statusEl.innerHTML = `👤 ${name} | <a href="#" id="logout-link">Выйти</a>`;
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
