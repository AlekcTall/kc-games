// js/easter-eggs.js

// Пасхалки (easter eggs)
// Активируются только для авторизованных пользователей

function initEasterEggs() {
  if (!auth.currentUser) return;

  // 1. Клик по логотипу (3 раза)
  let logoClicks = 0;
  const logo = document.querySelector('.logo');
  if (logo) {
    logo.addEventListener('click', () => {
      logoClicks++;
      if (logoClicks >= 3) {
        logoClicks = 0;
        activateEasterEgg('logo', 'Вы нашли пасхалку в логотипе!');
      }
    });
  }

  // 2. Невидимая кнопка в футере
  const footer = document.querySelector('.footer');
  if (footer) {
    const easterBtn = document.createElement('span');
    easterBtn.className = 'footer-easter-egg';
    easterBtn.textContent = '🥚';
    easterBtn.title = 'Пасхалка';
    footer.querySelector('.container').appendChild(easterBtn);
    easterBtn.addEventListener('click', () => {
      activateEasterEgg('footer', 'Вы нашли пасхалку в подвале!');
    });
  }

  // 3. Секретный символ на главной
  const secretSymbol = document.getElementById('secret-symbol');
  if (secretSymbol) {
    secretSymbol.addEventListener('click', () => {
      activateEasterEgg('symbol', 'Вы нашли секретный символ!');
    });
  }

  // 4. Konami Code
  const konamiSequence = [38,38,40,40,37,39,37,39,66,65];
  let konamiIndex = 0;
  document.addEventListener('keydown', (e) => {
    if (e.keyCode === konamiSequence[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiSequence.length) {
        konamiIndex = 0;
        activateEasterEgg('konami', 'Вы ввели Konami Code!');
      }
    } else {
      konamiIndex = 0;
    }
  });

  // 5. Секретное слово "бонус"
  let typedWord = '';
  document.addEventListener('keydown', (e) => {
    if (e.key.length === 1 && e.key.match(/[a-zA-Zа-яА-Я]/)) {
      typedWord += e.key.toLowerCase();
      if (typedWord.length > 10) typedWord = typedWord.slice(-10);
      if (typedWord.includes('бонус')) {
        typedWord = '';
        activateEasterEgg('word', 'Вы ввели секретное слово "бонус"!');
      }
    }
  });
}

async function activateEasterEgg(eggId, message) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    if (!doc.exists) return;

    const data = doc.data();
    const easterEggs = data.easterEggsFound || [];
    if (easterEggs.includes(eggId)) {
      showToast('Вы уже нашли эту пасхалку!', 'info');
      return;
    }

    // Добавляем пасхалку
    easterEggs.push(eggId);
    await userRef.update({ easterEggsFound: easterEggs });

    // Обновляем кэш
    const current = getCurrentUser();
    if (current) {
      current.easterEggsFound = easterEggs;
      setCurrentUser(current);
    }

    // Начисляем баллы и локоины (если реализовано)
    if (typeof addPointsToCurrentUser === 'function') {
      await addPointsToCurrentUser(5, null); // 5 баллов за пасхалку
    }

    // Отправляем уведомление с типом 'achievement'
    if (typeof addNotification === 'function') {
      await addNotification(user.uid, message, 'achievement', 'profile.html');
    }

    showToast(message + ' +5 баллов!', 'success');

    // Проверяем достижения
    if (typeof checkAndAwardAchievements === 'function') {
      await checkAndAwardAchievements();
    }

  } catch (error) {
    console.error('Ошибка активации пасхалки:', error);
  }
}
