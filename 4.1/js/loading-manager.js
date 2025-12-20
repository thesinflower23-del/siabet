/* ============================================
   Loading Manager - Centralized Loading States
   ============================================ */

class LoadingManager {
  constructor() {
    this.activeLoaders = new Set();
    this.loadingTimeouts = new Map();
    this.defaultTimeout = 10000; // 10 seconds
  }

  /**
   * Show global loading overlay
   * @param {string} message - Loading message to display
   * @param {number} timeout - Timeout in milliseconds
   */
  showGlobalLoader(message = 'Loading...', timeout = this.defaultTimeout) {
    const loaderId = 'global-loader';
    
    // Remove existing global loader
    this.hideGlobalLoader();
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = loaderId;
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-message">
        <div class="spinner spinner-large"></div>
        <div class="loading-text">${message}</div>
        <div class="progress-bar">
          <div class="progress-bar-fill"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    this.activeLoaders.add(loaderId);
    
    // Set timeout
    if (timeout > 0) {
      const timeoutId = setTimeout(() => {
        this.hideGlobalLoader();
        this.showError('Loading is taking longer than expected. Please check your connection.');
      }, timeout);
      this.loadingTimeouts.set(loaderId, timeoutId);
    }
    
    return loaderId;
  }

  /**
   * Hide global loading overlay
   */
  hideGlobalLoader() {
    const loaderId = 'global-loader';
    const overlay = document.getElementById(loaderId);
    if (overlay) {
      overlay.remove();
    }
    this.activeLoaders.delete(loaderId);
    this.clearTimeout(loaderId);
  }

