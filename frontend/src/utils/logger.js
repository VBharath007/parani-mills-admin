export const logActivity = (action, details, targetName, image = null, category = null) => {
  try {
    const logs = JSON.parse(localStorage.getItem('admin_activity_logs') || '[]');
    const newLog = {
      id: Date.now().toString(),
      action, // 'CREATE', 'UPDATE', 'DELETE'
      details,
      targetName, // e.g., product name
      image,
      category,
      date: new Date().toISOString(),
      user: 'Admin User'
    };
    logs.unshift(newLog);
    // Keep only last 100 logs
    localStorage.setItem('admin_activity_logs', JSON.stringify(logs.slice(0, 100)));
  } catch (e) {
    console.error('Failed to log activity', e);
  }
};
