import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import authRouter from "./routers/auth.router"
import UserRouter from "./routers/User.router"
import fileRouter from "./routers/file.routes"
import auditRouter from "./routers/audit.router"
import { connect } from "./config/db"
import morgan from "morgan"
import cors from "cors"
import helmet from "helmet"
import { errorHandler } from "./middlewares/errorHandler.middleware"

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
const allowAllOrigins = true;

app.use(helmet()); 
app.use(express.json({ limit: "10mb" })); 
app.use(morgan("dev"));
app.use(
  cors({
    origin: allowAllOrigins ? true : undefined,
    methods: "GET,POST,PUT,DELETE,PATCH",
    allowedHeaders: "Content-Type,Authorization",
    exposedHeaders: "x-iv,x-auth-tag,x-encrypted-key",
    credentials: true,
  })
);

app.use("/api/auth", authRouter);
app.use("/api/user", UserRouter);
app.use("/api/file", fileRouter);
app.use("/api/audit", auditRouter);
console.log("DEBUG: Audit routes registered");

app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is running!", port: PORT })
})

// Centralized error handler — must be registered after all routes
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`\n Server running on port ${PORT}`);
  console.log(`   Auth API:  http://localhost:${PORT}/api/auth`);
  console.log(`   Users API: http://localhost:${PORT}/api/user`);
  console.log(`   File API:  http://localhost:${PORT}/api/file`);
  console.log(`   Health:    http://localhost:${PORT}/health\n`);
});