  /**
   * Show loading state for a specific container
   * @param {string|HTMLElement} container - Container selector or element
   * @param {string} message - Loading message
   * @param {string} type - Loading type: 'spinner', 'skeleton', 'table'
   */
  showContainerLoader(container, message = 'Loading...', type = 'spinner') {
    const element = typeof container === 'string' ? document.querySelector(container) : container;
    if (!element) return null;

    const loaderId = `loader-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Store original content
    element.dataset.originalContent = element.innerHTML;
    element.dataset.loaderId = loaderId;
    
    let loaderHTML = '';
    
    switch (type) {
      case 'skeleton':
        loaderHTML = this.generateSkeletonLoader(element);
        break;
      case 'table':
        loaderHTML = this.generateTableLoader();
        break;
      case 'gallery':
        loaderHTML = this.generateGalleryLoader();
        break;
      case 'calendar':
        loaderHTML = `
          <div class="calendar-loading">
            <div class="spinner"></div>
            <div class="loading-text">${message}</div>
          </div>
        `;
        break;
      default:
        loaderHTML = `
          <div class="dashboard-loading">
            <div class="spinner"></div>
            <div class="loading-text">${message}</div>
          </div>
        `;
    }
    
    element.innerHTML = loaderHTML;
    element.classList.add('content-loading');
    this.activeLoaders.add(loaderId);
    
    return loaderId;
  }

  /**
   * Hide loading state for a container
   * @param {string|HTMLElement} container - Container selector or element
   */
  hideContainerLoader(container) {
    const element = typeof container === 'string' ? document.querySelector(container) : container;
    if (!element) return;

    const loaderId = element.dataset.loaderId;
    if (loaderId) {
      this.activeLoaders.delete(loaderId);
    }
    
    // Restore original content if it exists
    if (element.dataset.originalContent) {
      element.innerHTML = element.dataset.originalContent;
      delete element.dataset.originalContent;
      delete element.dataset.loaderId;
    }
    
    element.classList.remove('content-loading');
  }

  /**
   * Show loading state for dashboard initialization
   * @param {string} dashboardType - Type of dashboard: 'admin', 'customer', 'groomer'
   */
  showDashboardLoader(dashboardType = 'admin') {
    const messages = {
      admin: 'Loading admin dashboard...',
      customer: 'Loading your dashboard...',
      groomer: 'Loading groomer dashboard...'
    };
    
    const tips = {
      admin: 'Fetching bookings, customers, and reports',
      customer: 'Loading your bookings and appointments',
      groomer: 'Loading your schedule and assignments'
    };
    
    return this.showGlobalLoader(`
      <div class="loading-message">
        <div class="icon">${dashboardType === 'admin' ? '👨‍💼' : dashboardType === 'customer' ? '👤' : '🧑‍⚕️'}</div>
        <div>${messages[dashboardType]}</div>
        <div class="loading-tips">
          <div class="tip">${tips[dashboardType]}</div>
        </div>
      </div>
    `);
  }

  /**
   * Show loading state for data tables
   * @param {string|HTMLElement} tableContainer - Table container
   * @param {number} rows - Number of skeleton rows to show
   */
  showTableLoader(tableContainer, rows = 5) {
    return this.showContainerLoader(tableContainer, 'Loading data...', 'table');
  }

  /**
   * Show loading state for booking form
   * @param {string|HTMLElement} formContainer - Form container
   */
  showBookingFormLoader(formContainer) {
    const element = typeof formContainer === 'string' ? document.querySelector(formContainer) : formContainer;
    if (!element) return;

    element.classList.add('booking-form-loading');
    return 'booking-form-loader';
  }

  /**
   * Hide booking form loader
   * @param {string|HTMLElement} formContainer - Form container
   */
  hideBookingFormLoader(formContainer) {
    const element = typeof formContainer === 'string' ? document.querySelector(formContainer) : formContainer;
    if (!element) return;

    element.classList.remove('booking-form-loading');
  }

  /**
   * Show button loading state
   * @param {string|HTMLElement} button - Button selector or element
   * @param {string} loadingText - Text to show while loading
   */
  showButtonLoader(button, loadingText = 'Loading...') {
    const element = typeof button === 'string' ? document.querySelector(button) : button;
    if (!element) return;

    element.dataset.originalText = element.textContent;
    element.textContent = loadingText;
    element.classList.add('btn-loading');
    element.disabled = true;
  }

  /**
   * Hide button loading state
   * @param {string|HTMLElement} button - Button selector or element
   */
  hideButtonLoader(button) {
    const element = typeof button === 'string' ? document.querySelector(button) : button;
    if (!element) return;

    if (element.dataset.originalText) {
      element.textContent = element.dataset.originalText;
      delete element.dataset.originalText;
    }
    element.classList.remove('btn-loading');
    element.disabled = false;
  }

  /**
   * Generate skeleton loader based on container content
   */
  generateSkeletonLoader(container) {
    const height = container.offsetHeight || 200;
    const rows = Math.max(3, Math.floor(height / 40));
    
    let skeletonHTML = '<div class="skeleton-container">';
    for (let i = 0; i < rows; i++) {
      const width = Math.random() * 40 + 60; // Random width between 60-100%
      skeletonHTML += `<div class="skeleton skeleton-text" style="width: ${width}%;"></div>`;
    }
    skeletonHTML += '</div>';
    
    return skeletonHTML;
  }

  /**
   * Generate table skeleton loader
   */
  generateTableLoader() {
    return `
      <div class="table-loading-overlay">
        <div class="spinner"></div>
        <div class="loading-text">Loading data...</div>
      </div>
    `;
  }

  /**
   * Generate gallery skeleton loader
   */
  generateGalleryLoader() {
    return `
      <div class="gallery-loading">
        ${Array(6).fill().map(() => '<div class="skeleton skeleton-image"></div>').join('')}
      </div>
    `;
  }

  /**
   * Show error message
   * @param {string} message - Error message
   * @param {number} duration - Duration to show error (0 = permanent)
   */
  showError(message, duration = 5000) {
    const errorId = `error-${Date.now()}`;
    const errorDiv = document.createElement('div');
    errorDiv.id = errorId;
    errorDiv.className = 'loading-overlay';
    errorDiv.style.background = 'rgba(220, 53, 69, 0.95)';
    errorDiv.style.color = 'white';
    errorDiv.innerHTML = `
      <div class="loading-message">
        <div class="icon">⚠️</div>
        <div style="font-weight: 600; margin-bottom: 0.5rem;">Loading Error</div>
        <div>${message}</div>
        <button onclick="loadingManager.retryLastOperation('${errorId}')" 
                style="margin-top: 1rem; padding: 0.5rem 1rem; background: white; color: #dc3545; border: none; border-radius: 4px; cursor: pointer;">
          Try Again
        </button>
      </div>
    `;
    
    document.body.appendChild(errorDiv);
    
    if (duration > 0) {
      setTimeout(() => this.hideError(errorId), duration);
    }
    
    return errorId;
  }

  /**
   * Hide error message
   * @param {string} errorId - Error ID to hide
   */
  hideError(errorId) {
    const errorDiv = document.getElementById(errorId);
    if (errorDiv) {
      errorDiv.remove();
    }
  }

  /**
   * Retry the last operation (used by Try Again button)
   * @param {string} errorId - Error ID to hide
   */
  retryLastOperation(errorId) {
    this.hideError(errorId);
    
    // Determine what page we're on and retry the appropriate function
    const path = window.location.pathname;
    
    if (path.includes('customer-dashboard')) {
      if (typeof loadCustomerDashboard === 'function') {
        console.log('Retrying customer dashboard load...');
        loadCustomerDashboard();
      } else {
        window.location.reload();
      }
    } else if (path.includes('admin-dashboard')) {
      if (typeof initAdminDashboard === 'function') {
        console.log('Retrying admin dashboard load...');
        initAdminDashboard();
      } else {
        window.location.reload();
      }
    } else if (path.includes('groomer-dashboard')) {
      if (typeof initGroomerDashboard === 'function') {
        console.log('Retrying groomer dashboard load...');
        initGroomerDashboard();
      } else {
        window.location.reload();
      }
    } else {
      // Fallback: reload the page
      window.location.reload();
    }
  }

  /**
   * Clear timeout for a loader
   * @param {string} loaderId - Loader ID
   */
  clearTimeout(loaderId) {
    const timeoutId = this.loadingTimeouts.get(loaderId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.loadingTimeouts.delete(loaderId);
    }
  }

  /**
   * Hide all active loaders
   */
  hideAllLoaders() {
    this.activeLoaders.forEach(loaderId => {
      const element = document.getElementById(loaderId);
      if (element) {
        element.remove();
      }
    });
    
    // Clear all timeouts
    this.loadingTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    
    this.activeLoaders.clear();
    this.loadingTimeouts.clear();
    
    // Remove loading classes from all elements
    document.querySelectorAll('.content-loading, .booking-form-loading, .btn-loading').forEach(el => {
      el.classList.remove('content-loading', 'booking-form-loading', 'btn-loading');
      if (el.dataset.originalContent) {
        el.innerHTML = el.dataset.originalContent;
        delete el.dataset.originalContent;
        delete el.dataset.loaderId;
      }
    });
  }

  /**
   * Wrap async function with loading state
   * @param {Function} asyncFn - Async function to wrap
   * @param {Object} options - Loading options
   */
  async withLoader(asyncFn, options = {}) {
    const {
      container = null,
      message = 'Loading...',
      type = 'spinner',
      global = false,
      timeout = this.defaultTimeout
    } = options;

    let loaderId;
    
    try {
      if (global) {
        loaderId = this.showGlobalLoader(message, timeout);
      } else if (container) {
        loaderId = this.showContainerLoader(container, message, type);
      }
      
      const result = await asyncFn();
      return result;
    } catch (error) {
      console.error('Error in withLoader:', error);
      this.showError(`Failed to load data: ${error.message}`);
      throw error;
    } finally {
      if (global) {
        this.hideGlobalLoader();
      } else if (container) {
        this.hideContainerLoader(container);
      }
    }
  }
}

// Create global instance
const loadingManager = new LoadingManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LoadingManager;
}

// Auto-cleanup on page unload
window.addEventListener('beforeunload', () => {
  loadingManager.hideAllLoaders();
});

// Helper functions for common use cases
window.showDashboardLoader = (type) => loadingManager.showDashboardLoader(type);
window.hideDashboardLoader = () => loadingManager.hideGlobalLoader();
window.showTableLoader = (container) => loadingManager.showTableLoader(container);
window.hideTableLoader = (container) => loadingManager.hideContainerLoader(container);
window.showCalendarLoader = (container) => loadingManager.showContainerLoader(container, 'Loading calendar...', 'calendar');
window.hideCalendarLoader = (container) => loadingManager.hideContainerLoader(container);
window.showBookingFormLoader = (container) => loadingManager.showBookingFormLoader(container);
window.hideBookingFormLoader = (container) => loadingManager.hideBookingFormLoader(container);
window.showGalleryLoader = (container) => loadingManager.showContainerLoader(container, 'Loading photos...', 'gallery');
window.hideGalleryLoader = (container) => loadingManager.hideContainerLoader(container);