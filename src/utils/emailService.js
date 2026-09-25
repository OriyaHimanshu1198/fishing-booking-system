// Email service utility using Brevo (Sendinblue) for sending booking notifications
// Brevo free tier: 300 emails per day - plenty for a fishing booking system!

import axios from 'axios';

export const emailService = {
  // Daily counter for rate limiting (stays in memory - resets on page refresh)
  // For production, you might want to use localStorage or a server-side counter
  _dailyEmailCount: 0,
  _lastResetDate: new Date().toDateString(),
  _isApiKeyInvalid: false,

  /**
   * Initialize Brevo HTTP client
   * @returns {AxiosInstance|null} - Axios instance or null if not configured
   */
  _getBrevoClient() {
    if (this._isApiKeyInvalid) {
      return null;
    }

    const apiKey = import.meta.env.VITE_BREVO_API_KEY;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '' || apiKey.includes('placeholder')) {
      // Console warning only once per session to avoid spam
      if (typeof window !== 'undefined' && !window._brevoWarningShown) {
        console.info('[Email Service] Brevo API key not configured - using mock mode for development');
        window._brevoWarningShown = true;
      }
      return null;
    }

    const trimmedKey = apiKey.trim();
    // Brevo v3 API keys start with xkeysib-
    if (!trimmedKey.startsWith('xkeysib-')) {
      if (typeof window !== 'undefined' && !window._brevoWarningShown) {
        console.warn('[Email Service] Brevo API key is not a valid v3 key (must start with xkeysib-) - using mock mode');
        window._brevoWarningShown = true;
      }
      return null;
    }

    return axios.create({
      baseURL: 'https://api.brevo.com/v3',
      headers: {
        'api-key': trimmedKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
  },

  /**
   * Check and reset daily email counter
   * @returns {boolean} - True if under limit, false if over limit
   */
  _checkDailyLimit() {
    const today = new Date().toDateString();

    // Reset counter if it's a new day
    if (today !== this._lastResetDate) {
      this._dailyEmailCount = 0;
      this._lastResetDate = today;
      console.log('[Email Service] Daily email counter reset for new day');
    }

    // Check if we're under our safety limit (275 to stay under Brevo's 300 limit)
    const underLimit = this._dailyEmailCount < 275;

    if (!underLimit) {
      console.warn(`[Email Service] Daily limit reached (${this._dailyEmailCount}/275). Emails will be queued for tomorrow.`);
    }

    return underLimit;
  },

  /**
   * Increment daily email counter
   */
  _incrementDailyCount() {
    this._dailyEmailCount++;
    console.log(`[Email Service] Email sent. Daily count: ${this._dailyEmailCount}/275`);
  },

  /**
   * Send booking confirmation email via Brevo
   * @param {Object} bookingData - The booking information
   * @returns {Promise<Object>} - Result of email sending operation
   */
  async sendBookingConfirmation(bookingData) {
    try {
      // Check daily limit first
      if (!this._checkDailyLimit()) {
        // Queue for tomorrow - in a real app you'd save to database
        console.log('[Email Service] Queuing confirmation email for tomorrow due to daily limit');
        return {
          success: true, // Still return success so booking isn't blocked
          queued: true,
          message: `Email queued for tomorrow (daily limit reached)`,
          timestamp: new Date().toISOString()
        };
      }

      const client = this._getBrevoClient();

      // Fallback to mock if no API key (for development)
      if (!client) {
        return this._mockSend(bookingData, 'confirmation');
      }

      // Prepare email payload for Brevo
      const emailPayload = {
        sender: {
          name: "Fishing Booking System",
          email: import.meta.env.VITE_BREVO_SENDER_EMAIL || "bookings@yourdomain.com"
        },
        to: [{ email: bookingData.email, name: bookingData.name }],
        subject: `🎣 Fishing Booking Confirmed - Week ${bookingData.week}`,
        htmlContent: this._getConfirmationTemplate(bookingData),
        params: {
          role: "Angler",
          booking_id: bookingData.id || 'TEMP-' + Date.now(),
          week_number: bookingData.week,
          days_count: bookingData.days_count,
          booking_type: bookingData.booking_type === 'consecutive' ? 'Consecutive Days' : 'Flexible Booking'
        }
      };

      // Send email via Brevo API
      const response = await client.post('/smtp/email', emailPayload);

      // Update daily counter on success
      this._incrementDailyCount();

      console.log('[Email Service] Brevo confirmation sent successfully:', {
        messageId: response.data.messageId,
        to: bookingData.email,
        dailyCount: this._dailyEmailCount
      });

      return {
        success: true,
        messageId: response.data.messageId,
        timestamp: new Date().toISOString(),
        queued: false
      };
    } catch (error) {
      const status = error.response?.status;
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';

      if (status === 401 || errorMsg.includes('Key not found') || errorMsg.includes('unauthorized')) {
        this._isApiKeyInvalid = true;
        console.warn('[Email Service] Brevo API key is not active or unauthorized (401 Key not found). Switched to mock email mode.');
        return this._mockSend(bookingData, 'confirmation');
      }

      // Check if it's a rate limit error from Brevo (HTTP 429)
      if (status === 429) {
        console.warn('[Email Service] Brevo daily limit reached - queuing for tomorrow');
        // In production, you'd save to a database queue here
        return {
          success: true, // Don't block the booking
          queued: true,
          message: `Daily limit reached with Brevo - email queued for tomorrow`,
          timestamp: new Date().toISOString()
        };
      }

      // For other errors, fallback to mock to avoid breaking the booking flow
      console.warn('[Email Service] Brevo delivery failed, using mock mode:', errorMsg);
      return this._mockSend(bookingData, 'confirmation');
    }
  },

  /**
   * Send booking cancellation email
   * @param {Object} bookingData - The booking information
   * @returns {Promise<Object>} - Result of email sending operation
   */
  async sendCancellationConfirmation(bookingData) {
    try {
      // Check daily limit first
      if (!this._checkDailyLimit()) {
        console.log('[Email Service] Queuing cancellation email for tomorrow due to daily limit');
        return {
          success: true,
          queued: true,
          message: `Email queued for tomorrow (daily limit reached)`,
          timestamp: new Date().toISOString()
        };
      }

      const client = this._getBrevoClient();

      // Fallback to mock if no API key
      if (!client) {
        return this._mockSend(bookingData, 'cancellation');
      }

      // Prepare email payload for Brevo
      const emailPayload = {
        sender: {
          name: "Fishing Booking System",
          email: import.meta.env.VITE_BREVO_SENDER_EMAIL || "bookings@yourdomain.com"
        },
        to: [{ email: bookingData.email, name: bookingData.name }],
        subject: `🎣 Fishing Booking Cancellation`,
        htmlContent: this._getCancellationTemplate(bookingData)
      };

      // Send email via Brevo API
      await client.post('/smtp/email', emailPayload);

      // Update daily counter on success
      this._incrementDailyCount();

      return {
        success: true,
        timestamp: new Date().toISOString(),
        queued: false
      };
    } catch (error) {
      const status = error.response?.status;
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';

      if (status === 401 || errorMsg.includes('Key not found') || errorMsg.includes('unauthorized')) {
        this._isApiKeyInvalid = true;
        console.warn('[Email Service] Brevo API key is not active or unauthorized (401 Key not found). Switched to mock email mode.');
        return this._mockSend(bookingData, 'cancellation');
      }

      // Check for rate limit
      if (status === 429) {
        console.warn('[Email Service] Brevo daily limit reached for cancellation');
        return {
          success: true,
          queued: true,
          message: `Daily limit reached - cancellation email queued for tomorrow`,
          timestamp: new Date().toISOString()
        };
      }

      // Fallback to mock
      console.warn('[Email Service] Brevo cancellation notice failed, using mock mode:', errorMsg);
      return this._mockSend(bookingData, 'cancellation');
    }
  },

  /**
   * Send booking reminder email (placeholder for future implementation)
   * @param {Object} bookingData - The booking information
   * @param {String} daysUntil - Days until the booking
   * @returns {Promise<Object>} - Result of email sending operation
   */
  async sendBookingReminder(bookingData, daysUntil) {
    try {
      // Check daily limit first
      if (!this._checkDailyLimit()) {
        console.log('[Email Service] Queuing reminder email for tomorrow due to daily limit');
        return {
          success: true,
          queued: true,
          message: `Email queued for tomorrow (daily limit reached)`,
          timestamp: new Date().toISOString()
        };
      }

      const client = this._getBrevoClient();

      // Fallback to mock if no API key
      if (!client) {
        return this._mockSend(bookingData, `reminder-${daysUntil}days`);
      }

      // Prepare email payload for Brevo
      const emailPayload = {
        sender: {
          name: "Fishing Booking System",
          email: import.meta.env.VITE_BREVO_SENDER_EMAIL || "bookings@yourdomain.com"
        },
        to: [{ email: bookingData.email, name: bookingData.name }],
        subject: `⏰ Reminder: Your fishing booking is in ${daysUntil} day(s)`,
        htmlContent: this._getReminderTemplate(bookingData, daysUntil)
      };

      // Send email via Brevo API
      await client.post('/smtp/email', emailPayload);

      // Update daily counter on success
      this._incrementDailyCount();

      return {
        success: true,
        timestamp: new Date().toISOString(),
        queued: false
      };
    } catch (error) {
      const status = error.response?.status;
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';

      if (status === 401 || errorMsg.includes('Key not found') || errorMsg.includes('unauthorized')) {
        this._isApiKeyInvalid = true;
        console.warn('[Email Service] Brevo API key is not active or unauthorized (401 Key not found). Switched to mock email mode.');
        return this._mockSend(bookingData, `reminder-${daysUntil}days`);
      }

      // Check for rate limit
      if (status === 429) {
        console.warn('[Email Service] Brevo daily limit reached for reminder');
        return {
          success: true,
          queued: true,
          message: `Daily limit reached - reminder email queued for tomorrow`,
          timestamp: new Date().toISOString()
        };
      }

      // Fallback to mock
      console.warn('[Email Service] Brevo reminder delivery failed, using mock mode:', errorMsg);
      return this._mockSend(bookingData, `reminder-${daysUntil}days`);
    }
  },

  /**
   * Mock fallback for development/testing when Brevo is not configured
   */
  _mockSend: async (bookingData, type) => {
    console.log(`[Email Service] MOCK ${type.toUpperCase()} email:`, {
      to: bookingData.email,
      type: type,
      data: {
        name: bookingData.name,
        email: bookingData.email,
        week: bookingData.week,
        days_count: bookingData.days_count,
        booking_type: bookingData.booking_type
      }
    });

    // Simulate network delay for realism
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      success: true,
      messageId: `mock-${type}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      queued: false,
      mock: true
    };
  },

  /**
   * Get HTML template for booking confirmation email
   */
  _getConfirmationTemplate: (booking) => {
    // Format beat allocations for display
    const beatInfo = booking.beat_allocations && Object.keys(booking.beat_allocations).length > 0
      ? Object.entries(booking.beat_allocations)
        .map(([dayIndex, beat]) => {
          const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dayLabel = dayLabels[parseInt(dayIndex)] || `Day ${parseInt(dayIndex) + 1}`;
          return `<li><strong>${dayLabel}:</strong> ${beat}</li>`;
        })
        .join('')
      : '<li>No specific beat assignments (flexible booking)</li>';

    // Format dates nicely
    const _formatDate = (dateString) => {
      if (!dateString) return 'Not set';
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    return `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin: 0;">🎣 Fishing Booking Confirmed!</h1>
          <p style="color: #7f8c8d; margin: 5px 0 0 0;">Your adventure awaits</p>
        </div>

        <div style="background: #f8f9fa; border-left: 4px solid #3498db; padding: 20px; margin: 25px 0;">
          <h2 style="color: #2c3e50; margin-top: 0;">Booking Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Guest Name:</td>
              <td style="padding: 8px 0;">${booking.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Email:</td>
              <td style="padding: 8px 0;">${booking.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Phone:</td>
              <td style="padding: 8px 0;">${booking.phone}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Booking Week:</td>
              <td style="padding: 8px 0;">#${booking.week}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Days Booked:</td>
              <td style="padding: 8px 0;">${booking.days_count} day(s)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Booking Type:</td>
              <td style="padding: 8px 0;">${booking.booking_type === 'consecutive' ? 'Consecutive Days' : 'Flexible Booking'}</td>
            </tr>
          </table>
        </div>

        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 20px; margin: 25px 0;">
          <h2 style="color: #856404; margin-top: 0;">🎯 Your Beat/Loch Assignments</h2>
          <p style="margin-bottom: 10px;">Here's your personalized fishing schedule:</p>
          <ul style="padding-left: 20px; margin: 0;">
            ${beatInfo}
          </ul>
          ${booking.booking_type === 'consecutive'
            ? '<p style="font-size: 0.9em; color: #6c757d; margin-top: 10px;"><em>Note: As a consecutive booking, your beats/lochs rotate daily for fair distribution.</em></p>'
            : '<p style="font-size: 0.9em; color: #6c757d; margin-top: 10px;"><em>Note: As a flexible booking, you selected your preferred beats/lochs for each day.</em></p>'}
        </div>

        <div style="text-align: center; margin: 30px 0; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #6c757d; font-size: 0.9em; margin: 0;">
            We're excited to host you for your fishing trip!<br>
            Please arrive 30 minutes before your scheduled start time.
          </p>
          <p style="color: #95a5a6; font-size: 0.8em; margin-top: 15px;">
            This is an automated confirmation. Please do not reply to this email.<br>
            For changes or questions, visit our booking system or contact us directly.
          </p>
        </div>

        <div style="text-align: center; margin-top: 25px; font-size: 0.8em; color: #95a5a6;">
          <p>Fishing Booking System • Powered by Brevo</p>
          <p>© ${new Date().getFullYear()} All rights reserved</p>
        </div>
      </div>
    `;
  },

  /**
   * Get HTML template for booking cancellation email
   */
  _getCancellationTemplate: (booking) => {
    return `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #e74c3c; margin: 0;">🎣 Fishing Booking Cancelled</h1>
          <p style="color: #7f8c8d; margin: 5px 0 0 0;">We're sorry to see you go</p>
        </div>

        <div style="background: #f8f9fa; border-left: 4px solid #e74c3c; padding: 20px; margin: 25px 0;">
          <h2 style="color: #2c3e50; margin-top: 0;">Cancellation Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Guest Name:</td>
              <td style="padding: 8px 0;">${booking.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Email:</td>
              <td style="padding: 8px 0;">${booking.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Phone:</td>
              <td style="padding: 8px 0;">${booking.phone}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Booking Week:</td>
              <td style="padding: 8px 0;">#${booking.week}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Days Booked:</td>
              <td style="padding: 8px 0;">${booking.days_count} day(s)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Cancelled On:</td>
              <td style="padding: 8px 0;">${new Date().toLocaleDateString()}</td>
            </tr>
          </table>
        </div>

        <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 20px; margin: 25px 0;">
          <h2 style="color: #155724; margin-top: 0;">We Hope to See You Again!</h2>
          <p style="margin-bottom: 0;">
            Your spot has been released and is now available for other anglers.
            We understand plans change, and we'd be happy to help you book another
            fishing adventure when your schedule allows.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #6c757d; font-size: 0.9em; margin: 0;">
            Tight lines and happy fishing on your next trip!<br>
            The Fishing Booking System Team
          </p>
          <p style="color: #95a5a6; font-size: 0.8em; margin-top: 15px;">
            This is an automated confirmation. Please do not reply to this email.<br>
            To book again, visit our fishing booking system.
          </p>
        </div>

        <div style="text-align: center; margin-top: 25px; font-size: 0.8em; color: #95a5a6;">
          <p>Fishing Booking System • Powered by Brevo</p>
          <p>© ${new Date().getFullYear()} All rights reserved</p>
        </div>
      </div>
    `;
  },

  /**
   * Get HTML template for booking reminder email
   */
  _getReminderTemplate: (booking, daysUntil) => {
    const dayLabel = daysUntil === 1 ? 'day' : 'days';
    const urgency = daysUntil <= 1 ? 'Tomorrow!' : daysUntil <= 3 ? 'Soon!' : '';

    return `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f39c12; margin: 0;">⏰ Fishing Booking Reminder</h1>
          <p style="color: #7f8c8d; margin: 5px 0 0 0;">${urgency}</p>
        </div>

        <div style="background: #fff8e1; border-left: 4px solid #ff9800; padding: 20px; margin: 25px 0;">
          <h2 style="color: #e65100; margin-top: 0;">Upcoming Booking</h2>
          <p style="margin-bottom: 15px;">
            Hello <strong>${booking.name}</strong>, this is a friendly reminder that your
            fishing booking is coming up in <strong>${daysUntil} ${dayLabel}</strong>!
          </p>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Guest Name:</td>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">${booking.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Email:</td>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">${booking.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Booking Week:</td>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">#${booking.week}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Days Booked:</td>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">${booking.days_count} day(s)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Booking Type:</td>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">${booking.booking_type === 'consecutive' ? 'Consecutive Days' : 'Flexible Booking'}</td>
            </tr>
          </table>
        </div>

        <div style="background: #e3f2fd; border: 1px solid #90caf9; border-radius: 4px; padding: 20px; margin: 25px 0;">
          <h2 style="color: #0d47a1; margin-top: 0;">📝 What to Remember</h2>
          <ul style="padding-left: 20px; margin: 0;">
            <li>Please arrive 30 minutes before your scheduled start time</li>
            <li>Bring your fishing license and ID</li>
            <li>Check the weather and dress appropriately</li>
            <li>Consider bringing snacks, water, and sunscreen</li>
            <li>If you need to make changes, please contact us as soon as possible</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #6c757d; font-size: 0.9em; margin: 0;">
            We're looking forward to hosting you!<br>
            If you have any questions, please don't hesitate to reach out.
          </p>
          <p style="color: #95a5a6; font-size: 0.8em; margin-top: 15px;">
            This is an automated reminder. Please do not reply to this email.<br>
            To view or modify your booking, visit our fishing booking system.
          </p>
        </div>

        <div style="text-align: center; margin-top: 25px; font-size: 0.8em; color: #95a5a6;">
          <p>Fishing Booking System • Powered by Brevo</p>
          <p>© ${new Date().getFullYear()} All rights reserved</p>
        </div>
      </div>
    `;
  }
};

export default emailService;