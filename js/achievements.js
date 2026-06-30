// js/achievements.js

// Конфигурация достижений
function getAchievementsConfig() {
  return [
    { id: 'first_game', name: 'Первый блин', description: 'Сыграйте в любую игру', icon: '🎮', hidden: false },
    { id: 'clicker_100', name: 'Кликоман', description: 'Наберите 100 кликов в кликере', icon: '🖱️', hidden: false },
    { id: 'clicker_1000', name: 'Кликераст', description: 'Наберите 1000 кликов в кликере', icon: '🖱️', hidden: false },
    { id: 'snake_start', name: 'Змеелов', description: 'Начните игру в змейку', icon: '🐍', hidden: false },
    { id: 'snake_100', name: 'Удав', description: 'Съешьте 100 яблок в змейке', icon: '🐍', hidden: false },
    { id: 'snake_200', name: 'Анаконда', description: 'Съешьте 200 яблок в змейке', icon: '🐍', hidden: false },
    { id: 'snake_self', name: 'Самоед', description: 'Врежьтесь в себя в змейке', icon: '🐍', hidden: true },
    { id: 'snake_wall', name: 'Стенолаз', description: 'Врежьтесь в стену в змейке', icon: '🐍', hidden: true },
    { id: 'memory_first', name: 'Помню', description: 'Откройте первую карту в найди пару', icon: '🧠', hidden: false },
    { id: 'memory_complete', name: 'Идеальная память', description: 'Завершите игру найди пару', icon: '🧠', hidden: false },
    { id: 'memory_12moves', name: 'Эконом', description: 'Найдите все пары за ≤12 ходов', icon: '🧠', hidden: false },
    { id: 'memory_30sec', name: 'Спидран', description: 'Найдите все пары за ≤30 секунд', icon: '🧠', hidden: false },
    { id: 'memory_8moves', name: 'Гроссмейстер', description: 'Найдите все пары ровно за 8 ходов', icon: '🧠', hidden: true },
    { id: 'top10', name: 'В десятке', description: 'Попадите в топ‑10 общего рейтинга', icon: '🏆', hidden: false },
    { id: 'top3', name: 'Пьедестал', description: 'Займите 1, 2 или 3 место в рейтинге', icon: '🥇', hidden: false },
    { id: 'easter_logo', name: 'Лого‑кликер', description: 'Найдите пасхалку в логотипе', icon: '🥚', hidden: true },
    { id: 'easter_footer', name: 'Подвал', description: 'Найдите пасхалку в футере', icon: '🥚', hidden: true },
    { id: 'easter_symbol', name: 'Секретный символ', description: 'Найдите секретный символ на главной', icon: '🥚', hidden: true },
    { id: 'easter_konami', name: 'Konami', description: 'Введите Konami Code', icon: '🥚', hidden: true },
    { id: 'easter_word', name: 'Бонус', description: 'Введите секретное слово "бонус"', icon: '🥚', hidden: true }
  ];
}

// Асинхронная проверка достижений
async function checkAndAwardAchievements() {
  const user = auth.currentUser;
  if (!user) return;

  const userDoc = await db.collection('users').doc(user.uid).get();
  if (!userDoc.exists) return;
  const data = userDoc.data();
  const unlocked = data.achievements || [];
  const gameStats = data.gameStats || {};
  const gameHistory = data.gameHistory || [];
  const easterEggs = data.easterEggsFound || [];
  const points = data.points || 0;

  const config = getAchievementsConfig();
  const newlyUnlocked = [];

  // Проверяем каждое достижение
  for (const ach of config) {
    if (unlocked.includes(ach.id)) continue;

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
      case 'top10':
      case 'top3': {
        // Проверка рейтинга через запрос всех пользователей
        const snap = await db.collection('users').get();
        const allPlayers = [];
        snap.forEach(doc => {
          const d = doc.data();
          if (d.role !== 'admin') allPlayers.push({ uid: doc.id, points: d.points || 0 });
        });
        allPlayers.sort((a, b) => b.points - a.points);
        const rank = allPlayers.findIndex(p => p.uid === user.uid) + 1;
        if (rank > 0 && rank <= 10) earned = true; // top10
        if (rank > 0 && rank <= 3 && ach.id === 'top3') earned = true;
        break;
      }
      case 'easter_logo': earned = easterEggs.includes('logo'); break;
      case 'easter_footer': earned = easterEggs.includes('footer'); break;
      case 'easter_symbol': earned = easterEggs.includes('symbol'); break;
      case 'easter_konami': earned = easterEggs.includes('konami'); break;
      case 'easter_word': earned = easterEggs.includes('word'); break;
    }

    if (earned) {
      unlocked.push(ach.id);
      newlyUnlocked.push(ach);
    }
  }

  if (newlyUnlocked.length > 0) {
    // Сохраняем в Firestore
    await db.collection('users').doc(user.uid).update({ achievements: unlocked });
    // Локальный кэш
    const current = getCurrentUser();
    if (current) {
      current.achievements = unlocked;
      setCurrentUser(current);
    }

    // Отправляем уведомления с типом 'achievement'
    for (const ach of newlyUnlocked) {
      await addNotification(user.uid, `Получено достижение: ${ach.icon} ${ach.name}`, 'achievement', 'profile.html');
    }
  }
}
