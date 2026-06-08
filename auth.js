/**
 * StryK Auth Guard — Demo Mode
 * In production, replace with real session/token check.
 * For demo: auto-sets role based on page so navigation works directly.
 */
var StryKAuth = {
  getRole: function() {
    return localStorage.getItem('stryk_role') || null;
  },
  setRole: function(role) {
    localStorage.setItem('stryk_role', role);
  },
  guard: function(requiredRole) {
    var role = this.getRole();
    // Demo mode: if no role set, auto-set based on required role so pages open directly
    if (!role) {
      this.setRole(requiredRole);
      return; // Allow access
    }
    if (role !== requiredRole) {
      // Wrong role — redirect to their own dashboard
      if (role === 'client') window.location.replace('client-dashboard.html');
      else window.location.replace('freelancer-dashboard.html');
    }
    // Correct role — allow
  },
  logout: function() {
    localStorage.removeItem('stryk_role');
    window.location.replace('login.html');
  }
};
