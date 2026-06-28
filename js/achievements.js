// achievements.js – финальная версия (Firebase, рейтинг, пасхалки, игровые достижения)

const ACHIEVEMENTS = [
  // Общие
  { id: 'first_click', name: 'Первый клик', description: 'Сыграть в любую игру хотя бы раз', icon: '👆', hidden: false,
    condition(user) { return user.points > 0; } },
  { id: 'clicker_master', name: 'Кликер-мастер', description: 'Получить первое начисление баллов в кликере', icon: '🖱️', hidden: false,
    condition(user) { return user.completedGames && user.completedGames.includes('clicker'); } },
  { id: 'avatar_set', name: 'Индивидуальность', description: 'Установить аватар профиля', icon: '🖼️', hidden: true,
    condition(user) { return user.avatar && user.avatar.trim() !== ''; } },
  { id: 'about_me_20', name: 'Расскажи о себе', description: 'Заполнить поле «О себе» (не менее 20 символов)', icon: '📝', hidden: true,
    condition(user) { return user.description && user.description.length >= 20; } },
  { id: 'top10', name: 'В десятке!', description: 'Попасть в Топ-10 рейтинга', icon: '🔟', hidden: false, condition: null },
  { id: 'top3', name: 'Пьедестал', description: 'Попасть в Топ-3 рейтинга', icon: '🏆', hidden: false, condition: null },
  
  // Пасхалки
  { id: 'easter_first', name: 'Пасхалка найдена, есть ещё?', description: 'Найти любую пасхалку', icon: '🥚', hidden: false,
    condition(user) { return user.easterEggsFound && user.easterEggsFound.length > 0; } },
  { id: 'logo_click_5', name: 'Лого-кликер', description: 'Кликнуть 5 раз по логотипу', icon: '🖱️', hidden: true,
    condition(user) { return isEasterEggFound('logo_click_5'); } },
  { id: 'footer_button', name: 'Подвальный житель', description: 'Найти невидимую кнопку в футере', icon: '🔍', hidden: true,
    condition(user) { return isEasterEggFound('footer_button'); } },
  { id: 'secret_symbol', name: 'Секретный символ', description: 'Найти скрытый символ на главной странице', icon: '🔣', hidden: true,
    condition(user) { return isEasterEggFound('secret_symbol'); } },
  { id: 'konami_code', name: 'Konami Code', description: 'Ввести легендарный код', icon: '🎮', hidden: true,
    condition(user) { return isEasterEggFound('konami_code'); } },
  { id: 'secret_word_bonus', name: 'Секретное слово', description: 'Напечатать слово "бонус"', icon: '🔤', hidden: true,
    condition(user) { return isEasterEggFound('secret_word_bonus'); } },

  // Кликер
  { id: 'clicker_100', name: 'Первая сотня', description: 'Сделать 100 кликов в кликере', icon: '💯', hidden: false,
    condition(user) { return user.gameStats?.clicker?.totalClicks >= 100; } },
  { id: 'clicker_1000', name: 'Мышку сломаешь!', description: 'Сделать 1000 кликов в кликере', icon: '🖱️💥', hidden: false,
    condition(user) { return user.gameStats?.clicker?.totalClicks >= 1000; } },

  // Змейка
  { id: 'snake_start', name: 'Ням-ням', description: 'Начать игру в змейку', icon: '🐍', hidden: false,
    condition(user) { return user.gameStats?.snake?.maxScore > 0; } },
  { id: 'snake_self', name: 'Я вкусный', description: 'Врезаться в себя в змейке', icon: '🍩', hidden: true,
    condition(user) { return user.gameStats?.snake?.selfEaten === true; } },
  { id: 'snake_wall', name: 'Ауч!', description: 'Врезаться в стену в змейке', icon: '💥', hidden: true,
    condition(user) { return user.gameStats?.snake?.wallCrash === true; } },
  { id: 'snake_100', name: 'Ньютонова гравитация', description: 'Набрать 100 очков в змейке', icon: '🍎', hidden: false,
    condition(user) { return user.gameStats?.snake?.maxScore >= 100; } },
  { id: 'snake_king', name: 'Змеиный король', description: 'Набрать 200 очков в змейке', icon: '👑', hidden: true,
    condition(user) { return user.gameStats?.snake?.maxScore >= 200; } },

  // Найди пару
  { id: 'memory_first', name: 'Каждой твари по паре', description: 'Открыть первую карту в «Найди пару»', icon: '🐶', hidden: false,
    condition(user) { return user.gameStats?.memory?.openedFirst === true; } },
  { id: 'memory_complete', name: 'Вот и попались', description: 'Пройти «Найди пару» впервые', icon: '🎉', hidden: false,
    condition(user) { return user.gameStats?.memory?.completed === true; } },
  { id: 'memory_photo', name: 'Фотографическая память', description: 'Пройти «Найди пару» ≤12 ходов и ≤30 секунд', icon: '📸', hidden: true,
    condition(user) { 
      const m = user.gameStats?.memory;
      return m?.bestMoves <= 12 && m?.bestTime <= 30;
    } },
  { id: 'memory_perfect', name: 'Идеальная память', description: 'Пройти «Найди пару» ровно за 8 ходов', icon: '🧠', hidden: true,
    condition(user) { return user.gameStats?.memory?.bestMoves === 8; } }
];

