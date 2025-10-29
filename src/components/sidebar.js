import { state, updateState, subscribe } from '../state.js';

export function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  
  const isAdmin = state.currentUser?.role === 'admin';
  
  sidebar.innerHTML = `
    <div class="sidebar-content">
      <div class="sidebar-section">
        <h3>Projects</h3>
        <ul class="sidebar-menu">
          <li><a href="/board" data-link>Tasks</a></li>
          <li><a href="/dashboard" data-link>Dashboard</a></li>
          <li><a href="/board" data-link>Board View</a></li>
          <li><a href="/calendar" data-link>📅 Calendar</a></li>
          <li class="disabled">Gantt <span class="badge">Soon</span></li>
        </ul>
      </div>
      
      <div class="sidebar-section">
        <h3>Filters</h3>
        
        ${isAdmin ? `
        <div class="filter-group">
          <label>Assignee</label>
          <select id="filter-assignee">
            <option value="all">All</option>
            <option value="1">Jay</option>
            <option value="2">Andres</option>
          </select>
        </div>
        ` : ''}
        
        <div class="filter-group">
          <label>Status</label>
          <div class="checkbox-group">
            <label><input type="checkbox" value="todo" checked> To Do</label>
            <label><input type="checkbox" value="doing" checked> Doing</label>
            <label><input type="checkbox" value="review" checked> Review</label>
            <label><input type="checkbox" value="done" checked> Done</label>
          </div>
        </div>
        
        <div class="filter-group">
          <label>Priority</label>
          <div class="checkbox-group">
            <label><input type="checkbox" value="low" checked> Low</label>
            <label><input type="checkbox" value="normal" checked> Normal</label>
            <label><input type="checkbox" value="high" checked> High</label>
            <label><input type="checkbox" value="urgent" checked> Urgent</label>
          </div>
        </div>
        
        <button id="reset-filters" class="btn-text">Reset Filters</button>
      </div>
      
      ${isAdmin ? `
      <div class="sidebar-section">
        <h3>Settings</h3>
        <div class="setting-item">
          <label>Hourly Rate: $<span id="rate-value">${state.settings.hourlyRate}</span></label>
          <input type="range" id="hourly-rate" min="1" max="50" value="${state.settings.hourlyRate}" />
        </div>
        <div class="setting-item">
          <label>Daily Goal: <span id="goal-value">${state.settings.dailyGoal}</span>h</label>
          <input type="range" id="daily-goal" min="1" max="24" value="${state.settings.dailyGoal}" />
        </div>
      </div>
      ` : ''}
    </div>
  `;
  
  // Filter handlers
  if (isAdmin) {
    document.getElementById('filter-assignee').addEventListener('change', (e) => {
      updateState({ filters: { ...state.filters, assignee: e.target.value } });
    });
  }
  
  document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', updateFilters);
  });
  
  document.getElementById('reset-filters').addEventListener('click', () => {
    document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach(cb => {
      cb.checked = true;
    });
    if (isAdmin) {
      document.getElementById('filter-assignee').value = 'all';
    }
    updateFilters();
  });
  
  // Settings handlers
  if (isAdmin) {
    document.getElementById('hourly-rate').addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      document.getElementById('rate-value').textContent = value;
      updateState({ settings: { ...state.settings, hourlyRate: value } });
      localStorage.setItem('settings', JSON.stringify(state.settings));
    });
    
    document.getElementById('daily-goal').addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      document.getElementById('goal-value').textContent = value;
      updateState({ settings: { ...state.settings, dailyGoal: value } });
      localStorage.setItem('settings', JSON.stringify(state.settings));
    });
  }
}

function updateFilters() {
  const statusCheckboxes = document.querySelectorAll('.checkbox-group input[value="todo"], .checkbox-group input[value="doing"], .checkbox-group input[value="review"], .checkbox-group input[value="done"]');
  const priorityCheckboxes = document.querySelectorAll('.checkbox-group input[value="low"], .checkbox-group input[value="normal"], .checkbox-group input[value="high"], .checkbox-group input[value="urgent"]');
  
  const status = Array.from(statusCheckboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);
  
  const priority = Array.from(priorityCheckboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);
  
  updateState({ filters: { ...state.filters, status, priority } });
}
