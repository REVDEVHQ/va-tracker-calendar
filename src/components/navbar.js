import { state } from '../state.js';
import { logout } from '../utils/supabase.js';

export function renderNavbar() {
  const navbar = document.getElementById('navbar');
  
  navbar.innerHTML = `
    <div class="navbar-content">
      <div class="navbar-left">
        <h1 class="logo">RevDevHQ VA Tracker</h1>
        <div class="view-tabs">
          <a href="/board" data-link class="tab-link">Board</a>
          <a href="/list" data-link class="tab-link">List</a>
          <a href="/dashboard" data-link class="tab-link">Dashboard</a>
          <a href="/calendar" data-link class="tab-link">Calendar</a>
        </div>
      </div>
      
      <div class="navbar-right">
        <span class="user-badge ${state.currentUser?.role}">
          ${state.currentUser?.name} (${state.currentUser?.role.toUpperCase()})
        </span>
        <button id="logout-btn" class="btn-secondary">Logout</button>
      </div>
    </div>
  `;
  
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await logout();
    location.reload();
  });
}
