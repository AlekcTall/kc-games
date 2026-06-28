// js/firebase-auth.js

// ================== АВТОРИЗАЦИЯ ==================

// Регистрация нового пользователя
async function firebaseRegister(email, password, username, department) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    // Создаём документ в Firestore
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
    // Синхронизируем с localStorage
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

// Вход по email/паролю
async function firebaseLogin(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    // Получаем данные из Firestore
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

// Выход
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
    // Обновляем локального пользователя
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

/**
 * Начисляет баллы текущему пользователю
 * @param {number} points - сколько баллов добавить
 * @param {string|null} gameId - идентификатор игры (если есть)
 * @returns {Promise<boolean>}
 */
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

    // Если указана игра, добавляем в completedGames
    if (gameId) {
      const completedGames = data.completedGames || [];
      if (!completedGames.includes(gameId)) {
        completedGames.push(gameId);
        updateData.completedGames = completedGames;
      }
    }

    await userRef.update(updateData);

    // Обновляем локального пользователя
    const current = getCurrentUser();
    if (current) {
      current.points = newPoints;
      if (updateData.completedGames) {
        current.completedGames = updateData.completedGames;
      }
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

// Функция синхронизации данных в localStorage (вызывается после входа)
function syncUserToLocal(userData) {
  setCurrentUser(userData);
}

// Обработчик изменений auth (вызывается из main.js или глобально)
auth.onAuthStateChanged(async (firebaseUser) => {
  if (firebaseUser) {
    // Уже залогинен – актуализируем данные
    try {
      const doc = await db.collection('users').doc(firebaseUser.uid).get();
      if (doc.exists) {
        const data = doc.data();
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
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
      }
    } catch (e) {
      console.error('Ошибка синхронизации при старте:', e);
    }
  } else {
    setCurrentUser(null);
  }
  updateAuthUI(firebaseUser);
});
