// js/storage.js

// ================== ИГРЫ (localStorage) ==================
function getGames() {
  const data = localStorage.getItem('krugames_games');
  return data ? JSON.parse(data) : [];
}

function saveGames(games) {
  localStorage.setItem('krugames_games', JSON.stringify(games));
}

// ================== ПОЛЬЗОВАТЕЛИ (localStorage – резерв) ==================
function getUsers() {
  const data = localStorage.getItem('krugames_users');
  return data ? JSON.parse(data) : [];
}

function saveUsers(users) {
  localStorage.setItem('krugames_users', JSON.stringify(users));
}

// ================== ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ (кеш) ==================
function getCurrentUser() {
  const data = localStorage.getItem('krugames_currentUser');
  return data ? JSON.parse(data) : null;
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('krugames_currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('krugames_currentUser');
  }
}
