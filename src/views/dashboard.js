import { state } from '../state.js';
import { getTasks, getTimeLogs } from '../utils/supabase.js';

export async function renderDashboard(container) {
  const tasks = await getTasks();
  const timeLogs = await getTimeLogs();
  
  const stats = calculateStats(tasks, timeLogs);
  
  container.innerHTML = `
    <div class="dashboard-view">
      <h1>Dashboard</h1>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.totalTasks}</div>
          <div class="stat-label">Total Tasks</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">${stats.completedTasks}</div>
          <div class="stat-label">Completed</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">${stats.inProgressTasks}</div>
          <div class="stat-label">In Progress</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">${stats.totalHours.toFixed(1)}h</div>
          <div class="stat-label">Hours Logged</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">$${stats.totalRevenue.toFixed(0)}</div>
          <div class="stat-label">Revenue (Est.)</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">${stats.dailyProgress.toFixed(0)}%</div>
          <div class="stat-label">Daily Goal Progress</div>
        </div>
      </div>
      
      <div class="charts-grid">
        <div class="chart-card">
          <h3>Tasks by Status</h3>
          <div class="chart-bar">
            ${renderStatusChart(stats.byStatus)}
          </div>
        </div>
        
        <div class="chart-card">
          <h3>Tasks by Priority</h3>
          <div class="chart-bar">
            ${renderPriorityChart(stats.byPriority)}
          </div>
        </div>
      </div>
      
      <div class="recent-activity">
        <h3>Recent Activity</h3>
        ${renderRecentLogs(timeLogs.slice(0, 5))}
      </div>
    </div>
  `;
}

function calculateStats(tasks, timeLogs) {
  const totalHours = timeLogs.reduce((sum, log) => sum + (log.durationMinutes || log.duration_minutes || 0), 0) / 60;
  const totalRevenue = totalHours * state.settings.hourlyRate;
  const todayHours = timeLogs
    .filter(log => new Date(log.startedAt || log.started_at).toDateString() === new Date().toDateString())
    .reduce((sum, log) => sum + (log.durationMinutes || log.duration_minutes || 0), 0) / 60;
  
  const byStatus = {
    todo: tasks.filter(t => t.status === 'todo').length,
    doing: tasks.filter(t => t.status === 'doing').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done').length
  };
  
  const byPriority = {
    low: tasks.filter(t => t.priority === 'low').length,
    normal: tasks.filter(t => t.priority === 'normal').length,
    high: tasks.filter(t => t.priority === 'high').length,
    urgent: tasks.filter(t => t.priority === 'urgent').length
  };
  
  return {
    totalTasks: tasks.length,
    completedTasks: byStatus.done,
    inProgressTasks: byStatus.doing,
    totalHours,
    totalRevenue,
    dailyProgress: (todayHours / state.settings.dailyGoal) * 100,
    byStatus,
    byPriority
  };
}

function renderStatusChart(byStatus) {
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const colors = { todo: '#cbd5e1', doing: '#3b82f6', review: '#f59e0b', done: '#10b981' };
  
  return Object.entries(byStatus)
    .map(([status, count]) => {
      const percentage = total > 0 ? (count / total) * 100 : 0;
      return `
        <div class="bar-segment" 
             style="width: ${percentage}%; background: ${colors[status]};" 
             title="${status}: ${count}">
          ${count > 0 ? count : ''}
        </div>
      `;
    })
    .join('');
}

function renderPriorityChart(byPriority) {
  const total = Object.values(byPriority).reduce((a, b) => a + b, 0);
  const colors = { low: '#94a3b8', normal: '#64748b', high: '#f97316', urgent: '#dc2626' };
  
  return Object.entries(byPriority)
    .map(([priority, count]) => {
      const percentage = total > 0 ? (count / total) * 100 : 0;
      return `
        <div class="bar-segment" 
             style="width: ${percentage}%; background: ${colors[priority]};" 
             title="${priority}: ${count}">
          ${count > 0 ? count : ''}
        </div>
      `;
    })
    .join('');
}

function renderRecentLogs(logs) {
  if (logs.length === 0) {
    return '<p class="empty-state">No recent activity</p>';
  }
  
  return `
    <ul class="activity-list">
      ${logs.map(log => `
        <li>
          <span class="activity-time">${new Date(log.startedAt || log.started_at).toLocaleString()}</span>
          <span class="activity-desc">Logged ${((log.durationMinutes || log.duration_minutes || 0) / 60).toFixed(1)}h on task</span>
          ${(log.locationLat || log.location_lat) ? '<span class="activity-location">📍</span>' : ''}
        </li>
      `).join('')}
    </ul>
  `;
}
