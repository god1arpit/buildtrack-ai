import dotenv from "dotenv";
import { store } from "./embeddedStore.js";

dotenv.config();

export const connectDB = async () => {
  console.log(`[DB] Embedded persistent datastore initialized at: server/data/db.json`);
  console.log(`[DB] Ready to serve requests.`);
};

export const closeDB = async () => {
  store.save();
};
