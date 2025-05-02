import { Resend } from "resend";
import { env } from "~/env";

// Initialize Resend with API key
const resend = new Resend(env.RESEND_API_KEY);

/**
 * Email service for sending various types of emails
 */
export const emailService = {
  /**
   * Send an invitation email to a participant
   * @param email Recipient email address
   * @param name Recipient name (optional)
   * @param inviteUrl URL for the invitation link
   * @returns Promise with the result of the email sending operation
   */
  async sendInvitation(
    email: string,
    name: string | null | undefined,
    inviteUrl: string,
  ) {
    const recipientName = name || email.split("@")[0];

    try {
      const { data, error } = await resend.emails.send({
        from: "Scotty Olympics <scotty-olympics@jmjpickard.com>",
        to: email,
        subject: "You're Invited to Scotty Olympics!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #2e026d; color: white; padding: 20px; text-align: center;">
              <h1>Scotty Olympics</h1>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <p>Hello ${recipientName},</p>
              <p>You've been invited to join the most prestigious sporting event in Scotty's realm!</p>
              <p>Click the button below to accept your invitation and join the competition:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="background-color: #6d28d9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                  Accept Invitation
                </a>
              </div>
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #eee; padding: 10px; border-radius: 4px;">
                ${inviteUrl}
              </p>
              <p>This invitation link will expire in 7 days.</p>
              <p>We look forward to seeing you at the Scotty Olympics!</p>
            </div>
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        `,
      });

      if (error) {
        console.error("Error sending invitation email:", error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Exception sending invitation email:", error);
      return { success: false, error };
    }
  },
};
