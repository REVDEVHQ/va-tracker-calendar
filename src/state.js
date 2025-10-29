// Global application state
export const state = {
  currentUser: null,
  tasks: [],
  timeLogs: [],
  settings: {
    hourlyRate: 5,
    dailyGoal: 10
  },
  filters: {
    assignee: 'all',
    status: [],
    priority: []
  },
  currentView: 'board',
  activeTimer: null
};

// State subscribers (for reactive updates)
const subscribers = new Set();

export function subscribe(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

export function notify() {
  subscribers.forEach(callback => callback(state));
}

export function updateState(updates) {
  Object.assign(state, updates);
  notify();
}
