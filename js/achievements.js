// achievements.js – конфигурация и логика достижений

const ACHIEVEMENTS = [
  {
    id: 'first_click',
    name: 'Первый клик',
    description: 'Сыграть в любую игру хотя бы раз',
    icon: '👆',
    hidden: false,
    condition(user) {
      return user.points > 0;
    }
  },
  {
    id: 'clicker_master',
    name: 'Кликер-мастер',
    description: 'Пройти игру «Кликер» (набрать 20 очков)',
    icon: '🖱️',
    hidden: false,
    condition(user) {
      return user.completedGames && user.completedGames.includes('clicker');
    }
  },
  {
    id: 'avatar_set',
    name: 'Индивидуальность',
    description: 'Установить аватар профиля',
    icon: '🖼️',
    hidden: true,
    condition(user) {
      return user.avatar && user.avatar.trim() !== '';
    }
  },
  {
    id: 'about_me_20',
    name: 'Расскажи о себе',
    description: 'Заполнить поле «О себе» (не менее 20 символов)',
    icon: '📝',
    hidden: true,
    condition(user) {
      return user.description && user.description.length >= 20;
    }
  },
  {
    id: 'top10',
    name: 'В десятке!',
    description: 'Попасть в Топ-10 рейтинга',
    icon: '🔟',
    hidden: false,
    condition(user, gamesData, allUsers) {
      const rank = getUserRank(user.id, allUsers);
      return rank !== null && rank <= 10;
    }
  },
  {
    id: 'top3',
    name: 'Пьедестал',
    description: 'Попасть в Топ-3 рейтинга',
    icon: '🏆',
    hidden: false,
    condition(user, gamesData, allUsers) {
      const rank = getUserRank(user.id, allUsers);
      return rank !== null && rank <= 3;
    }
  },
  // Пасхальные достижения
  {
    id: 'easter_first',
    name: 'Пасхалка найдена, есть ещё?',
    description: 'Найти любую пасхалку',
    icon: '🥚',
    hidden: false,
    condition(user) {
      return user.easterEggsFound && user.easterEggsFound.length > 0;
    }
  },
  {
    id: 'logo_click_5',
    name: 'Лого-кликер',
    description: 'Кликнуть 5 раз по логотипу',
    icon: '🖱️',
    hidden: true,
    condition(user) {
      return isEasterEggFound('logo_click_5');
    }
  },
  {
    id: 'footer_button',
    name: 'Подвальный житель',
    description: 'Найти невидимую кнопку в футере',
    icon: '🔍',
    hidden: true,
    condition(user) {
      return isEasterEggFound('footer_button');
    }
  },
  {
    id: 'secret_symbol',
    name: 'Секретный символ',
    description: 'Найти скрытый символ на главной странице',
    icon: '🔣',
    hidden: true,
    condition(user) {
      return isEasterEggFound('secret_symbol');
    }
  },
  {
    id: 'konami_code',
    name: 'Konami Code',
    description: 'Ввести легендарный код',
    icon: '🎮',
    hidden: true,
    condition(user) {
      return isEasterEggFound('konami_code');
    }
  },
  {
    id: 'secret_word_bonus',
    name: 'Секретное слово',
    description: 'Напечатать слово "бонус"',
    icon: '🔤',
    hidden: true,
    condition(user) {
      return isEasterEggFound('secret_word_bonus');
    }
  }
];

function getAchievementsConfig() {
  return ACHIEVEMENTS;
}

function getUserRank(userId, users = null) {
  const allUsers = users || getUsers();
  const sorted = allUsers
    .filter(u => u.role !== 'admin')
    .sort((a, b) => b.points - a.points);
  const index = sorted.findIndex(u => u.id == userId);
  return index === -1 ? null : index + 1;
}

// Проверить и выдать все доступные достижения (обновлённая для Firebase)
async function checkAndAwardAchievements(userId) {
  const current = getCurrentUser();
  const uid = userId || (current ? current.uid || current.id : null);
  if (!uid) return;

  let user;
  let users;

  // Если пользователь авторизован через Firebase, загружаем данные из Firestore
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
      console.error('Ошибка загрузки пользователя для достижений:', e);
      return;
    }
  }

  // Если не получилось загрузить из Firestore, ищем в localStorage
  if (!user) {
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

  config.forEach(ach => {
    if (user.achievements.includes(ach.id)) return;
    if (ach.condition(user, allGames, users || getUsers())) {
      user.achievements.push(ach.id);
      awardedSomething = true;
      if (!ach.hidden) {
        setTimeout(() => showToast(`🏆 Получено достижение: ${ach.name}!`, 'success'), 200);
      }
    }
  });

  if (awardedSomething) {
    // Сохраняем в Firestore или localStorage
    if (typeof auth !== 'undefined' && auth.currentUser) {
      await syncAchievementsToFirestore(user.achievements);
    } else {
      // Обновляем в старом массиве пользователей
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

function isEasterEggFound(eggId) {
  const user = getCurrentUser();
  if (!user) return false;
  if (!user.easterEggsFound) return false;
  return user.easterEggsFound.includes(eggId);
}
