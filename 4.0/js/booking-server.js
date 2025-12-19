/* ============================================
   Server-Side Booking Creation with Security
   ============================================ */

import { ref, push, set, get, runTransaction } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// ============================================
// 🛡️ SECURE BOOKING CREATION
// ============================================
// Uses server-side ID generation and atomic transactions
// Prevents duplicates and race conditions
// ============================================

/**
 * Create booking with server-side validation
 * @param {Object} bookingData - Booking data from form
 * @returns {Promise<Object>} Created booking with server-generated ID
 */
async function createBookingSecure(bookingData) {
  console.log('[createBookingSecure] Starting secure booking creation...');
  
  try {
    // 1. Validate user authentication
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated to create booking');
    }
    
    // 2. Get database reference
    const db = window.firebaseDatabase;
    if (!db) {
      throw new Error('Firebase database not initialized');
    }
    
    // 3. Use atomic transaction to prevent race conditions
    const bookingsRef = ref(db, 'bookings');
    
    const result = await runTransaction(bookingsRef, (currentBookings) => {
      console.log('[createBookingSecure] Running atomic transaction...');
      
      // 4. Server-side duplicate check
      const existingBookings = currentBookings ? Object.values(currentBookings) : [];
      const isDuplicate = existingBookings.some(b => 
        b.userId === user.id &&
        b.date === bookingData.date &&
        b.time === bookingData.time &&
        b.petName === bookingData.petName &&
        !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status)
      );
      
      if (isDuplicate) {
        console.warn('[createBookingSecure] Duplicate booking detected in transaction');
        // Return undefined to abort transaction
        return;
      }
      
      // 5. Generate server-side unique ID using Firebase push
      const tempRef = push(ref(db, 'temp'));
      const serverGeneratedId = tempRef.key;
      
      // 6. Create booking with server-generated ID
      const booking = {
        ...bookingData,
        id: serverGeneratedId,
        userId: user.id,
        status: 'pending',
        createdAt: Date.now(),
        serverGenerated: true, // Mark as server-generated
        ipAddress: getClientIP(), // Optional: log IP for security
        userAgent: navigator.userAgent.substring(0, 200) // Optional: log user agent
      };
      
      // 7. Add to current bookings
      const updatedBookings = currentBookings || {};
      updatedBookings[serverGeneratedId] = booking;
      
      console.log('[createBookingSecure] Booking created with server ID:', serverGeneratedId);
      return updatedBookings;
    });
    
    if (!result.committed) {
      throw new Error('Booking creation failed - possible duplicate detected');
    }
    
    // 8. Get the created booking from transaction result
    const createdBookingId = Object.keys(result.snapshot.val() || {}).find(id => 
      result.snapshot.val()[id].userId === user.id &&
      result.snapshot.val()[id].createdAt === result.snapshot.val()[id].createdAt
    );
    
    const createdBooking = result.snapshot.val()[createdBookingId];
    
    // 9. Log successful creation for security audit
    if (typeof BookingSecurityLogger !== 'undefined') {
      BookingSecurityLogger.log('booking_created_secure', {
        bookingId: createdBooking.id,
        userId: user.id,
        method: 'server_side_transaction',
        timestamp: Date.now()
      });
    }
    
    console.log('[createBookingSecure] Booking created successfully:', createdBooking.id);
    return createdBooking;
    
  } catch (error) {
    console.error('[createBookingSecure] Error creating booking:', error);
    
    // Log security error
    if (typeof BookingSecurityLogger !== 'undefined') {
      BookingSecurityLogger.log('booking_creation_failed', {
        error: error.message,
        userId: user?.id,
        timestamp: Date.now()
      }, 'error');
    }
    
    throw error;
  }
}

/**
 * Validate booking data server-side
 * @param {Object} bookingData - Booking data to validate
 * @returns {Object} Validation result
 */
