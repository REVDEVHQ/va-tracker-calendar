// Export tasks to ICS format for Google Calendar, Apple Calendar, etc.

export function exportToICS(tasks) {
  const icsContent = generateICS(tasks);
  downloadICS(icsContent);
}

function generateICS(tasks) {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RevDevHQ//VA Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:RevDevHQ VA Tasks',
    'X-WR-TIMEZONE:America/Los_Angeles'
  ];
  
  tasks.forEach(task => {
    if (!task.dueAt && !task.due_at) return;
    
    const dueDate = new Date(task.dueAt || task.due_at);
    const startTime = formatICSDate(dueDate);
    
    const endDate = task.plan?.endAt 
      ? new Date(task.plan.endAt)
      : new Date(dueDate.getTime() + 60 * 60 * 1000);
    const endTime = formatICSDate(endDate);
    
    const description = [
      `Status: ${task.status}`,
      `Priority: ${task.priority}`,
      `Assignee: ${task.assignee?.name || 'Unassigned'}`,
      task.notes ? `Notes: ${task.notes}` : '',
      `View in app: ${window.location.origin}`
    ].filter(Boolean).join('\\n');
    
    ics.push(
      'BEGIN:VEVENT',
      `UID:${task.id}@revdevhq`,
      `DTSTAMP:${timestamp}`,
      `DTSTART:${startTime}`,
      `DTEND:${endTime}`,
      `SUMMARY:${escapeICSText(task.title)}`,
      `DESCRIPTION:${escapeICSText(description)}`,
      `STATUS:${task.status === 'done' ? 'COMPLETED' : 'CONFIRMED'}`,
      `PRIORITY:${getPriorityNumber(task.priority)}`,
      'END:VEVENT'
    );
  });
  
  ics.push('END:VCALENDAR');
  
  return ics.join('\r\n');
}

function formatICSDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICSText(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function getPriorityNumber(priority) {
  const map = {
    urgent: '1',
    high: '2',
    normal: '5',
    low: '7'
  };
  return map[priority] || '5';
}

function downloadICS(content) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `revdev_calendar_${new Date().toISOString().split('T')[0]}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
