import 'dotenv/config';   // must be the very first import

import express from 'express';

import indexRoutes from "./routes/index.routes.js";
import chatRoutes from "./routes/chat.routes.js"
import authRoutes from "./routes/auth.routes.js";
import reposRoutes from "./routes/repos.routes.js";
import { serve } from "inngest/express";
import { functions } from './inngest/index.js';
import { inngest } from './inngest/client.js';
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { clerkConfigured, requireUser } from "./middleware/auth.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
if (clerkConfigured) {
  app.use(clerkMiddleware());
}

app.use("/api/inngest", serve({ client: inngest, functions }));

app.get('/', (req, res) => {
  res.send('Hello World');
});
app.use("/api/auth", authRoutes);
app.use("/api/repos", reposRoutes);
app.use("/api/index", requireUser, indexRoutes);
app.use("/api/chat", requireUser, chatRoutes);



app.listen(8000, () => {
  console.log(`Server is running on port:http://localhost:8000`);
});