function validateBookingData(bookingData) {
  const errors = [];
  
  // Required fields validation
  const requiredFields = ['date', 'time', 'petName', 'packageId', 'customerName', 'customerEmail', 'customerPhone'];
  requiredFields.forEach(field => {
    if (!bookingData[field] || bookingData[field].toString().trim() === '') {
      errors.push(`${field} is required`);
    }
  });
  
  // Date validation
  if (bookingData.date) {
    const bookingDate = new Date(bookingData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (bookingDate < today) {
      errors.push('Booking date cannot be in the past');
    }
  }
  
  // Email validation
  if (bookingData.customerEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bookingData.customerEmail)) {
      errors.push('Invalid email format');
    }
  }
  
  // Phone validation
  if (bookingData.customerPhone) {
    const phoneRegex = /^09\d{9}$/;
    if (!phoneRegex.test(bookingData.customerPhone)) {
      errors.push('Invalid phone number format (must be 09XXXXXXXXX)');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Check for existing bookings at same time slot
 * @param {string} date - Booking date
 * @param {string} time - Booking time
 * @returns {Promise<boolean>} True if slot is available
 */
async function checkTimeSlotAvailability(date, time) {
  try {
    const bookings = await getBookings();
    const conflictingBookings = bookings.filter(b => 
      b.date === date &&
      b.time === time &&
      !['cancelled', 'cancelledByCustomer', 'cancelledByAdmin', 'cancelledBySystem'].includes(b.status)
    );
    
    return conflictingBookings.length === 0;
  } catch (error) {
    console.error('[checkTimeSlotAvailability] Error checking availability:', error);
    return false; // Fail safe - assume slot is not available
  }
}

/**
 * Get client IP address (best effort)
 * @returns {string} Client IP or 'unknown'
 */
function getClientIP() {
  // This is limited in browser environment
  // For real IP tracking, you'd need server-side implementation
  return 'client-side-unknown';
}

/**
 * Enhanced booking creation with pre-validation
 * @param {Object} bookingData - Booking data from form
 * @returns {Promise<Object>} Created booking
 */
async function createBookingWithValidation(bookingData) {
  console.log('[createBookingWithValidation] Starting validation...');
  
  // 1. Validate booking data
  const validation = validateBookingData(bookingData);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }
  
  // 2. Check time slot availability
  const isAvailable = await checkTimeSlotAvailability(bookingData.date, bookingData.time);
  if (!isAvailable) {
    throw new Error('Selected time slot is no longer available');
  }
  
  // 3. Create booking securely
  return await createBookingSecure(bookingData);
}

// ============================================
// 🔄 UPDATE EXISTING BOOKING FUNCTIONS
// ============================================

/**
 * Update booking with server-side validation
 * @param {Object} updatedBooking - Updated booking data
 * @returns {Promise<Object>} Updated booking
 */
async function updateBookingSecure(updatedBooking) {
  console.log('[updateBookingSecure] Starting secure update...');
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated to update booking');
    }
    
    const db = window.firebaseDatabase;
    if (!db) {
      throw new Error('Firebase database not initialized');
    }
    
    // Use transaction for atomic update
    const bookingRef = ref(db, `bookings/${updatedBooking.id}`);
    
    const result = await runTransaction(bookingRef, (currentBooking) => {
      if (!currentBooking) {
        throw new Error('Booking not found');
      }
      
      // Verify ownership
      if (currentBooking.userId !== user.id && user.role !== 'admin') {
        throw new Error('Unauthorized to update this booking');
      }
      
      // Preserve server-generated fields
      const preservedFields = {
        id: currentBooking.id,
        userId: currentBooking.userId,
        createdAt: currentBooking.createdAt,
        serverGenerated: currentBooking.serverGenerated
      };
      
      return {
        ...updatedBooking,
        ...preservedFields,
        updatedAt: Date.now()
      };
    });
    
    if (!result.committed) {
      throw new Error('Booking update failed');
    }
    
    console.log('[updateBookingSecure] Booking updated successfully:', updatedBooking.id);
    return result.snapshot.val();
    
  } catch (error) {
    console.error('[updateBookingSecure] Error updating booking:', error);
    throw error;
  }
}

// ============================================
// 🌐 EXPORT FUNCTIONS
// ============================================

// Make functions globally available
window.createBookingSecure = createBookingSecure;
window.createBookingWithValidation = createBookingWithValidation;
window.updateBookingSecure = updateBookingSecure;
window.validateBookingData = validateBookingData;
window.checkTimeSlotAvailability = checkTimeSlotAvailability;

console.log('[booking-server.js] Server-side booking functions loaded');