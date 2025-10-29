import { state } from '../state.js';
import { getTasks } from '../utils/supabase.js';
import { openTaskDrawer } from '../components/taskDrawer.js';

export async function renderList(container) {
  const tasks = await getTasks();
  const filteredTasks = applyFilters(tasks);
  
  container.innerHTML = `
    <div class="list-view">
      <div class="list-header">
        <h1>Task List</h1>
        ${state.currentUser?.role === 'admin' ? `
        <button id="new-task-btn" class="btn-primary">+ New Task</button>
        ` : ''}
      </div>
      
      <table class="task-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Assignee</th>
            <th>Due Date</th>
            <th>Est. Hours</th>
          </tr>
        </thead>
        <tbody>
          ${filteredTasks.map(task => renderTaskRow(task)).join('')}
        </tbody>
      </table>
      
      ${filteredTasks.length === 0 ? '<p class="empty-state">No tasks found</p>' : ''}
    </div>
  `;
  
  if (state.currentUser?.role === 'admin') {
    document.getElementById('new-task-btn').addEventListener('click', () => {
      openTaskDrawer({ status: 'todo', priority: 'normal' });
    });
  }
  
  document.querySelectorAll('.task-row').forEach(row => {
    row.addEventListener('click', () => {
      const task = tasks.find(t => t.id === row.dataset.taskId);
      if (task) openTaskDrawer(task);
    });
  });
}

function renderTaskRow(task) {
  const statusColors = {
    todo: 'gray',
    doing: 'blue',
    review: 'orange',
    done: 'green'
  };
  
  const assigneeName = task.assignee?.name || (task.assignee_id === '1' ? 'Jay' : task.assignee_id === '2' ? 'Andres' : 'Unassigned');
  
  return `
    <tr class="task-row" data-task-id="${task.id}">
      <td>${task.title}</td>
      <td><span class="status-badge ${statusColors[task.status]}">${task.status}</span></td>
      <td>${task.priority}</td>
      <td>${assigneeName}</td>
      <td>${(task.dueAt || task.due_at) ? new Date(task.dueAt || task.due_at).toLocaleDateString() : '-'}</td>
      <td>${task.estHours || task.est_hours || '-'}</td>
    </tr>
  `;
}

function applyFilters(tasks) {
  let filtered = [...tasks];
  
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
