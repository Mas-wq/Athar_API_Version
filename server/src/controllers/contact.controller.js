import { sendVerificationEmail } from "../../services/email.js";
import "dotenv/config";

export const sendContactMessage = async (req, res) => {
  const { name, email, subject, message } = req.body;

  try {
    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const adminEmail =
      process.env.ADMIN_CONTACT_EMAIL || "admin@athar.local";

    // Email template for admin
    const adminEmailBody = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #10b981;">New Contact Message from Athar</h2>
        <p><strong>From:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr style="border: 1px solid #e5e7eb;">
        <h3>Message:</h3>
        <p>${message.replace(/\n/g, "<br>")}</p>
        <hr style="border: 1px solid #e5e7eb;">
        <p style="color: #666; font-size: 12px;">
          This message was sent via the Athar contact form.
        </p>
      </div>
    `;

    // Email template for user confirmation
    const userEmailBody = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #10b981;">Thank You for Contacting Athar</h2>
        <p>Hi ${name},</p>
        <p>We have received your message and our operations team will get back to you shortly.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Your Message Summary:</strong></p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, "<br>")}</p>
        </div>
        <p>Thank you for using Athar!</p>
        <p>Best regards,<br><strong>Athar Operations Team</strong></p>
      </div>
    `;

    // Send email to admin
    await sendVerificationEmail(
      adminEmail,
      `New Contact Message: ${subject}`,
      adminEmailBody,
    );

    // Send confirmation email to user
    await sendVerificationEmail(
      email,
      "We received your message - Athar",
      userEmailBody,
    );

    return res.status(200).json({
      success: true,
      message: "Message sent successfully. We will get back to you soon.",
    });
  } catch (error) {
    console.error("Contact message error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send message. Please try again later.",
      error: error.message,
    });
  }
};
