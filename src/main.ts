import express from "express"
import authRouter from "./routers/auth.router"
import UserRouter from './routers/User.router'

import { connect } from "./config/db"
import morgan from "morgan"
import cors from 'cors'
const app = express()
const PORT = process.env.PORT 

connect().catch((error) => {
  console.error("failed to connect to database:", error.message)
  process.exit(1)
})

app.use(express.json())
app.use(morgan("dev"))
app.use(
  cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE,PATCH",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true,
  })
);
app.use("/api/auth", authRouter)
app.use('/api/user', UserRouter)
app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is running!" })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  console.log(`auth API available at http://localhost:${PORT}/api/auth`);
  console.log(`users API available at http://localhost:${PORT}/api/users`);
})