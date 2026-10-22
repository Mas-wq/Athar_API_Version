import { db } from "../index.js";
import {
  usersTable,
  usersPendingTable,
  passwordResetTable,
} from "../models/index.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, desc, sql } from "drizzle-orm";
import otpGenerator from "otp-generator";
import { sendVerificationEmail } from "../../services/email.js";
import { generateEmailTemplate } from "../utils/emailTemplates.js";

const showLocalVerificationCodes =
  process.env.SHOW_LOCAL_VERIFICATION_CODES === "true" &&
  process.env.NODE_ENV !== "production";

const baseCookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: "Lax",
  path: "/",
};

export const register = async (req, res) => {
  const { email, password, full_name, phone } = req.body;

  try {
    // 1. Check if user already exists in the FINAL users table
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists and is verified." });
    }

    const verificationCode = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 5);
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Use Upsert (onConflictDoUpdate) so if they register again within 24h,
    // we just update their pending record instead of throwing an error.
    await db
      .insert(usersPendingTable)
      .values({
        email,
        password: hashedPassword,
        full_name,
        phone,
        otp_verification_code: verificationCode,
        otp_expires_at: expires,
      })
      .onConflictDoUpdate({
        target: usersPendingTable.email,
        set: {
          password: hashedPassword,
          full_name,
          phone,
          otp_verification_code: verificationCode,
          otp_expires_at: expires,
          updated_at: new Date(),
        },
      });

    // 3. Send Email (Code omitted for brevity, same as yours)
    try {
      await sendVerificationEmail(
        email,
        "Verify your email",
        generateEmailTemplate(full_name, verificationCode),
      );
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Continue anyway - user can still verify via OTP even if email fails
    }

    return res
      .status(201)
      .json({
        message: "Verification code created. Check the local inbox or use the code below.",
        ...(showLocalVerificationCodes ? { verificationCode } : {}),
      });
  } catch (error) {
    console.error("Registration error:", error.message);
    console.error("Full error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

export const verifyEmail = async (req, res) => {
  const { code, email } = req.query;

  try {
    // 1. Find user in the PENDING table
    const [pendingUser] = await db
      .select()
      .from(usersPendingTable)
      .where(eq(usersPendingTable.email, email));

    if (!pendingUser) {
      return res
        .status(400)
        .json({ message: "No pending registration found." });
    }

    // 2. Check code and expiry
    const isExpired = new Date() > pendingUser.otp_expires_at;
    if (pendingUser.otp_verification_code !== code || isExpired) {
      return res.status(400).json({ message: "Invalid or expired code." });
    }

    let newUser;

    // 3. Move data using a Transaction
    await db.transaction(async (tx) => {
      // Insert into final users table
      const [insertedUser] = await tx
        .insert(usersTable)
        .values({
          email: pendingUser.email,
          password: pendingUser.password,
          full_name: pendingUser.full_name,
          phone: pendingUser.phone,
          email_verified: true,
        })
        .returning(); // Get the new user ID and Role

      newUser = insertedUser;

      // Delete from pending table
      await tx
        .delete(usersPendingTable)
        .where(eq(usersPendingTable.email, email));
    });

    // --- AUTOMATIC LOGIN LOGIC ---

    // 4. Generate JWT token
    const payload = { id: newUser.id, role: newUser.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // 5. Set the Cookie
    res.cookie("token", token, {
      ...baseCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    // 6. Final Success Response
    return res.status(200).json({
      message: "Email verified and logged in successfully!",
      user: {
        id: newUser.id,
        full_name: newUser.full_name,
        role: newUser.role,
        is_active: true,
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ message: "Server error during verification." });
  }
};

export const resendVerificationCode = async (req, res) => {
  const { email } = req.query;

  try {
    const [pendingUser] = await db
      .select()
      .from(usersPendingTable)
      .where(eq(usersPendingTable.email, email));

    if (!pendingUser) {
      return res
        .status(400)
        .json({ message: "No pending registration found." });
    }

    const newCode = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 5);

    await db
      .update(usersPendingTable)
      .set({
        otp_verification_code: newCode,
        otp_expires_at: expires,
        updated_at: new Date(),
      })
      .where(eq(usersPendingTable.email, email));

    await sendVerificationEmail(
      email,
      "New Verification Code",
      generateEmailTemplate(pendingUser.full_name, newCode),
    );

    return res.status(200).json({
      message: "New code created. Check the local inbox or use the code below.",
      ...(showLocalVerificationCodes ? { verificationCode: newCode } : {}),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({ message: "Enter your email and password." });
  }
  if (!process.env.JWT_SECRET) {
    console.error("Login configuration error: JWT_SECRET is missing.");
    return res.status(503).json({ message: "Login is temporarily unavailable. Restart the server after checking its configuration." });
  }

  try {
    // 1. Find user by normalized email
    const [user] = await db
      .select()
      .from(usersTable)
      .where(sql`lower(${usersTable.email}) = ${email}`);

    // Security tip: Use the same message for "user not found" and "wrong password"
    if (!user) {
      return res.status(401).json({ message: "User Not Found" });
    }

    if (user.role === "STAFF") {
      return res.status(403).json({ message: "Staff accounts are no longer supported. Please use a user account." });
    }

    // 2. Check if the account is active (Important for your schema)
    if (!user.is_active) {
      return res
        .status(403)
        .json({ message: "Account is deactivated. Please contact support." });
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Wrong Password" });
    }

    // 4. Generate JWT token
    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d", // 1 week
    });

    // 5. SET HTTP-ONLY COOKIE
    // This hides the token from JavaScript (XSS Protection)
    res.cookie("token", token, {
      ...baseCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    // 6. Return user data (but NOT the token)
    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const logout = async (req, res) => {
  try {
    // 1. Clear the cookie named 'token'
    res.clearCookie("token", {
      ...baseCookieOptions,
    });

    // 2. Return success message
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    // Find user by ID
    const [user] = await db
      .select({
        full_name: usersTable.full_name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        email_verified: usersTable.email_verified,
        created_at: usersTable.created_at,
        is_active: usersTable.is_active,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { full_name, phone } = req.body;

  try {
    // 1. Update and use .returning() to get the updated row back immediately
    const [updatedUser] = await db
      .update(usersTable)
      .set({
        full_name,
        phone,
        updated_at: new Date(), // Assuming you have this column in your schema
      })
      .where(eq(usersTable.id, userId))
      .returning({
        id: usersTable.id,
        full_name: usersTable.full_name,
        phone: usersTable.phone,
        email: usersTable.email,
      });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const changePassword = async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  try {
    // 1. Find user by ID
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // 3. Security Check: Is the new password the same as the old one?
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res
        .status(400)
        .json({ message: "New password cannot be the same as the old one" });
    }

    // 4. Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 5. Update password in DB
    await db
      .update(usersTable)
      .set({
        password: hashedNewPassword,
        updated_at: new Date(),
      })
      .where(eq(usersTable.id, userId));

    // 6. LOGOUT (Optional but Recommended for Security)
    // This forces the user to log in again with the new password
    res.clearCookie("token", {
      ...baseCookieOptions,
    });

    return res.status(200).json({
      message:
        "Password changed successfully. Please log in with your new password.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // 1. Check if user exists and is registered (verified and active)
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    // Security tip: Use the same message for "user not found"
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // 2. Check if user is verified and active
    if (!user.email_verified) {
      return res.status(400).json({
        success: false,
        message:
          "Please verify your email first before resetting your password. Check your inbox for verification link.",
      });
    }

    if (!user.is_active) {
      return res.status(400).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    // 3. Generate reset code
    const resetCode = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15); // 15 minutes validity

    // 4. Delete any existing reset codes for this email
    await db
      .delete(passwordResetTable)
      .where(eq(passwordResetTable.email, email));

    // 5. Store new reset code in password_resets table
    await db.insert(passwordResetTable).values({
      email,
      reset_code: resetCode,
      reset_expires_at: expires,
    });

    // 6. Send reset email
    try {
      const resetEmailBody = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #10b981;">Password Reset Request</h2>
          <p>Hi ${user.full_name},</p>
          <p>We received a request to reset your password. Use the code below to reset your password:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="font-size: 32px; font-weight: bold; color: #10b981; letter-spacing: 5px;">${resetCode}</p>
          </div>
          <p><strong>This code will expire in 15 minutes.</strong></p>
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
          <hr style="border: 1px solid #e5e7eb;">
          <p style="color: #666; font-size: 12px;">
            For security, never share this code with anyone. Athar support will never ask for this code.
          </p>
        </div>
      `;

      await sendVerificationEmail(
        email,
        "Reset Your Password - Athar",
        resetEmailBody,
      );
    } catch (emailError) {
      console.error("Password reset email error:", emailError);
      // Continue anyway - user can still reset
    }

    return res.status(200).json({
      success: true,
      message: "Password reset code created. It expires in 15 minutes.",
      ...(showLocalVerificationCodes ? { resetCode } : {}),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    // 1. Validate inputs
    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, reset code, and new password are required",
      });
    }

    // 2. Find valid reset code (get the most recent one)
    const [resetRecord] = await db
      .select()
      .from(passwordResetTable)
      .where(eq(passwordResetTable.email, email))
      .orderBy(desc(passwordResetTable.created_at))
      .limit(1);

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: "No password reset request found for this email",
      });
    }

    // 3. Check code validity
    const isExpired = new Date() > resetRecord.reset_expires_at;
    if (resetRecord.reset_code !== code || isExpired) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset code",
      });
    }

    if (resetRecord.is_used) {
      return res.status(400).json({
        success: false,
        message: "This reset code has already been used",
      });
    }

    // 4. Find user
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // 5. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 6. Update password and mark reset code as used
    await db.transaction(async (tx) => {
      await tx
        .update(usersTable)
        .set({
          password: hashedPassword,
          updated_at: new Date(),
        })
        .where(eq(usersTable.id, user.id));

      await tx
        .update(passwordResetTable)
        .set({
          is_used: true,
          updated_at: new Date(),
        })
        .where(eq(passwordResetTable.id, resetRecord.id));
    });

    // 7. Send confirmation email
    try {
      const confirmationEmailBody = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #10b981;">Password Reset Successful</h2>
          <p>Hi ${user.full_name},</p>
          <p>Your password has been successfully reset. You can now log in with your new password.</p>
          <p style="margin-top: 20px;">If you didn't reset your password, please contact our support team immediately.</p>
          <hr style="border: 1px solid #e5e7eb;">
          <p style="color: #666; font-size: 12px;">
            For security, never share your password with anyone.
          </p>
        </div>
      `;

      await sendVerificationEmail(
        email,
        "Password Reset Confirmed - Athar",
        confirmationEmailBody,
      );
    } catch (emailError) {
      console.error("Confirmation email error:", emailError);
    }

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
