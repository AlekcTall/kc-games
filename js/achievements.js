// achievements.js – конфигурация и логика достижений (Firebase-совместимая)

const ACHIEVEMENTS = [
  // ... все старые объекты достижений без изменений ...
  {
    id: 'top10',
    name: 'В десятке!',
    description: 'Попасть в Топ-10 рейтинга',
    icon: '🔟',
    hidden: false,
    // Условие теперь асинхронное, проверяется в checkAndAwardAchievements
    condition: null
  },
  {
    id: 'top3',
    name: 'Пьедестал',
    description: 'Попасть в Топ-3 рейтинга',
    icon: '🏆',
    hidden: false,
    condition: null
  },
  // ... остальные ...
];

// Получить конфиг
function getAchievementsConfig() {
  return ACHIEVEMENTS;
}

// Получить место пользователя по данным из Firestore (или из массива)
async function getUserRankAsync(userId) {
  let users = [];
  try {
    // Загружаем всех пользователей из Firestore
    const snapshot = await db.collection('users').get();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.role !== 'admin') { // исключаем админов
        users.push({
          id: doc.id,
          points: data.points || 0
        });
      }
    });
  } catch (e) {
    console.error('Ошибка загрузки рейтинга для достижений:', e);
    return null;
  }
  // Сортируем по убыванию баллов
  users.sort((a, b) => b.points - a.points);
  const index = users.findIndex(u => u.id === userId);
  return index === -1 ? null : index + 1;
}

// Проверить и выдать все доступные достижения (обновлённая)
async function checkAndAwardAchievements(userId) {
  const current = getCurrentUser();
  const uid = userId || (current ? current.uid || current.id : null);
  if (!uid) return;

  let user;
  let users;

  // Пытаемся загрузить из Firestore
  if (typeof auth !== 'undefined' && auth.currentUser) {
    try {
      const doc = await db.collection('users').doc(uid).get();
      if (doc.exists) {
        user = doc.data();
        user.uid = uid;
        if (!user.achievements) user.achievements = [];
        if (!user.completedGames) user.completedGames = [];
        if (!user.easterEggsFound) user.easterEggsFound = [];
      }
    } catch (e) {
      console.error('Ошибка загрузки пользователя:', e);
      return;
    }
  }

  if (!user) {
    // fallback на localStorage (для старых не-Firebase пользователей)
    users = getUsers();
    user = users.find(u => u.id == userId);
    if (!user) return;
    if (!user.achievements) user.achievements = [];
    if (!user.completedGames) user.completedGames = [];
    if (!user.easterEggsFound) user.easterEggsFound = [];
  }

  const allGames = getGames();
  const config = getAchievementsConfig();
  let awardedSomething = false;

  // Для рейтинговых достижений вычисляем ранг, если ещё не получены
  let rank = null;
  if (!user.achievements.includes('top10') || !user.achievements.includes('top3')) {
    rank = await getUserRankAsync(uid);
  }

  for (const ach of config) {
    if (user.achievements.includes(ach.id)) continue;
    let conditionMet = false;

    if (ach.id === 'top10') {
      conditionMet = rank !== null && rank <= 10;
    } else if (ach.id === 'top3') {
      conditionMet = rank !== null && rank <= 3;
    } else if (ach.condition) {
      conditionMet = ach.condition(user, allGames, users || getUsers());
    }

    if (conditionMet) {
      user.achievements.push(ach.id);
      awardedSomething = true;
      if (!ach.hidden) {
        setTimeout(() => showToast(`🏆 Получено достижение: ${ach.name}!`, 'success'), 200);
      }
    }
  }

  if (awardedSomething) {
    // Сохраняем
    if (typeof auth !== 'undefined' && auth.currentUser) {
      await syncAchievementsToFirestore(user.achievements);
    } else {
      saveUsers(users);
      setCurrentUser(user);
    }
    // Обновляем локального пользователя
    const localUser = getCurrentUser();
    if (localUser) {
      localUser.achievements = user.achievements;
      localStorage.setItem('krugames_currentUser', JSON.stringify(localUser));
    }
  }
}

// Старая функция getUserRank (для совместимости)
function getUserRank(userId, users = null) {
  const allUsers = users || getUsers();
  const sorted = allUsers
    .filter(u => u.role !== 'admin')
    .sort((a, b) => b.points - a.points);
  const index = sorted.findIndex(u => u.id == userId);
  return index === -1 ? null : index + 1;
}

// Проверка пасхалок
function isEasterEggFound(eggId) {
  const user = getCurrentUser();
  if (!user) return false;
  if (!user.easterEggsFound) return false;
  return user.easterEggsFound.includes(eggId);
}
