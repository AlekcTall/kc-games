// easter-eggs.js – пасхалки (индивидуальные, с синхронизацией через Firebase)

const EASTER_EGGS = {
  // Проверяет, найдена ли пасхалка текущим пользователем
  isFound(eggId) {
    const user = getCurrentUser();
    if (!user) return false;
    if (!user.easterEggsFound) user.easterEggsFound = [];
    return user.easterEggsFound.includes(eggId);
  },

  // Отмечает пасхалку как найденную и сохраняет в облако + localStorage
  async markFound(eggId) {
    const user = getCurrentUser();
    if (!user) return false;
    if (!user.easterEggsFound) user.easterEggsFound = [];

    // Уже есть – выходим
    if (user.easterEggsFound.includes(eggId)) return false;

    // Добавляем в массив
    user.easterEggsFound.push(eggId);

    // Обновляем локального пользователя
    setCurrentUser(user);

    // Сохраняем в Firestore
    if (typeof syncEasterEggsToFirestore === 'function') {
      await syncEasterEggsToFirestore(user.easterEggsFound);
    }

    return true; // новая пасхалка
  },

  // Начисление баллов + проверка достижений + уведомление
  async award(eggId, points, message) {
    const isNew = await this.markFound(eggId);
    if (!isNew) return; // уже была найдена

    const user = getCurrentUser();
    if (!user) {
      showToast('Войдите в профиль, чтобы получить награду за пасхалку!', 'error');
      return;
    }

    // Начисляем баллы (облачная функция)
    if (typeof addPointsToCurrentUser === 'function') {
      await addPointsToCurrentUser(points, null);
    }

    // Проверяем достижения
    if (typeof checkAndAwardAchievements === 'function') {
      await checkAndAwardAchievements(user.uid || user.id);
    }

    showToast(message || `Пасхалка найдена! +${points} баллов.`, 'info');
  }
};

// ===== ИНИЦИАЛИЗАЦИЯ ВСЕХ ПАСХАЛОК =====
function initEasterEggs() {

  // ----- 1. Пятикратный клик по логотипу -----
  let logoClicks = 0;
  let logoClickTimer = null;
  const logo = document.querySelector('.logo');
  if (logo) {
    logo.addEventListener('click', () => {
      logoClicks++;
      if (logoClickTimer) clearTimeout(logoClickTimer);
      logoClickTimer = setTimeout(() => { logoClicks = 0; }, 1500);

      if (logoClicks >= 5) {
        EASTER_EGGS.award('logo_click_5', 10, '🥚 Лого-кликер! Вы нашли пасхалку: 5 кликов по логотипу.');
        logoClicks = 0;
      }
    });
  }

  // ----- 2. Невидимая кнопка в футере -----
  const footer = document.querySelector('.footer');
  if (footer) {
    const eggBtn = document.createElement('span');
    eggBtn.className = 'footer-easter-egg';
    eggBtn.textContent = '🥚';
    eggBtn.title = 'Нажми меня';
    eggBtn.addEventListener('click', () => {
      EASTER_EGGS.award('footer_button', 15, '🥚 Тайная кнопка футера! Вы нашли пасхалку.');
    });
    const container = footer.querySelector('.container');
    if (container) container.appendChild(eggBtn);
  }

  // ----- 3. Секретный символ на Главной -----
  const secretSymbol = document.getElementById('secret-symbol');
  if (secretSymbol) {
    secretSymbol.addEventListener('click', () => {
      EASTER_EGGS.award('secret_symbol', 15, '🥚 Секретный символ! Вы нашли скрытую пасхалку.');
    });
  }

  // ----- 4. Konami Code -----
  const konamiSequence = [
    'ArrowUp', 'ArrowUp',
    'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight',
    'ArrowLeft', 'ArrowRight',
    'KeyB', 'KeyA'
  ];
  let konamiIndex = 0;
  document.addEventListener('keydown', (e) => {
    if (e.code === konamiSequence[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiSequence.length) {
        EASTER_EGGS.award('konami_code', 20, '🥚 Konami Code! Вы ввели легендарную комбинацию.');
        konamiIndex = 0;
      }
    } else {
      konamiIndex = 0;
    }
  });

  // ----- 5. Секретное слово "бонус" -----
  const secretWord = 'бонус';
  let typedBuffer = '';
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key.length === 1) {
      typedBuffer += e.key.toLowerCase();
      if (typedBuffer.length > secretWord.length) {
        typedBuffer = typedBuffer.slice(-secretWord.length);
      }
      if (typedBuffer === secretWord) {
        EASTER_EGGS.award('secret_word_bonus', 15, '🥚 Секретное слово! Вы напечатали "бонус".');
        typedBuffer = '';
      }
    }
  });
}
