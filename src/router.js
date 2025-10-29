import { renderBoard } from './views/board.js';
import { renderList } from './views/list.js';
import { renderDashboard } from './views/dashboard.js';
import { renderCalendar } from './views/calendar.js';
import { state, updateState } from './state.js';

const routes = {
  '/': renderBoard,
  '/board': renderBoard,
  '/list': renderList,
  '/dashboard': renderDashboard,
  '/calendar': renderCalendar
};

export function initRouter() {
  // Handle initial route
  navigate(window.location.pathname || '/');
  
  // Listen for navigation
  window.addEventListener('popstate', () => {
    navigate(window.location.pathname);
  });
  
  // Intercept link clicks
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-link]')) {
      e.preventDefault();
      navigate(e.target.getAttribute('href'));
    }
  });
}

export function navigate(path) {
  const handler = routes[path] || routes['/'];
  
  // Update state
  const view = path.replace('/', '') || 'board';
  updateState({ currentView: view });
  
  // Update URL
  window.history.pushState({}, '', path);
  
  // Render view
  const container = document.getElementById('view-container');
  container.innerHTML = '';
  handler(container);
  
  // Update active nav items
  updateActiveNav(path);
}

function updateActiveNav(path) {
  document.querySelectorAll('[data-link]').forEach(link => {
    if (link.getAttribute('href') === path) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}
