import { AccountStatus, Role } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

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

export async function POST(request: Request) {
  try {
    const { name, email, clerkId, phone, profileImageUrl, role = "USER" }: UserCreateData = await request.json();

    // Validate required fields
    if (!name || !email || !clerkId) {
      return Response.json({ error: "Missing required fields: name, email, and clerkId are required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ error: "Invalid email format" }, { status: 400 });
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
      return Response.json(
        {
          error: "User already exists",
          existingUser: {
            id: existingUser.id,
            email: existingUser.email,
            accountStatus: existingUser.accountStatus,
          },
        },
        { status: 409 }
      );
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

    return Response.json(
      {
        success: true,
        data: newUser,
        message: "User created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return Response.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { clerkId, ...updateData }: { clerkId: string } & UserUpdateData = await request.json();

    if (!clerkId) {
      return Response.json({ error: "clerkId is required for updates" }, { status: 400 });
    }

    // Check if there are fields to update
    const hasUpdates = Object.keys(updateData).some((key) => updateData[key as keyof UserUpdateData] !== undefined);

    if (!hasUpdates) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
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

    return Response.json(
      {
        success: true,
        data: updatedUser,
        message: "User updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    console.error("Error updating user:", error);
    return Response.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clerkId = url.searchParams.get("clerkId");
    const email = url.searchParams.get("email");
    const includeProfile = url.searchParams.get("includeProfile") === "true";
    const includeStats = url.searchParams.get("includeStats") === "true";

    if (!clerkId && !email) {
      return Response.json({ error: "clerkId or email is required" }, { status: 400 });
    }

    // Build where clause
    const whereClause = clerkId ? { clerkId } : { email: email! };

    // Build include clause based on query parameters
    const includeClause: any = {};

    if (includeProfile) {
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
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Get additional stats if requested
    let additionalStats = {};
    if (includeStats) {
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
    if (includeProfile && userData.driverProfile) {
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

    return Response.json(
      {
        success: true,
        data: { ...formattedUserData, ...additionalStats },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching user:", error);
    return Response.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PATCH endpoint for profile completion/partial updates
export async function PATCH(request: Request) {
  try {
    const { clerkId, ...updateData }: { clerkId: string } & Partial<UserUpdateData> = await request.json();

    if (!clerkId) {
      return Response.json({ error: "clerkId is required for profile updates" }, { status: 400 });
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
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Check if account is active
    if (existingUser.accountStatus === "SUSPENDED" || existingUser.accountStatus === "DEACTIVATED") {
      return Response.json({ error: "Account is suspended or deactivated" }, { status: 403 });
    }

    // Validate phone number if provided
    if (updateData.phone) {
      const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(updateData.phone)) {
        return Response.json({ error: "Invalid phone number format" }, { status: 400 });
      }
    }

    // Filter out undefined values
    const filteredUpdateData = Object.fromEntries(Object.entries(updateData).filter(([_, value]) => value !== undefined && value !== null));

    if (Object.keys(filteredUpdateData).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
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

    return Response.json(
      {
        success: true,
        data: updatedUser,
        message: "Profile updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating user profile:", error);
    return Response.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint for account deactivation (soft delete)
export async function DELETE(request: Request) {
  try {
    const { clerkId, reason } = await request.json();

    if (!clerkId) {
      return Response.json({ error: "clerkId is required for account deactivation" }, { status: 400 });
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
      return Response.json({ error: "User not found" }, { status: 404 });
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

    return Response.json(
      {
        success: true,
        data: result,
        message: "Account deactivated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deactivating user:", error);
    return Response.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
