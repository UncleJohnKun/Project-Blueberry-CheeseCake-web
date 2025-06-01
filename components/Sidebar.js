function renderSidebar() {
  // Remove the Admin Dashboard item from the sidebar
  return `
    <div class="sidebar">
      <div class="sidebar-header">
        <img src="logo.png" alt="Logo" class="logo">
        <h3>Kamusta Po Guro</h3>
      </div>
      <div class="sidebar-menu">
        <!-- Admin Dashboard item removed -->
        <a href="teacherPortal.html" class="menu-item">
          <i class="icon user-icon"></i>
          <span>Teacher Portal</span>
        </a>
        <!-- Other menu items... -->
      </div>
    </div>
  `;
}