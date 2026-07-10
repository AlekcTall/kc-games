// js/achievements.js

// Кэш достижений
let achievementsCache = [];

// Загрузка достижений из Firestore
async function loadAchievements() {
  try {
    const snap = await db.collection('achievements').get();
    const achievements = [];
    snap.forEach(doc => achievements.push({ id: doc.id, ...doc.data() }));
    if (achievements.length === 0) {
      // Инициализируем дефолтными, если коллекция пуста
      const defaults = getDefaultAchievements();
      for (const ach of defaults) {
        await db.collection('achievements').doc(ach.id).set(ach);
      }
      achievementsCache = defaults;
    } else {
      achievementsCache = achievements;
    }
    return achievementsCache;
  } catch (e) {
    console.error('Ошибка загрузки достижений:', e);
    achievementsCache = getDefaultAchievements();
    return achievementsCache;
  }
}

// Дефолтные достижения
function getDefaultAchievements() {
  return [
    { id: 'first_game', name: 'Первый блин', description: 'Сыграйте в любую игру', icon: '🎮', hidden: false },
    { id: 'clicker_100', name: 'Кликоман', description: 'Наберите 100 кликов в кликере', icon: '🖱️', hidden: false },
    { id: 'clicker_1000', name: 'Мышку сломаешь!', description: 'Наберите 1000 кликов в кликере', icon: '💥🖱️', hidden: false },
    { id: 'snake_start', name: 'Змеелов', description: 'Начните игру в змейку', icon: '🐍', hidden: false },
    { id: 'snake_100', name: 'Удав', description: 'Съешьте 100 яблок в змейке', icon: '🐍', hidden: false },
    { id: 'snake_200', name: 'Анаконда', description: 'Съешьте 200 яблок в змейке', icon: '🐍', hidden: false },
    { id: 'snake_self', name: 'Самоед', description: 'Врежьтесь в себя в змейке', icon: '🐍', hidden: true },
    { id: 'snake_wall', name: 'Ауч!', description: 'Врежьтесь в стену в змейке', icon: '🐍', hidden: true },
    { id: 'memory_first', name: 'Помню', description: 'Откройте первую карту в найди пару', icon: '🧠', hidden: false },
    { id: 'memory_complete', name: 'Идеальная память', description: 'Завершите игру найди пару', icon: '🧠', hidden: false },
    { id: 'memory_12moves', name: 'Эконом', description: 'Найдите все пары за ≤12 ходов', icon: '🧠', hidden: false },
    { id: 'memory_30sec', name: 'Спидран', description: 'Найдите все пары за ≤30 секунд', icon: '🧠', hidden: false },
    { id: 'memory_8moves', name: 'Невозможно!', description: 'Найдите все пары ровно за 8 ходов', icon: '🧠', hidden: true },
    { id: 'profile_bio', name: 'О себе', description: 'Заполните поле «О себе» (минимум 10 символов)', icon: '✏️', hidden: true },
    { id: 'top10', name: 'В десятке', description: 'Попадите в топ‑10 общего рейтинга', icon: '🏆', hidden: false },
    { id: 'top3', name: 'Пьедестал', description: 'Займите 1, 2 или 3 место в рейтинге', icon: '🥇', hidden: false },
    { id: 'easter_logo', name: 'Лого‑кликер', description: 'Найдите пасхалку в логотипе', icon: '🥚', hidden: true },
    { id: 'easter_footer', name: 'Подвал', description: 'Найдите пасхалку в футере', icon: '🥚', hidden: true },
    { id: 'easter_symbol', name: 'Секретный символ', description: 'Найдите секретный символ на главной', icon: '🥚', hidden: true },
    { id: 'easter_konami', name: 'Konami', description: 'Введите Konami Code', icon: '🥚', hidden: true },
    { id: 'easter_word', name: 'Бонус', description: 'Введите секретное слово "бонус"', icon: '🥚', hidden: true },
    { id: '2048_512', name: 'Это только начало', description: 'Соберите плитку 512 в 2048', icon: '🔢', hidden: false },
    { id: '2048_2048', name: 'Вот почему она так называется', description: 'Соберите плитку 2048 в 2048', icon: '🔢', hidden: false },
    { id: '2048_4096', name: 'Прошел?', description: 'Соберите плитку 4096 в 2048', icon: '🔢', hidden: false },
    { id: '2048_8192', name: 'Х4', description: 'Соберите плитку 8192 в 2048', icon: '🔢', hidden: true },
    { id: 'minesweeper_loss', name: 'Одна нога тут, другая там', description: 'Подорвитесь на мине в сапёре', icon: '💣', hidden: false },
    { id: 'minesweeper_win', name: 'Без права на ошибку', description: 'Успешно завершите игру в сапёре', icon: '💣', hidden: false },
    { id: 'minesweeper_speed', name: 'Я скорость', description: 'Завершите сапёра за ≤10 секунд', icon: '💣', hidden: true }
  ];
}

// Конфигурация достижений (кеш)
function getAchievementsConfig() {
  if (!achievementsCache.length) {
    // Синхронный fallback, пока не загружены из Firestore
    return getDefaultAchievements();
  }
  return achievementsCache;
}

