zimport { state, subscribe } from '../state.js';
import { getTasks, updateTask } from '../utils/supabase.js';
import { openTaskDrawer } from '../components/taskDrawer.js';
import { exportToICS } from '../utils/calendar.js';

let currentDate = new Date();
let calendarMode = 'month';

export async function renderCalendar(container) {
  const tasks = await getTasks();
  const filteredTasks = applyFilters(tasks);
  
  container.innerHTML = `
    <div class="calendar-view">
      <div class="calendar-header">
        <div class="calendar-nav">
          <button id="prev-period" class="btn-icon">←</button>
          <h2 id="calendar-title">${getCalendarTitle()}</h2>
          <button id="next-period" class="btn-icon">→</button>
          <button id="today-btn" class="btn-secondary">Today</button>
        </div>
        
        <div class="calendar-controls">
          <div class="view-mode-toggle">
            <button class="mode-btn ${calendarMode === 'month' ? 'active' : ''}" data-mode="month">Month</button>
            <button class="mode-btn ${calendarMode === 'week' ? 'active' : ''}" data-mode="week">Week</button>
          </div>
          
          ${state.currentUser?.role === 'admin' ? `
          <button id="export-ics" class="btn-secondary">📤 Export .ics</button>
          ` : ''}
        </div>
      </div>
      
      <div id="calendar-grid" class="calendar-grid">
        ${calendarMode === 'month' ? renderMonthView(filteredTasks) : renderWeekView(filteredTasks)}
      </div>
    </div>
  `;
  
  document.getElementById('prev-period').addEventListener('click', () => {
    if (calendarMode === 'month') {
      currentDate.setMonth(currentDate.getMonth() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() - 7);
    }
    renderCalendar(container);
  });
  
  document.getElementById('next-period').addEventListener('click', () => {
    if (calendarMode === 'month') {
      currentDate.setMonth(currentDate.getMonth() + 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 7);
    }
    renderCalendar(container);
  });
  
  document.getElementById('today-btn').addEventListener('click', () => {
    currentDate = new Date();
    renderCalendar(container);
  });
  
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      calendarMode = e.target.dataset.mode;
      renderCalendar(container);
    });
  });
  
  if (state.currentUser?.role === 'admin') {
    document.getElementById('export-ics').addEventListener('click', () => {
      exportToICS(filteredTasks);
    });
  }
  
  document.querySelectorAll('.calendar-event').forEach(el => {
    el.addEventListener('click', () => {
      const taskId = el.dataset.taskId;
      const task = tasks.find(t => t.id === taskId);
      if (task) openTaskDrawer(task);
    });
    
    if (canEditTask(el.dataset.taskId, tasks)) {
      el.draggable = true;
      el.addEventListener('dragstart', handleDragStart);
    }
  });
  
  document.querySelectorAll('.calendar-day, .calendar-time-slot').forEach(el => {
    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('drop', (e) => handleDrop(e, container));
  });
  
  if (state.currentUser?.role === 'admin') {
    document.querySelectorAll('.calendar-day, .calendar-time-slot').forEach(el => {
      el.addEventListener('dblclick', handleCreateTask);
    });
  }
  
  subscribe(() => {
    renderCalendar(container);
  });
}

function renderMonthView(tasks) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();
  
  let html = '<div class="month-grid">';
  
  html += '<div class="month-header">';
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
    html += `<div class="day-header">${day}</div>`;
  });
  html += '</div>';
  
  html += '<div class="month-days">';
  
  for (let i = 0; i < startDayOfWeek; i++) {
    html += '<div class="calendar-day empty"></div>';
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = formatDate(date);
    const dayTasks = tasks.filter(t => (t.dueAt || t.due_at) && formatDate(new Date(t.dueAt || t.due_at)) === dateStr);
    const isToday = formatDate(new Date()) === dateStr;
    
    html += `
      <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}">
        <div class="day-number">${day}</div>
        <div class="day-events">
          ${dayTasks.slice(0, 3).map(task => renderEventChip(task)).join('')}
          ${dayTasks.length > 3 ? `<div class="more-events">+${dayTasks.length - 3} more</div>` : ''}
        </div>
      </div>
    `;
  }
  
  html += '</div></div>';
  return html;
}

