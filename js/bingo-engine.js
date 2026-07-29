// js/bingo-engine.js

/**
 * Получить все активные ивенты типа "bingo"
 */
async function getActiveBingoEvents() {
  try {
    const snap = await db.collection('events')
      .where('type', '==', 'bingo')
      .where('status', '==', 'active')
      .get();
    const events = [];
    snap.forEach(doc => events.push({ id: doc.id, ...doc.data() }));
    return events;
  } catch (e) {
    console.error('Ошибка загрузки бинго-ивентов:', e);
    return [];
  }
}

/**
 * Сгенерировать случайную карточку 5x5 для игрока из пула заданий
 */
function generateCard(userId, tasks) {
  if (!tasks || tasks.length < 25) {
    console.error('Недостаточно заданий для генерации карточки 5x5');
    return [];
  }
  // Перемешиваем массив заданий (Фишер-Йетс)
  const shuffled = [...tasks];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // Берём первые 25
  return shuffled.slice(0, 25).map(task => ({ id: task.id }));
}

/**
 * Проверить, соответствует ли действие конкретному заданию
 */
async function checkBingoTask(taskDef, actionType, actionData, userId) {
  switch (taskDef.type) {
    case 'game_sessions':
      // actionType === 'game_played', actionData = { gameId, points }
      return actionType === 'game_played' && actionData.gameId === taskDef.params.gameId;
      
    case 'game_points':
      // actionType === 'game_played', actionData = { gameId, points }
      return actionType === 'game_played' && 
             actionData.gameId === taskDef.params.gameId && 
             actionData.points >= taskDef.params.points;
      
    case 'purchase_any':
      // actionType === 'purchase', actionData = { itemId, category }
      return actionType === 'purchase';
      
    case 'purchase_category':
      // actionType === 'purchase', actionData = { itemId, category }
      return actionType === 'purchase' && actionData.category === taskDef.params.category;
      
    case 'daily_login_streak':
      // actionType === 'daily_login', actionData = { streak }
      return actionType === 'daily_login' && actionData.streak >= taskDef.params.streak;
      
    case 'achievement_any':
      // actionType === 'achievement', actionData = { achievementId }
      return actionType === 'achievement';
      
    case 'total_points':
      // actionType === 'points_changed', actionData = { totalPoints }
      return actionType === 'points_changed' && actionData.totalPoints >= taskDef.params.points;
      
    default:
      return false;
  }
}

/**
 * Обновить прогресс бинго при совершении действия
 * Вызывается извне: firebase-auth.js, shop.html, achievements.js
 */
async function updateBingoProgress(userId, actionType, actionData) {
  if (!userId || !auth.currentUser) return;
  
  try {
    const events = await getActiveBingoEvents();
    if (!events.length) return;
    
    for (const event of events) {
      // Получаем данные участника
      const participants = event.participants || {};
      let playerData = participants[userId];
      
      // Если у игрока ещё нет карточки — генерируем
      if (!playerData || !playerData.card || playerData.card.length === 0) {
        const tasksSnap = await db.collection('events').doc(event.id).collection('tasks').get();
        const tasks = [];
        tasksSnap.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
        
        if (tasks.length < 25) {
          console.warn(`Недостаточно заданий для бинго ${event.id}`);
          continue;
        }
        
        const card = generateCard(userId, tasks);
        playerData = {
          card,
          progress: {},
          cardCompleted: false,
          completedLines: 0
        };
      }
      
      // Если карточка уже заполнена — пропускаем
      if (playerData.cardCompleted) continue;
      
      // Проверяем каждую невыполненную ячейку
      let changed = false;
      const progress = playerData.progress || {};
      const card = playerData.card;
      
      for (const cell of card) {
        if (progress[cell.id]) continue; // уже выполнено
        
        // Получаем определение задания из подколлекции tasks
        // (можно закешировать, но для простоты будем читать каждый раз)
        const taskDoc = await db.collection('events').doc(event.id).collection('tasks').doc(cell.id).get();
        if (!taskDoc.exists) continue;
        
        const taskDef = taskDoc.data();
        const completed = await checkBingoTask(taskDef, actionType, actionData, userId);
        
        if (completed) {
          progress[cell.id] = true;
          changed = true;
        }
      }
      
      if (!changed) continue;
      
      // Проверяем, заполнена ли вся карточка
      const completedCount = Object.keys(progress).length;
      const totalCells = card.length;
      const cardCompleted = completedCount >= totalCells;
      
      const updateData = {
        [`participants.${userId}.progress`]: progress,
        [`participants.${userId}.cardCompleted`]: cardCompleted
      };
      
      await db.collection('events').doc(event.id).update(updateData);
      
      // Отправляем уведомление о прогрессе
      if (typeof addNotification === 'function') {
        await addNotification(
          userId,
          `🎯 Бинго: выполнено ${completedCount}/${totalCells} заданий`,
          'game',
          `events/bingo.html?id=${event.id}`
        );
      }
      
      // Если карточка заполнена — выдаём награду
      if (cardCompleted) {
        const rewardLokoin = event.settings?.rewardLokoin || 50;
        if (rewardLokoin > 0) {
          await db.collection('users').doc(userId).update({
            lokoin_balance: firebase.firestore.FieldValue.increment(rewardLokoin)
          });
          // Обновляем кеш
          const current = getCurrentUser();
          if (current) {
            current.lokoin_balance = (current.lokoin_balance || 0) + rewardLokoin;
            setCurrentUser(current);
          }
        }
        
        if (typeof addNotification === 'function') {
          await addNotification(
            userId,
            `🎉 Бинго! Вы заполнили всю карточку в ивенте «${event.title}» и получили ${rewardLokoin} локоинов!`,
            'achievement',
            `events/bingo.html?id=${event.id}`
          );
        }
        
        if (typeof showToast === 'function') {
          showToast(`🎉 Бинго! +${rewardLokoin} локоинов`, 'success');
        }
      }
    }
  } catch (e) {
    console.error('Ошибка обновления прогресса бинго:', e);
  }
}