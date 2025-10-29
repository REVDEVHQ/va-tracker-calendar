import { initSupabase, getCurrentUser, login } from './utils/supabase.js';
import { initRouter } from './router.js';
import { renderNavbar } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
import { state } from './state.js';

// Initialize app
async function init() {
  try {
    // Initialize Supabase
    await initSupabase();
    
    // Check if user is logged in
    const user = await getCurrentUser();
    
    if (!user) {
      // Redirect to login
      showLogin();
      return;
    }
    
    // Store user in state
    state.currentUser = user;
    
    // Render UI components
    renderNavbar();
    renderSidebar();
    
    // Initialize router
    initRouter();
    
  } catch (error) {
    console.error('Failed to initialize app:', error);
    document.getElementById('app').innerHTML = `
      <div class="error-screen">
        <h1>Error Loading App</h1>
        <p>${error.message}</p>
        <button onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

function showLogin() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <h1>RevDevHQ VA Tracker</h1>
        <form id="login-form">
          <input type="email" placeholder="Email" required />
          <input type="password" placeholder="Password" required />
          <button type="submit">Log In</button>
        </form>
        <p class="login-hint">
          Admin: jay@revdevhq.com / admin123<br>
          VA: andres@revdevhq.com / va123
        </p>
      </div>
    </div>
  `;
  
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target[0].value;
    const password = e.target[1].value;
    
    try {
      await login(email, password);
      location.reload();
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  });
}

// Start the app
init();
