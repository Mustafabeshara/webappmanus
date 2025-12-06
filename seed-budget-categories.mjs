import { drizzle } from "drizzle-orm/mysql2";
import { budgetCategories } from "./drizzle/schema.ts";
import dotenv from "dotenv";

dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

const categories = [
  { name: "Medical Supplies", code: "MED-SUP", description: "General medical supplies and consumables" },
  { name: "Equipment", code: "EQUIP", description: "Medical equipment and machinery" },
  { name: "Pharmaceuticals", code: "PHARMA", description: "Pharmaceutical products and drugs" },
  { name: "Personnel", code: "PERSONNEL", description: "Staff salaries and benefits" },
  { name: "Operations", code: "OPS", description: "Operational expenses" },
  { name: "Maintenance", code: "MAINT", description: "Equipment and facility maintenance" },
  { name: "IT & Technology", code: "IT", description: "Information technology and software" },
  { name: "Marketing", code: "MARKET", description: "Marketing and promotional activities" },
  { name: "Training", code: "TRAIN", description: "Staff training and development" },
  { name: "Facilities", code: "FAC", description: "Facility costs and utilities" },
];

async function seed() {
  console.log("Seeding budget categories...");
  
  for (const category of categories) {
    try {
      await db.insert(budgetCategories).values(category);
      console.log(`✓ Created: ${category.name}`);
    } catch (error) {
      console.log(`✗ Skipped: ${category.name} (already exists)`);
    }
  }
  
  console.log("Done!");
  process.exit(0);
}

seed();
