// middlewares/authMiddleware.ts
import { prisma } from "@/lib/prisma";
import { clerkClient, verifyToken } from "@clerk/express";
import { NextFunction, Request, Response } from "express";

// Middleware to verify Clerk JWT from Authorization header
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify Clerk JWT using Clerk's recommended method
    const payload = await verifyToken(token, {
      jwtKey: process.env.CLERK_JWT_KEY,
      authorizedParties: [process.env.CLERK_AUTHORIZED_PARTY],
    });

    const clerkId = payload.sub;
    if (!clerkId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    // Find or create user in DB
    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      user = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0].emailAddress,
          name: clerkUser.firstName || "",
          profileImageUrl: clerkUser.imageUrl || "",
        },
      });
    }

    (req as any).user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(401).json({ error: "Authentication failed" });
  }
};
