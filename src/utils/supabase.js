import { createClient } from '@supabase/supabase-js';

let supabase = null;

export async function initSupabase() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not found, using LocalStorage only');
    return null;
  }
  
  supabase = createClient(supabaseUrl, supabaseKey);
  return supabase;
}

export function getSupabase() {
  return supabase;
}

export async function getCurrentUser() {
  if (!supabase) {
    // Fallback to localStorage for MVP without backend
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // Fetch user profile with role
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single();
    
    return { ...user, ...profile };
  }
  
  return null;
}

export async function login(email, password) {
  if (!supabase) {
    // LocalStorage fallback for MVP
    const mockUsers = [
      { id: '1', email: 'jay@revdevhq.com', name: 'Jay', role: 'admin' },
      { id: '2', email: 'andres@revdevhq.com', name: 'Andres', role: 'va' }
    ];
    
    const user = mockUsers.find(u => u.email === email);
    if (user && password) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    }
    throw new Error('Invalid credentials');
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return data.user;
}

export async function logout() {
  if (!supabase) {
    localStorage.removeItem('currentUser');
    return;
  }
  
  await supabase.auth.signOut();
}

// Task operations
export async function getTasks(filters = {}) {
  if (!supabase) {
    // LocalStorage fallback
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    return applyFilters(tasks, filters);
  }
  
  let query = supabase.from('tasks').select('*, assignee:users(*)');
  
  if (filters.assigneeId) {
    query = query.eq('assignee_id', filters.assigneeId);
  }
  
  if (filters.status) {
    query = query.in('status', Array.isArray(filters.status) ? filters.status : [filters.status]);
  }
  
  if (filters.priority) {
    query = query.in('priority', Array.isArray(filters.priority) ? filters.priority : [filters.priority]);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function createTask(task) {
  if (!supabase) {
    // LocalStorage fallback
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const newTask = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    tasks.push(newTask);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    return newTask;
  }
  
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateTask(id, updates) {
  if (!supabase) {
    // LocalStorage fallback
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem('tasks', JSON.stringify(tasks));
      return tasks[index];
    }
    throw new Error('Task not found');
  }
  
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteTask(id) {
  if (!supabase) {
    // LocalStorage fallback
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const filtered = tasks.filter(t => t.id !== id);
    localStorage.setItem('tasks', JSON.stringify(filtered));
    return true;
  }
  
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// Time log operations
export async function createTimeLog(log) {
  if (!supabase) {
    const logs = JSON.parse(localStorage.getItem('timeLogs') || '[]');
    const newLog = {
      ...log,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    logs.push(newLog);
    localStorage.setItem('timeLogs', JSON.stringify(logs));
    return newLog;
  }
  
  const { data, error } = await supabase
    .from('time_logs')
    .insert(log)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateTimeLog(id, updates) {
  if (!supabase) {
    const logs = JSON.parse(localStorage.getItem('timeLogs') || '[]');
    const index = logs.findIndex(l => l.id === id);
    if (index !== -1) {
      logs[index] = { ...logs[index], ...updates };
      localStorage.setItem('timeLogs', JSON.stringify(logs));
      return logs[index];
    }
    throw new Error('Time log not found');
  }
  
  const { data, error } = await supabase
    .from('time_logs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getTimeLogs(taskId) {
  if (!supabase) {
    const logs = JSON.parse(localStorage.getItem('timeLogs') || '[]');
    return taskId ? logs.filter(l => l.taskId === taskId) : logs;
  }
  
  let query = supabase.from('time_logs').select('*');
  if (taskId) query = query.eq('task_id', taskId);
  
  const { data, error } = await query.order('started_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Helper functions
function applyFilters(tasks, filters) {
  let filtered = [...tasks];
  
  if (filters.assigneeId) {
    filtered = filtered.filter(t => t.assigneeId === filters.assigneeId);
  }
  
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    filtered = filtered.filter(t => statuses.includes(t.status));
  }
  
  if (filters.priority) {
    const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
    filtered = filtered.filter(t => priorities.includes(t.priority));
  }
  
  return filtered;
}
