import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhone) {
  console.warn('⚠️ Twilio credentials missing - SMS disabled');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export const smsService = {
  // Send SMS
  async send(to: string, message: string) {
    if (!client) {
      console.log(`📱 [MOCK] SMS to ${to}: ${message}`);
      return { success: true, mock: true };
    }

    try {
      const result = await client.messages.create({
        body: message,
        to,
        from: twilioPhone
      });
      console.log(`SMS sent to ${to}: ${result.sid}`);
      return result;
    } catch (error) {
      console.error(`MS failed to ${to}:`, error);
      return null;
    }
  },

  // Send tracking number
  async sendTrackingNumber(phone: string, trackingNumber: string) {
    const message = `SwiftTrack: Your package ${trackingNumber} has been created. Track: http://localhost:3000/track/${trackingNumber}`;
    return this.send(phone, message);
  },

  // Send status update
  async sendStatusUpdate(phone: string, trackingNumber: string, status: string) {
    const message = `SwiftTrack: Package ${trackingNumber} is now ${status}. Track: http://localhost:3000/track/${trackingNumber}`;
    return this.send(phone, message);
  },

  // Send delivery confirmation
  async sendDeliveryConfirmation(phone: string, trackingNumber: string) {
    const message = `SwiftTrack: Package ${trackingNumber} has been delivered! Thank you for using SwiftTrack.`;
    return this.send(phone, message);
  }
};