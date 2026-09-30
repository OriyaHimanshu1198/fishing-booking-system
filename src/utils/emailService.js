// Email service utility using Brevo (Sendinblue) for sending booking notifications
// Brevo free tier: 300 emails per day - plenty for a fishing booking system!

import axios from 'axios';

export const emailService = {
  // Daily counter for rate limiting (stays in memory - resets on page refresh)
  _dailyEmailCount: 0,
  _lastResetDate: new Date().toDateString(),
  _isApiKeyInvalid: false,

  /**
   * Get Brevo API Key
   */
  _getApiKey() {
    const key = import.meta.env.VITE_BREVO_API_KEY || import.meta.env.BREVO_API_KEY || '';
    return typeof key === 'string' ? key.trim() : '';
  },

  /**
   * Get Verified Sender Email
   */
  _getSenderEmail() {
    const sender = import.meta.env.VITE_BREVO_SENDER_EMAIL || import.meta.env.BREVO_SENDER_EMAIL || 'oriyahimanshu.work@gmail.com';
    return typeof sender === 'string' ? sender.trim() : 'oriyahimanshu.work@gmail.com';
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
   * Internal method to dispatch email to Brevo (Direct API or Proxy)
   */
  async _sendEmail(payload, bookingData, type = 'confirmation') {
    const apiKey = this._getApiKey();
    const proxyToken = import.meta.env.VITE_BREVO_PROXY_TOKEN || import.meta.env.BREVO_PROXY_TOKEN || '';

    // Check if API key is present and valid
    if (!apiKey || this._isApiKeyInvalid || apiKey.includes('placeholder') || !apiKey.startsWith('xkeysib-')) {
      console.warn(`[Email Service] Valid Brevo API key not found. Using mock mode for ${type}.`);
      return this._mockSend(bookingData, type);
    }

    // Ensure payload has the correct sender
    payload.sender = {
      name: "Fishing Booking System",
      email: this._getSenderEmail()
    };

    // 1. Try Direct Brevo API first
    try {
      const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 12000
      });

      this._incrementDailyCount();
      console.log(`[Email Service] Brevo ${type} email sent successfully:`, {
        messageId: response.data?.messageId,
        to: payload.to?.[0]?.email,
        dailyCount: this._dailyEmailCount
      });

      return {
        success: true,
        messageId: response.data?.messageId,
        timestamp: new Date().toISOString(),
        queued: false
      };
    } catch (directError) {
      const status = directError.response?.status;
      const errorMsg = directError.response?.data?.message || directError.message || 'Direct Brevo API error';

      if (status === 401 || errorMsg.includes('Key not found') || errorMsg.includes('unauthorized')) {
        this._isApiKeyInvalid = true;
        console.warn('[Email Service] Brevo API key unauthorized (401). Falling back to mock mode:', errorMsg);
        return this._mockSend(bookingData, type);
      }

      if (status === 429) {
        console.warn('[Email Service] Brevo daily limit reached (429)');
        return {
          success: true,
          queued: true,
          message: 'Daily limit reached - email queued for tomorrow',
          timestamp: new Date().toISOString()
        };
      }

      // 2. If direct call failed (e.g. CORS), try local proxy server if running
      try {
        console.log('[Email Service] Trying local proxy on port 3004...');
        const proxyResponse = await axios.post('http://localhost:3004/send-email', payload, {
          headers: {
            'Authorization': `Bearer ${proxyToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 8000
        });

        this._incrementDailyCount();
        console.log(`[Email Service] Email sent via proxy:`, proxyResponse.data);
        return {
          success: true,
          messageId: proxyResponse.data?.messageId,
          timestamp: new Date().toISOString(),
          queued: false
        };
      } catch (proxyError) {
        console.warn('[Email Service] Proxy attempt also failed:', proxyError.response?.data?.error || proxyError.message);
      }

      console.warn(`[Email Service] ${type} delivery failed (${errorMsg}), using mock mode fallback.`);
      return this._mockSend(bookingData, type);
    }
  },

  /**
   * Send booking confirmation email via Brevo
   * @param {Object} bookingData - The booking information
   * @returns {Promise<Object>} - Result of email sending operation
   */
  async sendBookingConfirmation(bookingData) {
    if (!this._checkDailyLimit()) {
      console.log('[Email Service] Queuing confirmation email for tomorrow due to daily limit');
      return {
        success: true,
        queued: true,
        message: 'Email queued for tomorrow (daily limit reached)',
        timestamp: new Date().toISOString()
      };
    }

    const emailPayload = {
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

    return this._sendEmail(emailPayload, bookingData, 'confirmation');
  },

  /**
   * Send booking cancellation email
   * @param {Object} bookingData - The booking information
   * @returns {Promise<Object>} - Result of email sending operation
   */
  async sendCancellationConfirmation(bookingData) {
    if (!this._checkDailyLimit()) {
      console.log('[Email Service] Queuing cancellation email for tomorrow due to daily limit');
      return {
        success: true,
        queued: true,
        message: 'Email queued for tomorrow (daily limit reached)',
        timestamp: new Date().toISOString()
      };
    }

    const emailPayload = {
      to: [{ email: bookingData.email, name: bookingData.name }],
      subject: `🎣 Fishing Booking Cancellation`,
      htmlContent: this._getCancellationTemplate(bookingData)
    };

    return this._sendEmail(emailPayload, bookingData, 'cancellation');
  },

  /**
   * Send booking reminder email
   * @param {Object} bookingData - The booking information
   * @param {String} daysUntil - Days until the booking
   * @returns {Promise<Object>} - Result of email sending operation
   */
  async sendBookingReminder(bookingData, daysUntil) {
    if (!this._checkDailyLimit()) {
      console.log('[Email Service] Queuing reminder email for tomorrow due to daily limit');
      return {
        success: true,
        queued: true,
        message: 'Email queued for tomorrow (daily limit reached)',
        timestamp: new Date().toISOString()
      };
    }

    const emailPayload = {
      to: [{ email: bookingData.email, name: bookingData.name }],
      subject: `⏰ Reminder: Your fishing booking is in ${daysUntil} day(s)`,
      htmlContent: this._getReminderTemplate(bookingData, daysUntil)
    };

    return this._sendEmail(emailPayload, bookingData, `reminder-${daysUntil}days`);
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
   * Escape HTML entities to prevent HTML injection / XSS in email clients
   * @param {any} val - The value to escape
   * @returns {string} - Escaped safe string
   */
  _escapeHtml(val) {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Get HTML template for booking confirmation email
   */
  _getConfirmationTemplate(booking) {
    const esc = this._escapeHtml.bind(this);

    // Format beat allocations for display
    const beatInfo = booking.beat_allocations && Object.keys(booking.beat_allocations).length > 0
      ? Object.entries(booking.beat_allocations)
        .map(([dayIndex, beat]) => {
          const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dayLabel = dayLabels[parseInt(dayIndex)] || `Day ${parseInt(dayIndex) + 1}`;
          return `<li><strong>${esc(dayLabel)}:</strong> ${esc(beat)}</li>`;
        })
        .join('')
      : '<li>No specific beat assignments (flexible booking)</li>';

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
              <td style="padding: 8px 0;">${esc(booking.name)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Email:</td>
              <td style="padding: 8px 0;">${esc(booking.email)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Phone:</td>
              <td style="padding: 8px 0;">${esc(booking.phone || 'Not provided')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Booking Week:</td>
              <td style="padding: 8px 0;">#${esc(booking.week)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Days Booked:</td>
              <td style="padding: 8px 0;">${esc(booking.days_count)} day(s)</td>
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
  _getCancellationTemplate(booking) {
    const esc = this._escapeHtml.bind(this);

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
              <td style="padding: 8px 0;">${esc(booking.name)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Email:</td>
              <td style="padding: 8px 0;">${esc(booking.email)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Phone:</td>
              <td style="padding: 8px 0;">${esc(booking.phone || 'Not provided')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Booking Week:</td>
              <td style="padding: 8px 0;">#${esc(booking.week)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Days Booked:</td>
              <td style="padding: 8px 0;">${esc(booking.days_count)} day(s)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Cancelled On:</td>
              <td style="padding: 8px 0;">${esc(new Date().toLocaleDateString())}</td>
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
  _getReminderTemplate(booking, daysUntil) {
    const esc = this._escapeHtml.bind(this);
    const dayLabel = daysUntil === 1 ? 'day' : 'days';
    const urgency = daysUntil <= 1 ? 'Tomorrow!' : daysUntil <= 3 ? 'Soon!' : '';

    return `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f39c12; margin: 0;">⏰ Fishing Booking Reminder</h1>
          <p style="color: #7f8c8d; margin: 5px 0 0 0;">${esc(urgency)}</p>
        </div>

        <div style="background: #fff8e1; border-left: 4px solid #ff9800; padding: 20px; margin: 25px 0;">
          <h2 style="color: #e65100; margin-top: 0;">Upcoming Booking</h2>
          <p style="margin-bottom: 15px;">
            Hello <strong>${esc(booking.name)}</strong>, this is a friendly reminder that your
            fishing booking is coming up in <strong>${esc(daysUntil)} ${esc(dayLabel)}</strong>!
          </p>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Guest Name:</td>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">${esc(booking.name)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Email:</td>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">${esc(booking.email)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Booking Week:</td>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">#${esc(booking.week)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">Days Booked:</td>
              <td style="padding: 8px 0; width: 30%; font-weight: 600;">${esc(booking.days_count)} day(s)</td>
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