function renderWeekView(tasks) {
  const startOfWeek = getStartOfWeek(currentDate);
  
  let html = '<div class="week-grid">';
  
  html += '<div class="week-header">';
  html += '<div class="time-label"></div>';
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(day.getDate() + i);
    const isToday = formatDate(day) === formatDate(new Date());
    html += `
      <div class="week-day-header ${isToday ? 'today' : ''}">
        <div class="day-name">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.getDay()]}</div>
        <div class="day-date">${day.getDate()}</div>
      </div>
    `;
  }
  html += '</div>';
  
  html += '<div class="week-body">';
  for (let hour = 6; hour <= 20; hour++) {
    html += '<div class="week-row">';
    html += `<div class="time-label">${hour % 12 || 12}${hour < 12 ? 'am' : 'pm'}</div>`;
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      day.setHours(hour, 0, 0, 0);
      
      const slotTasks = tasks.filter(t => {
        if (!t.dueAt && !t.due_at) return false;
        const taskDate = new Date(t.dueAt || t.due_at);
        return formatDate(taskDate) === formatDate(day) && taskDate.getHours() === hour;
      });
      
      html += `
        <div class="calendar-time-slot" data-datetime="${day.toISOString()}">
          ${slotTasks.map(task => renderEventBlock(task)).join('')}
        </div>
      `;
    }
    html += '</div>';
  }
  html += '</div></div>';
  
  return html;
}

function renderEventChip(task) {
  const statusColors = {
    todo: '#cbd5e1',
    doing: '#3b82f6',
    review: '#f59e0b',
    done: '#10b981'
  };
  
  const priorityIcons = {
    low: '',
    normal: '',
    high: '🔴',
    urgent: '⚠️'
  };
  
  return `
    <div class="calendar-event event-chip" 
         data-task-id="${task.id}"
         style="border-left: 3px solid ${statusColors[task.status]}">
      ${priorityIcons[task.priority]}
      <span class="event-title">${task.title}</span>
    </div>
  `;
}

function renderEventBlock(task) {
  const statusColors = {
    todo: '#cbd5e1',
    doing: '#3b82f6',
    review: '#f59e0b',
    done: '#10b981'
  };
  
  const assigneeName = task.assignee?.name || (task.assignee_id === '1' ? 'Jay' : task.assignee_id === '2' ? 'Andres' : 'Unassigned');
  
  return `
    <div class="calendar-event event-block" 
         data-task-id="${task.id}"
         style="background: ${statusColors[task.status]}; color: white;">
      <div class="event-title">${task.title}</div>
      <div class="event-meta">${assigneeName}</div>
    </div>
  `;
}

function getCalendarTitle() {
  if (calendarMode === 'month') {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } else {
    const start = getStartOfWeek(currentDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
}

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function applyFilters(tasks) {
  let filtered = [...tasks];
  
  filtered = filtered.filter(t => t.dueAt || t.due_at);
  
  if (state.currentUser?.role === 'va') {
    filtered = filtered.filter(t => (t.assigneeId || t.assignee_id) === state.currentUser.id);
  } else if (state.filters.assignee !== 'all') {
    filtered = filtered.filter(t => (t.assigneeId || t.assignee_id) === state.filters.assignee);
  }
  
  if (state.filters.status.length > 0) {
    filtered = filtered.filter(t => state.filters.status.includes(t.status));
  }
  
  if (state.filters.priority.length > 0) {
    filtered = filtered.filter(t => state.filters.priority.includes(t.priority));
  }
  
  return filtered;
}

function canEditTask(taskId, tasks) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return false;
  
  if (state.currentUser?.role === 'admin') return true;
  return (task.assigneeId || task.assignee_id) === state.currentUser?.id;
}

let draggedTaskId = null;

function handleDragStart(e) {
  draggedTaskId = e.target.dataset.taskId;
  e.target.style.opacity = '0.5';
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

async function handleDrop(e, container) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  
  const newDate = e.currentTarget.dataset.date || e.currentTarget.dataset.datetime;
  if (newDate && draggedTaskId) {
    await updateTask(draggedTaskId, { due_at: newDate });
    renderCalendar(container);
  }
  draggedTaskId = null;
}

function handleCreateTask(e) {
  const date = e.currentTarget.dataset.date || e.currentTarget.dataset.datetime;
  if (date) {
    openTaskDrawer({ dueAt: date, status: 'todo', priority: 'normal' });
  }
}
