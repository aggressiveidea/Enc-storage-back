import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import authRouter from "./routers/auth.router";
import UserRouter from "./routers/User.router";
import fileRouter from "./routers/file.routes";
import { connect } from "./config/db";
import morgan from "morgan";
import cors from "cors";

const app = express();
const PORT = process.env.PORT;

// fixing the storage directory issue
const encryptedDir = path.join(process.cwd(), "public", "encrypted");
if (!fs.existsSync(encryptedDir)) {
  fs.mkdirSync(encryptedDir, { recursive: true });
  console.log(`Created storage directory: ${encryptedDir}`);
}

connect().catch((error) => {
  console.error("Failed to connect to database:", error.message);
  process.exit(1);
});
const URL = process.env.FRONT_URL;

if (!URL) {
  throw new Error("FRONT_URL is missing in .env");
}
app.use(express.json({ limit: "10mb" })); 
app.use(morgan("dev"));
app.use(
  cors({
    origin: [URL],
    methods: "GET,POST,PUT,DELETE,PATCH",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true,
  })
);

app.use("/api/auth", authRouter);
app.use("/api/user", UserRouter);
app.use("/api/file", fileRouter);

app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is running!", port: PORT });
});

app.listen(PORT, () => {
  console.log(`\n Server running on port ${PORT}`);
  console.log(`   Auth API:  http://localhost:${PORT}/api/auth`);
  console.log(`   Users API: http://localhost:${PORT}/api/user`);
  console.log(`   File API:  http://localhost:${PORT}/api/file`);
  console.log(`   Health:    http://localhost:${PORT}/health\n`);
});