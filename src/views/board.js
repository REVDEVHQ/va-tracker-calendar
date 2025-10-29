import { state } from '../state.js';
import { getTasks } from '../utils/supabase.js';
import { openTaskDrawer } from '../components/taskDrawer.js';

export async function renderBoard(container) {
  const tasks = await getTasks();
  const filteredTasks = applyFilters(tasks);
  
  const columns = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    doing: filteredTasks.filter(t => t.status === 'doing'),
    review: filteredTasks.filter(t => t.status === 'review'),
    done: filteredTasks.filter(t => t.status === 'done')
  };
  
  container.innerHTML = `
    <div class="board-view">
      <div class="board-header">
        <h1>Task Board</h1>
        ${state.currentUser?.role === 'admin' ? `
        <button id="new-task-btn" class="btn-primary">+ New Task</button>
        ` : ''}
      </div>
      
      <div class="board-columns">
        ${renderColumn('todo', 'To Do', columns.todo)}
        ${renderColumn('doing', 'Doing', columns.doing)}
        ${renderColumn('review', 'Review', columns.review)}
        ${renderColumn('done', 'Done', columns.done)}
      </div>
    </div>
  `;
  
  if (state.currentUser?.role === 'admin') {
    document.getElementById('new-task-btn').addEventListener('click', () => {
      openTaskDrawer({ status: 'todo', priority: 'normal' });
    });
  }
  
  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('click', () => {
      const task = tasks.find(t => t.id === card.dataset.taskId);
      if (task) openTaskDrawer(task);
    });
  });
}

function renderColumn(status, title, tasks) {
  return `
    <div class="board-column" data-status="${status}">
      <div class="column-header">
        <h3>${title}</h3>
        <span class="count">${tasks.length}</span>
      </div>
      <div class="column-body">
        ${tasks.map(task => renderTaskCard(task)).join('')}
      </div>
    </div>
  `;
}

function renderTaskCard(task) {
  const priorityBadge = task.priority === 'urgent' ? '⚠️' : task.priority === 'high' ? '🔴' : '';
  const assigneeName = task.assignee?.name || (task.assignee_id === '1' ? 'Jay' : task.assignee_id === '2' ? 'Andres' : '?');
  
  return `
    <div class="task-card" data-task-id="${task.id}">
      <div class="card-header">
        <span class="priority">${priorityBadge}</span>
        <span class="assignee">${assigneeName[0]}</span>
      </div>
      <div class="card-title">${task.title}</div>
      ${(task.dueAt || task.due_at) ? `<div class="card-due">📅 ${new Date(task.dueAt || task.due_at).toLocaleDateString()}</div>` : ''}
      ${(task.estHours || task.est_hours) ? `<div class="card-hours">⏱️ ${task.estHours || task.est_hours}h</div>` : ''}
    </div>
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
