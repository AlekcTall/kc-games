// firebase-auth.js — работа с Firebase Auth и Firestore

const auth = firebase.auth();
const db = firebase.firestore();

// ====== Регистрация пользователя ======
async function firebaseRegister(email, password, username, department) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    await db.collection('users').doc(user.uid).set({
      email: email,
      username: username,
      department: department,
      avatar: '',
      description: '',
      points: 0,
      role: 'user',
      achievements: [],
      completedGames: [],
      easterEggsFound: []
    });

    return {
      uid: user.uid,
      email: email,
      username: username,
      department: department,
      avatar: '',
      description: '',
      points: 0,
      role: 'user',
      achievements: [],
      completedGames: [],
      easterEggsFound: []
    };
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    throw error;
  }
}

// ====== Вход ======
async function firebaseLogin(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    const doc = await db.collection('users').doc(user.uid).get();
    if (doc.exists) {
      const data = doc.data();
      return {
        uid: user.uid,
        email: data.email,
        username: data.username,
        department: data.department,
        avatar: data.avatar || '',
        description: data.description || '',
        points: data.points || 0,
        role: data.role || 'user',
        achievements: data.achievements || [],
        completedGames: data.completedGames || [],
        easterEggsFound: data.easterEggsFound || []
      };
    } else {
      const defaultData = {
        email: email,
        username: email.split('@')[0],
        department: '',
        avatar: '',
        description: '',
        points: 0,
        role: 'user',
        achievements: [],
        completedGames: [],
        easterEggsFound: []
      };
      await db.collection('users').doc(user.uid).set(defaultData);
      return { uid: user.uid, ...defaultData };
    }
  } catch (error) {
    console.error('Ошибка входа:', error);
    throw error;
  }
}

// ====== Выход ======
async function firebaseLogout() {
  await auth.signOut();
  logoutCurrentUser();
  localStorage.removeItem('krugames_currentUser');
}

// ====== Обновление профиля в Firestore ======
async function firebaseUpdateProfile(uid, data) {
  try {
    await db.collection('users').doc(uid).update(data);
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    throw error;
  }
}

// ====== Синхронизация: загрузить данные из Firestore в localStorage ======
async function syncUserToLocal(userData) {
  const localUser = {
    id: userData.uid,
    uid: userData.uid,
    username: userData.username,
    email: userData.email,
    department: userData.department,
    avatar: userData.avatar,
    description: userData.description,
    points: userData.points,
    role: userData.role,
    achievements: userData.achievements,
    completedGames: userData.completedGames,
    easterEggsFound: userData.easterEggsFound,
    password: ''
  };
  localStorage.setItem('krugames_currentUser', JSON.stringify(localUser));
}

// ====== Обновить баллы в Firestore и в localStorage ======
async function syncPointsToFirestore(points) {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    const userRef = db.collection('users').doc(user.uid);
    await userRef.update({ points: firebase.firestore.FieldValue.increment(points) });
    const doc = await userRef.get();
    const newPoints = doc.data().points;
    let currentUser = getCurrentUser();
    if (currentUser) {
      currentUser.points = newPoints;
      localStorage.setItem('krugames_currentUser', JSON.stringify(currentUser));
    }
    return true;
  } catch (error) {
    console.error('Ошибка обновления баллов:', error);
    return false;
  }
}

// ====== Сохранить завершённую игру ======
async function syncCompletedGame(gameId, points) {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    const userRef = db.collection('users').doc(user.uid);
    await userRef.update({
      completedGames: firebase.firestore.FieldValue.arrayUnion(gameId),
      points: firebase.firestore.FieldValue.increment(points)
    });
    let currentUser = getCurrentUser();
    if (currentUser) {
      if (!currentUser.completedGames) currentUser.completedGames = [];
      if (!currentUser.completedGames.includes(gameId)) {
        currentUser.completedGames.push(gameId);
      }
      currentUser.points = (currentUser.points || 0) + points;
      localStorage.setItem('krugames_currentUser', JSON.stringify(currentUser));
    }
    return true;
  } catch (error) {
    console.error('Ошибка сохранения игры:', error);
    return false;
  }
}

// ====== Сохранить достижения ======
async function syncAchievementsToFirestore(achievements) {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    const userRef = db.collection('users').doc(user.uid);
    await userRef.update({ achievements: achievements });
    let currentUser = getCurrentUser();
    if (currentUser) {
      currentUser.achievements = achievements;
      localStorage.setItem('krugames_currentUser', JSON.stringify(currentUser));
    }
    return true;
  } catch (error) {
    console.error('Ошибка сохранения достижений:', error);
    return false;
  }
}

// ====== Сохранить пасхалки ======
async function syncEasterEggsToFirestore(eggs) {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    const userRef = db.collection('users').doc(user.uid);
    await userRef.update({ easterEggsFound: eggs });
    let currentUser = getCurrentUser();
    if (currentUser) {
      currentUser.easterEggsFound = eggs;
      localStorage.setItem('krugames_currentUser', JSON.stringify(currentUser));
    }
    return true;
  } catch (error) {
    console.error('Ошибка сохранения пасхалок:', error);
    return false;
  }
}

// ====== Слушатель состояния авторизации ======
function initFirebaseAuthListener() {
  auth.onAuthStateChanged(async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const doc = await db.collection('users').doc(firebaseUser.uid).get();
        if (doc.exists) {
          const userData = doc.data();
          const fullUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            ...userData
          };
          await syncUserToLocal(fullUser);
          if (window.updateAuthUI) updateAuthUI();
        }
      } catch (e) {
        console.error('Ошибка синхронизации:', e);
      }
    } else {
      logoutCurrentUser();
      localStorage.removeItem('krugames_currentUser');
      if (window.updateAuthUI) updateAuthUI();
    }
  });
}