function getAchievementsConfig() {
  return ACHIEVEMENTS;
}

// Ранг пользователя по данным из Firestore
async function getUserRankAsync(userId) {
  let users = [];
  try {
    const snapshot = await db.collection('users').get();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.role !== 'admin') {
        users.push({ id: doc.id, points: data.points || 0 });
      }
    });
  } catch (e) {
    console.error('Ошибка загрузки рейтинга:', e);
    return null;
  }
  users.sort((a, b) => b.points - a.points);
  const index = users.findIndex(u => u.id === userId);
  return index === -1 ? null : index + 1;
}

// Проверка и выдача достижений
async function checkAndAwardAchievements(userId) {
  const current = getCurrentUser();
  const uid = userId || (current ? current.uid || current.id : null);
  if (!uid) return;

  let user;
  let users;

  if (typeof auth !== 'undefined' && auth.currentUser) {
    try {
      const doc = await db.collection('users').doc(uid).get();
      if (doc.exists) {
        user = doc.data();
        user.uid = uid;
        if (!user.achievements) user.achievements = [];
        if (!user.completedGames) user.completedGames = [];
        if (!user.easterEggsFound) user.easterEggsFound = [];
        // gameStats уже будет в user
      }
    } catch (e) {
      console.error('Ошибка загрузки пользователя:', e);
      return;
    }
  }

  if (!user) {
    users = getUsers();
    user = users.find(u => u.id == userId);
    if (!user) return;
    if (!user.achievements) user.achievements = [];
    if (!user.completedGames) user.completedGames = [];
    if (!user.easterEggsFound) user.easterEggsFound = [];
  }

  const config = getAchievementsConfig();
  let awardedSomething = false;
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
    } else if (typeof ach.condition === 'function') {
      conditionMet = ach.condition(user, getGames(), users || getUsers());
    }

    if (conditionMet) {
      user.achievements.push(ach.id);
      awardedSomething = true;

      // Отправляем уведомление
      const currentUid = auth.currentUser?.uid || user.uid || user.id;
      if (currentUid && typeof addNotification === 'function') {
        addNotification(currentUid, `🏆 Получено достижение: ${ach.name}!`, '');
      }
      if (!ach.hidden) {
        setTimeout(() => showToast(`🏆 Получено достижение: ${ach.name}!`, 'success'), 200);
      }
    }
  }

  if (awardedSomething) {
    if (typeof auth !== 'undefined' && auth.currentUser) {
      await syncAchievementsToFirestore(user.achievements);
    } else {
      saveUsers(users);
      setCurrentUser(user);
    }
    const localUser = getCurrentUser();
    if (localUser) {
      localUser.achievements = user.achievements;
      localStorage.setItem('krugames_currentUser', JSON.stringify(localUser));
    }
  }
}

function isEasterEggFound(eggId) {
  const user = getCurrentUser();
  if (!user) return false;
  if (!user.easterEggsFound) return false;
  return user.easterEggsFound.includes(eggId);
}
