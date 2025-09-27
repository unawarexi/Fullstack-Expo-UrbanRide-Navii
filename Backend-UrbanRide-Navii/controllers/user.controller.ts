import { prisma } from "@/lib/prisma";
import { AccountStatus, Role } from "@prisma/client";
import { Request, Response } from "express";
import { uploadToCloudinary } from "../services/cloduinary";
import { SocketManager } from "../services/socket-io";

let socketManager: SocketManager | undefined;
export function setSocketManager(sm: SocketManager) { socketManager = sm; }

// Types based on our Prisma schema
interface UserCreateData {
  name: string;
  email: string;
  clerkId: string;
  phone?: string;
  profileImageUrl?: string;
  role?: Role;
}

interface UserUpdateData {
  name?: string;
  phone?: string;
  profileImageUrl?: string;
  role?: Role;
  accountStatus?: AccountStatus;
}

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, clerkId, phone, profileImageUrl, role = "USER" }: UserCreateData = req.body;

    // Validate required fields
    if (!name || !email || !clerkId) {
      return res.status(400).json({ error: "Missing required fields: name, email, and clerkId are required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { clerkId }],
      },
      select: {
        id: true,
        email: true,
        clerkId: true,
        accountStatus: true,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        error: "User already exists",
        existingUser: {
          id: existingUser.id,
          email: existingUser.email,
          accountStatus: existingUser.accountStatus,
        },
      });
    }

    // Create new user with wallet in a transaction
    const newUser = await prisma.$transaction(async (tx: any) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name,
          email,
          clerkId,
          phone,
          profileImageUrl,
          role,
          accountStatus: "ACTIVE",
          isEmailVerified: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          clerkId: true,
          phone: true,
          profileImageUrl: true,
          role: true,
          accountStatus: true,
          rating: true,
          totalRides: true,
          joinedAt: true,
          lastActiveAt: true,
        },
      });

      // Create wallet for new user
      await tx.wallet.create({
        data: {
          userId: user.id,
          balance: 0,
          isActive: true,
        },
      });

      return user;
    });

    return res.status(201).json({
      success: true,
      data: newUser,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { clerkId, ...updateData }: { clerkId: string } & UserUpdateData = req.body;

    if (!clerkId) {
      return res.status(400).json({ error: "clerkId is required for updates" });
    }

    // Check if there are fields to update
    const hasUpdates = Object.keys(updateData).some((key) => updateData[key as keyof UserUpdateData] !== undefined);

    if (!hasUpdates) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // If profileImageUrl is being updated and file is present
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, req.file.originalname, "users/profile_images");
      updateData.profileImageUrl = uploadResult.url;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { clerkId },
      data: {
        ...updateData,
        lastActiveAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        clerkId: true,
        phone: true,
        profileImageUrl: true,
        role: true,
        accountStatus: true,
        rating: true,
        totalRides: true,
        joinedAt: true,
        lastActiveAt: true,
        isEmailVerified: true,
        isPhoneVerified: true,
      },
    });

    if (socketManager) {
      socketManager.emitToRoom(`user_${updatedUser.id}`, "user_profile_updated", { user: updatedUser });
    }

    return res.status(200).json({
      success: true,
      data: updatedUser,
      message: "User updated successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return res.status(404).json({ error: "User not found" });
    }

    console.error("Error updating user:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const { clerkId, email, includeProfile, includeStats } = req.query;

    if (!clerkId && !email) {
      return res.status(400).json({ error: "clerkId or email is required" });
    }

    // Build where clause
    const whereClause = clerkId ? { clerkId: clerkId as string } : { email: email as string };

    // Build include clause based on query parameters
    const includeClause: any = {};

    if (includeProfile === "true") {
      includeClause.driverProfile = {
        select: {
          id: true,
          licenseNumber: true,
          licenseExpiry: true,
          identityNumber: true,
          identityType: true,
          isVerified: true,
          isOnline: true,
          currentLatitude: true,
          currentLongitude: true,
          rating: true,
          totalRides: true,
          totalEarnings: true,
        },
      };
      includeClause.adminProfile = {
        select: {
          id: true,
          employeeId: true,
          department: true,
          isVerified: true,
        },
      };
      includeClause.wallet = {
        select: {
          balance: true,
          isActive: true,
        },
      };
    }

    // Get user data
    const userData = await prisma.user.findUnique({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        clerkId: true,
        phone: true,
        profileImageUrl: true,
        role: true,
        accountStatus: true,
        rating: true,
        totalRides: true,
        joinedAt: true,
        lastActiveAt: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        ...includeClause,
      },
    });

    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get additional stats if requested
    let additionalStats = {};
    if (includeStats === "true") {
      const [rideStats, favoriteLocationsCount] = await Promise.all([
        prisma.ride.groupBy({
          by: ["status"],
          where: { userId: userData.id },
          _count: true,
        }),
        prisma.favoriteLocation.count({
          where: { userId: userData.id },
        }),
      ]);

      const completedRides = rideStats.find((stat: any) => stat.status === "COMPLETED")?._count || 0;
      const cancelledRides = rideStats.find((stat: any) => stat.status === "CANCELLED")?._count || 0;

      // Get average user rating (ratings given to this user by drivers)
      const avgUserRating = await prisma.rating.aggregate({
        where: {
          userId: userData.id,
          isUserToDriver: false, // Ratings given to user by drivers
        },
        _avg: {
          rating: true,
        },
      });

      additionalStats = {
        completedRides,
        cancelledRides,
        avgUserRating: avgUserRating._avg.rating ? Number(avgUserRating._avg.rating) : null,
        favoriteLocationsCount,
      };
    }

    // Format driver profile location data
    let formattedUserData = { ...userData };
    if (includeProfile === "true" && userData.driverProfile) {
      formattedUserData = {
        ...userData,
        driverProfile: {
          ...userData.driverProfile,
          currentLocation:
            userData.driverProfile.currentLatitude && userData.driverProfile.currentLongitude
              ? {
                  latitude: Number(userData.driverProfile.currentLatitude),
                  longitude: Number(userData.driverProfile.currentLongitude),
                }
              : null,
          currentLatitude: undefined,
          currentLongitude: undefined,
        },
      };
      // Remove the separate lat/lng fields
      delete (formattedUserData.driverProfile as any).currentLatitude;
      delete (formattedUserData.driverProfile as any).currentLongitude;
    }

    // Update last_active_at when user is fetched
    await prisma.user.update({
      where: whereClause,
      data: { lastActiveAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      data: { ...formattedUserData, ...additionalStats },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const patchUser = async (req: Request, res: Response) => {
  try {
    const { clerkId, ...updateData }: { clerkId: string } & Partial<UserUpdateData> = req.body;

    if (!clerkId) {
      return res.status(400).json({ error: "clerkId is required for profile updates" });
    }

    // Check if user exists and get current data
    const existingUser = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        accountStatus: true,
      },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if account is active
    if (existingUser.accountStatus === "SUSPENDED" || existingUser.accountStatus === "DEACTIVATED") {
      return res.status(403).json({ error: "Account is suspended or deactivated" });
    }

    // Validate phone number if provided
    if (updateData.phone) {
      const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(updateData.phone)) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }
    }

    // Filter out undefined values
    const filteredUpdateData = Object.fromEntries(Object.entries(updateData).filter(([_, value]) => value !== undefined && value !== null));

    if (Object.keys(filteredUpdateData).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    // Prepare update data
    const updatePayload: any = {
      ...filteredUpdateData,
      lastActiveAt: new Date(),
    };

    // Reset phone verification if phone is being updated
    if (updateData.phone) {
      updatePayload.isPhoneVerified = false;
    }

    // Execute update
    const updatedUser = await prisma.user.update({
      where: { clerkId },
      data: updatePayload,
      select: {
        id: true,
        name: true,
        email: true,
        clerkId: true,
        phone: true,
        profileImageUrl: true,
        role: true,
        accountStatus: true,
        rating: true,
        totalRides: true,
        joinedAt: true,
        lastActiveAt: true,
        isEmailVerified: true,
        isPhoneVerified: true,
      },
    });

    if (socketManager) {
      socketManager.emitToRoom(`user_${updatedUser.id}`, "user_profile_updated", { user: updatedUser });
    }

    return res.status(200).json({
      success: true,
      data: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { clerkId, reason } = req.body;

    if (!clerkId) {
      return res.status(400).json({ error: "clerkId is required for account deactivation" });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        role: true,
        name: true,
        email: true,
      },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Perform deactivation in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Soft delete - update account status
      const deactivatedUser = await tx.user.update({
        where: { clerkId },
        data: {
          accountStatus: "DEACTIVATED",
        },
        select: {
          id: true,
          name: true,
          email: true,
          accountStatus: true,
        },
      });

      // If user is a driver, set them offline
      if (existingUser.role === "DRIVER") {
        await tx.driver.updateMany({
          where: { userId: existingUser.id },
          data: { isOnline: false },
        });
      }

      // Log the deactivation
      await tx.systemLog.create({
        data: {
          userId: existingUser.id,
          action: "account_deactivated",
          entityType: "user",
          entityId: existingUser.id,
          details: {
            reason: reason || "User requested deactivation",
            timestamp: new Date().toISOString(),
          },
        },
      });

      return deactivatedUser;
    });

    if (socketManager) {
      socketManager.emitToRoom(`user_${result.id}`, "user_account_deactivated", { userId: result.id });
    }

    return res.status(200).json({
      success: true,
      data: result,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    console.error("Error deactivating user:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