// Получение глобальной статистики достижения
async function getAchievementStats(achievementId) {
  try {
    const snap = await db.collection('users').get();
    let total = 0;
    let unlocked = 0;
    snap.forEach(doc => {
      const d = doc.data();
      if (d.role === 'admin') return;
      total++;
      if ((d.achievements || []).includes(achievementId)) unlocked++;
    });
    if (total === 0) return 0;
    return Math.round((unlocked / total) * 100);
  } catch (e) {
    console.error('Ошибка получения статистики достижения:', e);
    return 0;
  }
}

// Асинхронная проверка достижений (без изменений)
async function checkAndAwardAchievements() {
  const user = auth.currentUser;
  if (!user) return;

  const userDoc = await db.collection('users').doc(user.uid).get();
  if (!userDoc.exists) return;
  const data = userDoc.data();
  let unlocked = data.achievements || [];
  const gameStats = data.gameStats || {};
  const gameHistory = data.gameHistory || [];
  const easterEggs = data.easterEggsFound || [];
  const description = data.description || '';

  const config = getAchievementsConfig();
  const newlyUnlocked = [];
  const toRemove = [];

  for (const ach of config) {
    const alreadyUnlocked = unlocked.includes(ach.id);
    let earned = false;

    switch (ach.id) {
      case 'first_game': earned = gameHistory.length > 0; break;
      case 'clicker_100': earned = (gameStats.clicker?.totalClicks || 0) >= 100; break;
      case 'clicker_1000': earned = (gameStats.clicker?.totalClicks || 0) >= 1000; break;
      case 'snake_start': earned = gameStats.snake?.maxScore !== undefined; break;
      case 'snake_100': earned = (gameStats.snake?.maxScore || 0) >= 100; break;
      case 'snake_200': earned = (gameStats.snake?.maxScore || 0) >= 200; break;
      case 'snake_self': earned = gameStats.snake?.selfEaten === true; break;
      case 'snake_wall': earned = gameStats.snake?.wallCrash === true; break;
      case 'memory_first': earned = gameStats.memory?.openedFirst === true; break;
      case 'memory_complete': earned = gameStats.memory?.completed === true; break;
      case 'memory_12moves': earned = gameStats.memory?.completed && gameStats.memory.bestMoves <= 12; break;
      case 'memory_30sec': earned = gameStats.memory?.completed && gameStats.memory.bestTime <= 30; break;
      case 'memory_8moves': earned = gameStats.memory?.completed && gameStats.memory.bestMoves === 8; break;
      case 'profile_bio': earned = description.length >= 10; break;

      case 'top10':
      case 'top3': {
        const snap = await db.collection('users').get();
        const allPlayers = [];
        snap.forEach(doc => {
          const d = doc.data();
          if (d.role !== 'admin') allPlayers.push({ uid: doc.id, points: d.points || 0 });
        });
        allPlayers.sort((a, b) => b.points - a.points);
        const rank = allPlayers.findIndex(p => p.uid === user.uid) + 1;
        if (ach.id === 'top10') {
          earned = (rank > 0 && rank <= 10);
          if (!earned && alreadyUnlocked) toRemove.push(ach.id);
        }
        if (ach.id === 'top3') {
          earned = (rank > 0 && rank <= 3);
          if (!earned && alreadyUnlocked) toRemove.push(ach.id);
        }
        break;
      }

      case 'easter_logo': earned = easterEggs.includes('logo'); break;
      case 'easter_footer': earned = easterEggs.includes('footer'); break;
      case 'easter_symbol': earned = easterEggs.includes('symbol'); break;
      case 'easter_konami': earned = easterEggs.includes('konami'); break;
      case 'easter_word': earned = easterEggs.includes('word'); break;

      case '2048_512': earned = (gameStats['2048']?.maxTile || 0) >= 512; break;
      case '2048_2048': earned = (gameStats['2048']?.maxTile || 0) >= 2048; break;
      case '2048_4096': earned = (gameStats['2048']?.maxTile || 0) >= 4096; break;
      case '2048_8192': earned = (gameStats['2048']?.maxTile || 0) >= 8192; break;

      case 'minesweeper_loss': earned = gameStats.minesweeper?.loss === true; break;
      case 'minesweeper_win': earned = gameStats.minesweeper?.completed === true; break;
      case 'minesweeper_speed': earned = gameStats.minesweeper?.completed && (gameStats.minesweeper.bestTime || 999) <= 10; break;
    }

    if (earned && !alreadyUnlocked) {
      unlocked.push(ach.id);
      newlyUnlocked.push(ach);
    } else if (!earned && alreadyUnlocked && toRemove.includes(ach.id)) {
      // удалим
    }
  }

  if (toRemove.length > 0) {
    unlocked = unlocked.filter(id => !toRemove.includes(id));
  }

  if (newlyUnlocked.length > 0 || toRemove.length > 0) {
    await db.collection('users').doc(user.uid).update({ achievements: unlocked });
    const current = getCurrentUser();
    if (current) {
      current.achievements = unlocked;
      setCurrentUser(current);
    }

    for (const ach of newlyUnlocked) {
      await addNotification(user.uid, `Получено достижение: ${ach.icon} ${ach.name}`, 'achievement', 'profile.html');
    }
  }
}
