import "dotenv/config";
import { db, usersTable } from "../src/index.js";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  try {
    // Check if admin already exists
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (existingUser) {
      console.log("Admin already exists.");
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user object
    const adminUser = {
      email,
      password: hashedPassword,
      full_name: process.env.ADMIN_FULLNAME || "Admin User",
      phone: process.env.ADMIN_PHONE || null,
      role: "ADMIN",
      is_active: true,
      email_verified: true,
    };

    // Insert admin into database
    await db.insert(usersTable).values(adminUser);

    console.log("Admin seeded successfully.");
  } catch (error) {
    console.error("Error seeding admin:", error);
  }
};

seedAdmin().then(() => process.exit());
