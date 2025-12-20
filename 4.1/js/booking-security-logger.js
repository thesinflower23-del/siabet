// ============================================
// 🔒 BOOKING SECURITY LOGGER
// ============================================
// Tracks and logs all booking submission attempts
// Helps detect duplicate submissions, abuse, and security issues
// ============================================

const BookingSecurityLogger = {
  // Storage key for logs
  STORAGE_KEY: 'bookingSecurityLogs',
  
  // Maximum logs to keep (prevent storage overflow)
  MAX_LOGS: 1000,
  
  // Log levels
  LEVELS: {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    SECURITY: 'security'
  },
  
  /**
   * Initialize logger
   */
  init() {
    console.log('[BookingSecurityLogger] Initialized');
  },
  
  /**
   * Log a booking submission attempt
   * @param {string} action - Action type (attempt, blocked, success, error)
   * @param {Object} details - Additional details
   */
  log(action, details = {}) {
    const logEntry = {
      timestamp: Date.now(),
      datetime: new Date().toISOString(),
      action: action,
      level: this.determineLevel(action),
      userId: details.userId || 'anonymous',
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
      ...details
    };
    
    // Save to storage
    this.saveLog(logEntry);
    
    // Console log with color coding
    this.consoleLog(logEntry);
    
    // Check for suspicious patterns
    this.checkForAbusePatterns(logEntry);
    
    return logEntry;
  },
  
  /**
   * Determine log level based on action
   */
  determineLevel(action) {
    if (action.includes('blocked') || action.includes('duplicate')) {
      return this.LEVELS.WARNING;
    }
    if (action.includes('error') || action.includes('failed')) {
      return this.LEVELS.ERROR;
    }
    if (action.includes('abuse') || action.includes('suspicious')) {
      return this.LEVELS.SECURITY;
    }
    return this.LEVELS.INFO;
  },
  
  /**
   * Save log entry to localStorage
   */
  saveLog(logEntry) {
    try {
      const logs = this.getLogs();
      logs.push(logEntry);
      
      // Keep only last MAX_LOGS entries
      if (logs.length > this.MAX_LOGS) {
        logs.splice(0, logs.length - this.MAX_LOGS);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('[BookingSecurityLogger] Failed to save log:', error);
    }
  },
  
  /**
   * Get all logs from storage
   */
  getLogs() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[BookingSecurityLogger] Failed to load logs:', error);
      return [];
    }
  },
  
  /**
   * Console log with color coding
   */
  consoleLog(logEntry) {
    const colors = {
      info: 'color: #2196f3',
      warning: 'color: #ff9800; font-weight: bold',
      error: 'color: #f44336; font-weight: bold',
      security: 'color: #e91e63; font-weight: bold; font-size: 1.1em'
    };
    
    const style = colors[logEntry.level] || colors.info;
    const emoji = {
      info: '📝',
      warning: '⚠️',
      error: '❌',
      security: '🚨'
    }[logEntry.level] || '📝';
    
    console.log(
      `%c${emoji} [BookingSecurity] ${logEntry.action}`,
      style,
      logEntry
    );
  },
  
  /**
   * Get or create session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('bookingSessionId');
    if (!sessionId) {
      sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('bookingSessionId', sessionId);
    }
    return sessionId;
  },
  
  /**
   * Check for abuse patterns
   */
  checkForAbusePatterns(currentLog) {
    const logs = this.getLogs();
    const recentLogs = logs.filter(log => 
      Date.now() - log.timestamp < 60000 && // Last 1 minute
      log.sessionId === currentLog.sessionId
    );
    
    // ============================================
    // 🚨 PATTERN 1: Rapid submission attempts
    // ============================================
    const attemptCount = recentLogs.filter(log => 
      log.action.includes('attempt') || log.action.includes('blocked')
    ).length;
    
    if (attemptCount > 10) {
      this.log('abuse_detected_rapid_attempts', {
        pattern: 'Rapid submission attempts',
        attemptCount: attemptCount,
        timeWindow: '1 minute',
        severity: 'high',
        recommendation: 'Consider rate limiting or CAPTCHA'
      });
    }
    
    // ============================================
    // 🚨 PATTERN 2: Multiple blocked attempts
    // ============================================
    const blockedCount = recentLogs.filter(log => 
      log.action.includes('blocked')
    ).length;
    
    if (blockedCount > 5) {
      this.log('abuse_detected_multiple_blocks', {
        pattern: 'Multiple blocked attempts',
        blockedCount: blockedCount,
        timeWindow: '1 minute',
        severity: 'medium',
        recommendation: 'User may be trying to bypass protection'
      });
    }
    
    // ============================================
    // 🚨 PATTERN 3: Cooldown violations
    // ============================================
    const cooldownViolations = recentLogs.filter(log => 
      log.action === 'blocked_cooldown'
    ).length;
    
    if (cooldownViolations > 3) {
      this.log('abuse_detected_cooldown_violations', {
        pattern: 'Repeated cooldown violations',
        violationCount: cooldownViolations,
        timeWindow: '1 minute',
        severity: 'low',
        recommendation: 'User may be impatient or testing system'
      });
    }
  },
  
  /**
   * Get statistics for admin dashboard
   */
  getStats(timeWindow = 3600000) { // Default: 1 hour
    const logs = this.getLogs();
    const cutoff = Date.now() - timeWindow;
    const recentLogs = logs.filter(log => log.timestamp >= cutoff);
    
    return {
      totalAttempts: recentLogs.filter(log => log.action.includes('attempt')).length,
      successfulSubmissions: recentLogs.filter(log => log.action === 'submission_success').length,
      blockedAttempts: recentLogs.filter(log => log.action.includes('blocked')).length,
      duplicatesPrevented: recentLogs.filter(log => log.action.includes('duplicate')).length,
      errors: recentLogs.filter(log => log.level === 'error').length,
      securityAlerts: recentLogs.filter(log => log.level === 'security').length,
      uniqueSessions: new Set(recentLogs.map(log => log.sessionId)).size,
      uniqueUsers: new Set(recentLogs.map(log => log.userId)).size
    };
  },
  
  /**
   * Export logs for analysis
   */
  exportLogs(format = 'json') {
    const logs = this.getLogs();
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }
    
    if (format === 'csv') {
      const headers = ['Timestamp', 'DateTime', 'Action', 'Level', 'UserId', 'SessionId', 'Details'];
      const rows = logs.map(log => [
        log.timestamp,
        log.datetime,
        log.action,
        log.level,
        log.userId,
        log.sessionId,
        JSON.stringify(log)
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    return logs;
  },
  
  /**
   * Clear all logs
   */
  clearLogs() {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('[BookingSecurityLogger] All logs cleared');
  },
  
  /**
   * Get logs by level
   */
  getLogsByLevel(level) {
    return this.getLogs().filter(log => log.level === level);
  },
  
  /**
   * Get logs by action
   */
  getLogsByAction(action) {
    return this.getLogs().filter(log => log.action === action);
  },
  
  /**
   * Get logs by user
   */
  getLogsByUser(userId) {
    return this.getLogs().filter(log => log.userId === userId);
  },
  
  /**
   * Get logs by session
   */
  getLogsBySession(sessionId) {
    return this.getLogs().filter(log => log.sessionId === sessionId);
  }
};

// Initialize on load
BookingSecurityLogger.init();

// Make globally available
window.BookingSecurityLogger = BookingSecurityLogger;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BookingSecurityLogger;
}
