// js/effects-engine.js

// Карта обработчиков эффектов
const EFFECT_HANDLERS = {
  // Тёмная тема
  dark_theme: async (userId, params) => {
    await db.collection('users').doc(userId).update({ activeTheme: 'dark' });
    document.body.classList.add('dark-theme');
    return true;
  },

  // Золотая рамка аватара
  gold_frame: async (userId, params) => {
    await db.collection('users').doc(userId).update({
      purchasedItems: firebase.firestore.FieldValue.arrayUnion('gold_frame')
    });
    return true;
  },

  // Анимированный аватар
  animated_avatar: async (userId, params) => {
    await db.collection('users').doc(userId).update({
      purchasedItems: firebase.firestore.FieldValue.arrayUnion('animated_avatar')
    });
    return true;
  },

  // Кастомный статус
  custom_status: async (userId, params) => {
    await db.collection('users').doc(userId).update({
      purchasedItems: firebase.firestore.FieldValue.arrayUnion('custom_status')
    });
    return true;
  },

  // Двойной опыт (временный)
  double_xp: async (userId, params) => {
    const durationHours = params.duration || 1;
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();
    const effects = doc.data().activeEffects || {};
    effects['double_xp'] = {
      activatedAt: Date.now(),
      durationHours
    };
    await userRef.update({ activeEffects: effects });
    return true;
  },

  // Быстрый кулдаун (временный)
  fast_cooldown: async (userId, params) => {
    const durationHours = params.duration || 24;
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();
    const effects = doc.data().activeEffects || {};
    effects['fast_cooldown'] = {
      activatedAt: Date.now(),
      durationHours
    };
    await userRef.update({ activeEffects: effects });
    return true;
  },

  // Звезда в рейтинге
  star_rating: async (userId, params) => {
    await db.collection('users').doc(userId).update({
      purchasedItems: firebase.firestore.FieldValue.arrayUnion('star_rating')
    });
    return true;
  },

  // Возможность ставить 2 реакции
  double_reactions: async (userId, params) => {
    await db.collection('users').doc(userId).update({
      purchasedItems: firebase.firestore.FieldValue.arrayUnion('double_reactions')
    });
    return true;
  },

  // Специальные реакции
  special_reactions: async (userId, params) => {
    await db.collection('users').doc(userId).update({
      purchasedItems: firebase.firestore.FieldValue.arrayUnion('special_reactions')
    });
    return true;
  },

  // Товары с уведомлением админа – просто отмечаем, что нужна обработка,
  // и ничего не делаем с самим пользователем (админ обработает вручную)
  coffee_boss: async (userId, params) => {
    // Никаких автоматических действий, только уведомление админу (уже реализовано в shop.html)
    return true;
  },
  gift_certificate: async (userId, params) => {
    // Аналогично coffee_boss
    return true;
  },
  extra_break: async (userId, params) => {
    return true;
  },
  priority_vacation: async (userId, params) => {
    return true;
  },
  quality_10: async (userId, params) => {
    return true;
  },
  short_shift: async (userId, params) => {
    return true;
  }
};

// Универсальная функция применения эффекта товара
async function applyItemEffect(userId, item) {
  // Поддержка как нового поля effectType, так и старого effect (для обратной совместимости)
  const effectType = item.effectType || item.effect;
  if (!effectType) return false;

  const handler = EFFECT_HANDLERS[effectType];
  if (!handler) {
    console.error('Неизвестный тип эффекта:', effectType);
    return false;
  }

  try {
    // Параметры из товара + длительность, если указана
    const params = {
      ...(item.effectParams || {}),
      duration: item.duration || 0
    };

    await handler(userId, params);
    return true;
  } catch (e) {
    console.error('Ошибка применения эффекта:', e);
    return false;
  }
}

// Получить список доступных типов эффектов (для админки)
function getAvailableEffectTypes() {
  return Object.keys(EFFECT_HANDLERS).map(key => ({
    id: key,
    name: EFFECT_HANDLERS[key].displayName || key
  }));
}