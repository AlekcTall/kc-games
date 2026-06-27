// storage.js – работа с localStorage (и Firebase-интеграция)

const STORAGE_KEYS = {
  USERS: 'krugames_users',
  CURRENT_USER: 'krugames_currentUser'
};

// ===== ПОЛЬЗОВАТЕЛИ (старые функции для совместимости) =====

function getUsers() {
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  return data ? JSON.parse(data) : [];
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

function getCurrentUser() {
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
}

function setCurrentUser(user) {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
}

function logoutCurrentUser() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

function isLoggedIn() {
  return getCurrentUser() !== null;
}

// Регистрация (старая, не используется при Firebase)
function registerUser(username, password, department) {
  const users = getUsers();
  if (users.find(u => u.username === username)) {
    return false;
  }
  const newUser = {
    id: Date.now(),
    username,
    password,
    avatar: '',
    description: '',
    points: 0,
    role: 'user',
    achievements: [],
    completedGames: [],
    department: department || ''
  };
  users.push(newUser);
  saveUsers(users);
  return true;
}

// Вход (старый)
function loginUser(username, password) {
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    if (!user.achievements) user.achievements = [];
    if (!user.completedGames) user.completedGames = [];
    if (!user.department) user.department = '';
    if (!user.easterEggsFound) user.easterEggsFound = [];
    saveUsers(users);
    setCurrentUser(user);
    return user;
  }
  return null;
}

// Инициализация пользователя по умолчанию (админ)
function initDefaultUsers() {
  const users = getUsers();
  if (users.length === 0) {
    const admin = {
      id: 1,
      username: 'admin',
      password: 'admin123',
      avatar: '',
      description: 'Главный администратор',
      points: 0,
      role: 'admin',
      achievements: [],
      completedGames: [],
      department: ''
    };
    users.push(admin);
    saveUsers(users);
  }
}
initDefaultUsers();

// ===== ИГРЫ =====
const STORAGE_GAMES_KEY = 'krugames_games';

function getGames() {
  const data = localStorage.getItem(STORAGE_GAMES_KEY);
  return data ? JSON.parse(data) : [];
}

function saveGames(games) {
  localStorage.setItem(STORAGE_GAMES_KEY, JSON.stringify(games));
}

function initDefaultGames() {
  const games = getGames();
  if (games.length === 0) {
    const defaultGames = [
      {
        id: 'clicker',
        title: 'Кликер',
        description: 'Нажимай на кнопку, зарабатывай баллы за скорость.',
        icon: '🖱️',
        url: 'games/clicker.html',
        points: 10
      },
      {
        id: 'memory',
        title: 'Найди пару',
        description: 'Карточная игра на память. Находи пары одинаковых карт.',
        icon: '🧠',
        url: 'games/memory.html',
        points: 20
      },
      {
        id: 'snake',
        title: 'Змейка',
        description: 'Классическая змейка. Собери всю еду и не врежься в хвост.',
        icon: '🐍',
        url: 'games/snake.html',
        points: 15
      }
    ];
    saveGames(defaultGames);
  }
}
initDefaultGames();

// ===== НАЧИСЛЕНИЕ БАЛЛОВ (ОБНОВЛЁННАЯ) =====
async function addPointsToCurrentUser(points, gameId = null) {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  // Если пользователь из Firebase (есть uid и авторизован), обновляем облако
  if (currentUser.uid && typeof auth !== 'undefined' && auth.currentUser) {
    try {
      if (gameId) {
        await syncCompletedGame(gameId, points);
      } else {
        await syncPointsToFirestore(points);
      }
      // Проверяем достижения (после обновления баллов)
      if (typeof checkAndAwardAchievements === 'function') {
        checkAndAwardAchievements(currentUser.uid);
      }
      return true;
    } catch (error) {
      console.error('Ошибка начисления баллов через Firebase:', error);
      return false;
    }
  } else {
    // Старый код для localStorage (если пользователь не из Firebase)
    const users = getUsers();
    const user = users.find(u => u.id === currentUser.id);
    if (user) {
      if (!user.achievements) user.achievements = [];
      if (!user.completedGames) user.completedGames = [];
      user.points = (user.points || 0) + points;
      if (gameId && !user.completedGames.includes(gameId)) {
        user.completedGames.push(gameId);
      }
      saveUsers(users);
      setCurrentUser(user);
      if (typeof checkAndAwardAchievements === 'function') {
        checkAndAwardAchievements(user.id);
      }
      return true;
    }
    return false;
  }
}
