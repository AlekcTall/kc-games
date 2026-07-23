async function firebaseRegister(email, password, username, department) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Сохраняем имя в профиле Auth
    await user.updateProfile({ displayName: username });

    // Отправляем письмо для подтверждения email
    await user.sendEmailVerification();

    // Функция для попытки создания документа с повторными попытками
    const createUserDoc = async () => {
      const userRef = db.collection('users').doc(user.uid);
      await userRef.set({
        username: username,
        email: email,
        department: department,
        points: 0,
        lokoin_balance: 0,
        purchasedItems: [],
        role: 'user',
        description: '',
        achievements: [],
        easterEggsFound: [],
        completedGames: [],
        disabled: false,
        lastActive: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        dailyLogin: {
          lastLoginDate: null,
          streak: 0,
          longestStreak: 0,
          totalLogins: 0,
          loginHistory: []
        },
        activeEffects: {}
      });
      return userRef.get();
    };

    // Пытаемся создать документ несколько раз с задержкой
    let doc = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        doc = await createUserDoc();
        if (doc.exists) break;
      } catch (err) {
        console.error(`Попытка ${attempt + 1} создания документа провалилась:`, err);
      }
      if (attempt < 4) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!doc || !doc.exists) {
      // Если документ так и не создался, удаляем пользователя из Auth и показываем ошибку
      await user.delete();
      throw new Error('Не удалось создать профиль после нескольких попыток. Обратитесь к администратору.');
    }

    const userData = {
      uid: user.uid, email: email, username: username, department: department,
      points: 0, lokoin_balance: 0, purchasedItems: [], role: 'user',
      description: '', achievements: [], easterEggsFound: [], completedGames: [],
      disabled: false, dailyLogin: { lastLoginDate: null, streak: 0, longestStreak: 0, totalLogins: 0, loginHistory: [] },
      activeEffects: {}
    };
    setCurrentUser(userData);
    updateAuthUI(user);
    return userData;
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    throw error;
  }
}
