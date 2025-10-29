import { state } from '../state.js';
import { updateTask, createTask, deleteTask, createTimeLog, updateTimeLog } from '../utils/supabase.js';

let currentTask = null;
let timerInterval = null;

export function openTaskDrawer(task) {
  currentTask = task;
  const drawer = document.getElementById('task-drawer');
  const isAdmin = state.currentUser?.role === 'admin';
  const isNew = !task.id;
  
  drawer.innerHTML = `
    <div class="drawer-overlay" onclick="closeTaskDrawer()"></div>
    <div class="drawer-content">
      <div class="drawer-header">
        <h2>${isNew ? 'Create Task' : 'Edit Task'}</h2>
        <button class="drawer-close" onclick="closeTaskDrawer()">✕</button>
      </div>
      
      <div class="drawer-body">
        <div class="form-group">
          <label>Title</label>
          <input type="text" id="task-title" value="${task.title || ''}" ${!isNew && !isAdmin ? 'disabled' : ''} />
        </div>
        
        ${isAdmin ? `
        <div class="form-group">
          <label>Assignee</label>
          <select id="task-assignee">
            <option value="1" ${task.assigneeId === '1' || task.assignee_id === '1' ? 'selected' : ''}>Jay</option>
            <option value="2" ${task.assigneeId === '2' || task.assignee_id === '2' ? 'selected' : ''}>Andres</option>
          </select>
        </div>
        ` : ''}
        
        <div class="form-row">
          <div class="form-group">
            <label>Status</label>
            <select id="task-status">
              <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
              <option value="doing" ${task.status === 'doing' ? 'selected' : ''}>Doing</option>
              <option value="review" ${task.status === 'review' ? 'selected' : ''}>Review</option>
              <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Priority</label>
            <select id="task-priority">
              <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
              <option value="normal" ${task.priority === 'normal' ? 'selected' : ''}>Normal</option>
              <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
              <option value="urgent" ${task.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Due Date</label>
            <input type="datetime-local" id="task-due" value="${(task.dueAt || task.due_at) ? new Date(task.dueAt || task.due_at).toISOString().slice(0, 16) : ''}" />
          </div>
          
          <div class="form-group">
            <label>Est. Hours</label>
            <input type="number" id="task-hours" value="${task.estHours || task.est_hours || ''}" step="0.5" min="0" />
          </div>
        </div>
        
        <div class="form-group">
          <label>Notes</label>
          <textarea id="task-notes" rows="3">${task.notes || ''}</textarea>
        </div>
        
        <div class="form-section">
          <h3>Customer Info</h3>
          <div class="form-group">
            <input type="text" id="customer-name" placeholder="Name" value="${task.customerName || task.customer_name || ''}" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <input type="tel" id="customer-phone" placeholder="Phone" value="${task.customerPhone || task.customer_phone || ''}" />
            </div>
            <div class="form-group">
              <input type="email" id="customer-email" placeholder="Email" value="${task.customerEmail || task.customer_email || ''}" />
            </div>
          </div>
        </div>
        
        ${!isNew ? `
        <div class="form-section">
          <h3>Time Tracking</h3>
          <div class="timer-display">
            <div class="time-accrued">
              Total: <strong>${formatMinutes(getTaskTotalTime(task))}</strong>
            </div>
            <div class="timer-controls">
              ${state.activeTimer?.taskId === task.id ? `
                <button id="pause-timer" class="btn-primary">⏸ Pause</button>
                <span class="timer-live">${formatMinutes(state.activeTimer.elapsed || 0)}</span>
              ` : `
                <button id="start-timer" class="btn-primary">▶️ Start Timer</button>
              `}
              <button id="log-location" class="btn-secondary">📍 Log Location</button>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
      
      <div class="drawer-footer">
        <div class="footer-left">
          ${isAdmin && !isNew ? `
          <button id="delete-task" class="btn-danger">Delete</button>
          ` : ''}
        </div>
        <div class="footer-right">
          <button onclick="closeTaskDrawer()" class="btn-secondary">Cancel</button>
          <button id="save-task" class="btn-primary">${isNew ? 'Create' : 'Save'}</button>
        </div>
      </div>
    </div>
  `;
  
  drawer.classList.add('open');
  
  // Event listeners
  document.getElementById('save-task').addEventListener('click', saveTask);
  
  if (!isNew) {
    if (document.getElementById('start-timer')) {
      document.getElementById('start-timer').addEventListener('click', startTimer);
    }
    if (document.getElementById('pause-timer')) {
      document.getElementById('pause-timer').addEventListener('click', pauseTimer);
    }
    document.getElementById('log-location').addEventListener('click', logLocation);
  }
  
  if (isAdmin && !isNew) {
    document.getElementById('delete-task').addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this task?')) {
        await deleteTask(task.id);
        closeTaskDrawer();
        location.reload();
      }
    });
  }
  
  // Live timer update
  if (state.activeTimer?.taskId === task.id) {
    timerInterval = setInterval(updateTimerDisplay, 1000);
  }
}

export function closeTaskDrawer() {
  const drawer = document.getElementById('task-drawer');
  drawer.classList.remove('open');
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

async function saveTask() {
  const taskData = {
    title: document.getElementById('task-title').value,
    status: document.getElementById('task-status').value,
    priority: document.getElementById('task-priority').value,
    due_at: document.getElementById('task-due').value ? new Date(document.getElementById('task-due').value).toISOString() : null,
    est_hours: parseFloat(document.getElementById('task-hours').value) || null,
    notes: document.getElementById('task-notes').value,
    customer_name: document.getElementById('customer-name').value,
    customer_phone: document.getElementById('customer-phone').value,
    customer_email: document.getElementById('customer-email').value
  };
  
  if (state.currentUser?.role === 'admin' && document.getElementById('task-assignee')) {
    taskData.assignee_id = document.getElementById('task-assignee').value;
  }
  
  try {
    if (currentTask.id) {
      await updateTask(currentTask.id, taskData);
    } else {
      await createTask(taskData);
    }
    closeTaskDrawer();
    location.reload();
  } catch (error) {
    alert('Failed to save task: ' + error.message);
  }
}

function startTimer() {
  state.activeTimer = {
    taskId: currentTask.id,
    startedAt: new Date(),
    elapsed: 0
  };
  localStorage.setItem('activeTimer', JSON.stringify(state.activeTimer));
  openTaskDrawer(currentTask);
}

async function pauseTimer() {
  if (!state.activeTimer) return;
  
  const elapsed = Math.floor((new Date() - new Date(state.activeTimer.startedAt)) / 1000 / 60);
  
  await createTimeLog({
    task_id: currentTask.id,
    user_id: state.currentUser.id,
    started_at: state.activeTimer.startedAt,
    ended_at: new Date(),
    duration_minutes: elapsed
  });
  
  state.activeTimer = null;
  localStorage.removeItem('activeTimer');
  openTaskDrawer(currentTask);
}

async function logLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      
      if (state.activeTimer?.taskId === currentTask.id) {
        state.activeTimer.location = { lat: latitude, lng: longitude };
        localStorage.setItem('activeTimer', JSON.stringify(state.activeTimer));
      }
      
      showToast(`📍 Location logged: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    }, (error) => {
      showToast('❌ Failed to get location: ' + error.message);
    });
  } else {
    showToast('❌ Geolocation not supported');
  }
}

function updateTimerDisplay() {
  if (!state.activeTimer) return;
  const elapsed = Math.floor((new Date() - new Date(state.activeTimer.startedAt)) / 1000 / 60);
  const display = document.querySelector('.timer-live');
  if (display) {
    display.textContent = formatMinutes(elapsed);
  }
}

function getTaskTotalTime(task) {
  const logs = state.timeLogs.filter(log => log.taskId === task.id || log.task_id === task.id);
  return logs.reduce((sum, log) => sum + (log.durationMinutes || log.duration_minutes || 0), 0);
}

function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => container.removeChild(toast), 300);
  }, 3000);
}

window.closeTaskDrawer = closeTaskDrawer;
