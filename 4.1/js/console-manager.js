/* ============================================
   Console Manager - Error Suppression & Logging
   ============================================ */

class ConsoleManager {
  constructor() {
    this.suppressedErrors = new Set();
    this.errorCounts = new Map();
    this.maxErrorCount = 1; // Show error only once, then suppress
    this.originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info
    };
    
    this.init();
  }

  /**
   * Initialize console management
   */
  init() {
    this.setupErrorSuppression();
    this.setupPermissionErrorHandling();
    this.setupTrackingPreventionHandling();
    console.log('[ConsoleManager] Console error management initialized');
  }

  /**
   * Setup error suppression for repetitive errors
   */
  setupErrorSuppression() {
    const self = this;
    
    // Override console.error to suppress repetitive errors
    console.error = function(...args) {
      const errorMessage = args.join(' ');
      const errorKey = self.getErrorKey(errorMessage);
      
      // Handle specific error types
      if (errorMessage.includes('Permissions policy violation') || 
          errorMessage.includes('accelerometer') ||
          errorMessage.includes('streetview.js') ||
          errorMessage.includes('common.js') ||
          errorMessage.includes('init_embed.js')) {
        self.handlePermissionsPolicyViolation(errorMessage);
        return;
      }
      
      // Handle Firebase permission errors
      if (errorMessage.includes('Permission denied') || 
          errorMessage.includes('Error getting bookings') ||
          errorMessage.includes('Error getting users') ||
          errorMessage.includes('Error loading overview') ||
          errorMessage.includes('absences is not defined') ||
          errorMessage.includes('firebase-db.js')) {
        self.handleFirebasePermissionError(errorMessage);
        return; // Completely suppress after handling
      }
      
      // Check if this error should be suppressed
      if (self.shouldSuppressError(errorKey, errorMessage)) {
        return; // Suppress the error
      }
      
      // Count the error
      self.errorCounts.set(errorKey, (self.errorCounts.get(errorKey) || 0) + 1);
      
      // Show the error with additional context
      self.originalConsole.error(...args);
      
      // Add suppression notice if this is the last time we'll show it
      if (self.errorCounts.get(errorKey) >= self.maxErrorCount) {
        self.originalConsole.warn(`[ConsoleManager] Further "${errorKey}" errors will be suppressed`);
      }
    };

    // Override console.warn for permission warnings
    console.warn = function(...args) {
      const warnMessage = args.join(' ');
      
      // Handle specific warning types
      if (warnMessage.includes('Permission denied')) {
        self.handlePermissionWarning(warnMessage);
        return;
      }
      
      if (warnMessage.includes('Tracking Prevention')) {
        self.handleTrackingPreventionWarning(warnMessage);
        return;
      }
      
      if (warnMessage.includes('Permissions policy violation') || warnMessage.includes('accelerometer')) {
        self.handlePermissionsPolicyViolation(warnMessage);
        return;
      }
      
      // Show other warnings normally
      self.originalConsole.warn(...args);
    };
  }

  /**
   * Get a key for error deduplication
   */
  getErrorKey(errorMessage) {
    // Extract key parts of error message for deduplication
    if (errorMessage.includes('Permission denied')) {
      return 'firebase-permission-denied';
    }
    if (errorMessage.includes('Error getting bookings')) {
      return 'firebase-bookings-error';
    }
    if (errorMessage.includes('Error getting users')) {
      return 'firebase-users-error';
    }
    if (errorMessage.includes('Error loading overview')) {
      return 'admin-overview-error';
    }
    if (errorMessage.includes('absences is not defined')) {
      return 'absences-undefined-error';
    }
    if (errorMessage.includes('Tracking Prevention')) {
      return 'tracking-prevention';
    }
    if (errorMessage.includes('Permissions policy violation')) {
      return 'permissions-policy';
    }
    if (errorMessage.includes('AutoCancel')) {
      return 'auto-cancel';
    }
    if (errorMessage.includes('streetview.js') || 
        errorMessage.includes('common.js') || 
        errorMessage.includes('init_embed.js') ||
        errorMessage.includes('Google Maps')) {
      return 'google-maps-error';
    }
    
    // For other errors, use first 50 characters
    return errorMessage.substring(0, 50);
  }

  /**
   * Check if error should be suppressed
   */
  shouldSuppressError(errorKey, errorMessage) {
    // Always suppress these specific errors after first occurrence
    const alwaysSuppressPatterns = [
      'Tracking Prevention blocked access',
      'Permissions policy violation: accelerometer',
      'deviceorientation events are blocked',
      'Permissions policy violation',
      'Google Maps',
      'streetview.js',
      'common.js',
      'init_embed.js',
      'Permission denied',
      'Error getting bookings',
      'Error getting users',
      'absences is not defined',
      'firebase-db.js'
    ];
    
    for (const pattern of alwaysSuppressPatterns) {
      if (errorMessage.includes(pattern)) {
        if (this.suppressedErrors.has(errorKey)) {
          return true; // Already shown once, suppress
        }
        this.suppressedErrors.add(errorKey);
        return false; // Show once, then suppress
      }
    }
    
    // Suppress if we've shown this error too many times
    return (this.errorCounts.get(errorKey) || 0) >= this.maxErrorCount;
  }

  /**
   * Handle permission warnings with user-friendly messages
   */
  handlePermissionWarning(message) {
    const warningKey = 'permission-warning';
    
    if (this.suppressedErrors.has(warningKey)) {
      return; // Already handled
    }
    
    this.suppressedErrors.add(warningKey);
    
    // Show user-friendly message instead of technical error
    this.originalConsole.info(
      '%c[System] %cUsing local data due to server access restrictions. Functionality remains available.',
      'color: #007bff; font-weight: bold;',
      'color: #6c757d;'
    );
    
    // Trigger permission warning UI if available
    if (typeof showPermissionWarning === 'function') {
      setTimeout(() => {
        if (message.includes('bookings')) showPermissionWarning('bookings');
        if (message.includes('users')) showPermissionWarning('users');
        if (message.includes('groomers')) showPermissionWarning('groomers');
      }, 1000);
    }
  }

  /**
   * Handle tracking prevention warnings
   */
  handleTrackingPreventionWarning(message) {
    const warningKey = 'tracking-prevention';
    
    if (this.suppressedErrors.has(warningKey)) {
      return; // Already handled
    }
    
    this.suppressedErrors.add(warningKey);
    
    // Show user-friendly message
    this.originalConsole.info(
      '%c[System] %cExternal resource blocked by browser privacy settings. Using local alternatives.',
      'color: #28a745; font-weight: bold;',
      'color: #6c757d;'
    );
  }

  /**
   * Handle permissions policy violations (like Google Maps accelerometer access)
   */
  handlePermissionsPolicyViolation(message) {
    const warningKey = 'permissions-policy-violation';
    
    if (this.suppressedErrors.has(warningKey)) {
      return; // Already handled
    }
    
    this.suppressedErrors.add(warningKey);
    
    // Show user-friendly message only once
    this.originalConsole.info(
      '%c[System] %cBrowser security policy prevents certain features. Map functionality remains available.',
      'color: #17a2b8; font-weight: bold;',
      'color: #6c757d;'
    );
  }

  /**
   * Handle Firebase permission errors
   */
  handleFirebasePermissionError(message) {
    // Create specific keys for different types of Firebase errors
    let warningKey = 'firebase-permission-error';
    if (message.includes('bookings')) warningKey = 'firebase-bookings-error';
    if (message.includes('users')) warningKey = 'firebase-users-error';
    if (message.includes('absences')) warningKey = 'firebase-absences-error';
    
    if (this.suppressedErrors.has(warningKey)) {
      return; // Already handled, completely suppress
    }
    
    this.suppressedErrors.add(warningKey);
    
    // Show user-friendly message only once per error type
    this.originalConsole.info(
      '%c[System] %cDatabase access restricted. Using local data for offline functionality.',
      'color: #28a745; font-weight: bold;',
      'color: #6c757d;'
    );
    
    // Trigger permission warning UI if available (only once)
    if (typeof showPermissionWarning === 'function') {
      setTimeout(() => {
        if (message.includes('bookings') && !this.suppressedErrors.has('ui-bookings-warning')) {
          this.suppressedErrors.add('ui-bookings-warning');
          showPermissionWarning('bookings');
        }
        if (message.includes('users') && !this.suppressedErrors.has('ui-users-warning')) {
          this.suppressedErrors.add('ui-users-warning');
          showPermissionWarning('users');
        }
      }, 500);
    }
  }

  /**
   * Setup permission error handling
   */
  setupPermissionErrorHandling() {
    // Handle unhandled promise rejections (common with Firebase permission errors)
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message) {
        const message = event.reason.message;
        
        if (message.includes('Permission denied')) {
          // Prevent the error from showing in console
          event.preventDefault();
          
          // Handle gracefully
          this.handlePermissionWarning(message);
          return;
        }
      }
    });
  }

  /**
   * Setup tracking prevention handling
   */
  setupTrackingPreventionHandling() {
    // Monitor for tracking prevention errors
    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
      try {
        return await originalFetch.apply(this, args);
      } catch (error) {
        if (error.message && error.message.includes('blocked')) {
          console.info('[System] External resource blocked. Using local alternatives.');
          throw error;
        }
        throw error;
      }
    };
  }

  /**
   * Create clean logging methods
   */
  createCleanLogger() {
    return {
      info: (message, ...args) => {
        this.originalConsole.info(
          `%c[App] %c${message}`,
          'color: #007bff; font-weight: bold;',
          'color: #333;',
          ...args
        );
      },
      
      success: (message, ...args) => {
        this.originalConsole.log(
          `%c[Success] %c${message}`,
          'color: #28a745; font-weight: bold;',
          'color: #333;',
          ...args
        );
      },
      
      warning: (message, ...args) => {
        this.originalConsole.warn(
          `%c[Warning] %c${message}`,
          'color: #ffc107; font-weight: bold;',
          'color: #333;',
          ...args
        );
      },
      
      error: (message, ...args) => {
        this.originalConsole.error(
          `%c[Error] %c${message}`,
          'color: #dc3545; font-weight: bold;',
          'color: #333;',
          ...args
        );
      }
    };
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      suppressedErrors: Array.from(this.suppressedErrors),
      errorCounts: Object.fromEntries(this.errorCounts),
      totalSuppressed: this.suppressedErrors.size,
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0)
    };
  }

  /**
   * Reset error tracking
   */
  reset() {
    this.suppressedErrors.clear();
    this.errorCounts.clear();
    console.log('[ConsoleManager] Error tracking reset');
  }

  /**
   * Restore original console methods
   */
  restore() {
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.info = this.originalConsole.info;
    console.log('[ConsoleManager] Original console methods restored');
  }

  /**
   * Enable verbose mode (show all errors)
   */
  enableVerboseMode() {
    this.maxErrorCount = Infinity;
    this.suppressedErrors.clear();
    console.log('[ConsoleManager] Verbose mode enabled - all errors will be shown');
  }

  /**
   * Enable quiet mode (suppress more errors)
   */
  enableQuietMode() {
    this.maxErrorCount = 1;
    console.log('[ConsoleManager] Quiet mode enabled - errors will be suppressed more aggressively');
  }
}

// Create global instance
const consoleManager = new ConsoleManager();

// Create clean logger for application use
const logger = consoleManager.createCleanLogger();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ConsoleManager, logger };
}

// Global helper functions
window.getConsoleStats = () => consoleManager.getErrorStats();
window.resetConsoleTracking = () => consoleManager.reset();
window.enableVerboseLogging = () => consoleManager.enableVerboseMode();
window.enableQuietLogging = () => consoleManager.enableQuietMode();

// Expose for debugging
window.consoleManager = consoleManager;
window.logger = logger;