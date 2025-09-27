import { prisma } from "@/lib/prisma";
import { Request, Response } from "express";
import { uploadToCloudinary } from "../services/cloduinary";
import { SocketManager } from "../services/socket-io";
let socketManager: SocketManager | undefined;
export function setSocketManager(sm: SocketManager) { socketManager = sm; }

// Types based on our Prisma schema
interface DriverCreateData {
  userId: string;
  licenseNumber: string;
  licenseExpiry: string; // ISO date string
  identityNumber: string;
  identityType: string;
  bankAccountNumber?: string;
  bankName?: string;
}

interface DriverUpdateData {
  licenseNumber?: string;
  licenseExpiry?: string;
  identityNumber?: string;
  identityType?: string;
  bankAccountNumber?: string;
  bankName?: string;
  isVerified?: boolean;
  isOnline?: boolean;
  currentLatitude?: number;
  currentLongitude?: number;
}

interface VehicleCreateData {
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  seats: number;
  imageUrls: string[]; // Updated to array of URLs
  insuranceExpiry?: string;
  registrationExpiry?: string;
}

interface LocationUpdateData {
  latitude: number;
  longitude: number;
}

export const registerDriver = async (req: Request, res: Response) => {
  try {
    const { userId, licenseNumber, licenseExpiry, identityNumber, identityType, bankAccountNumber, bankName }: DriverCreateData = req.body;

    // Validate required fields
    if (!userId || !licenseNumber || !licenseExpiry || !identityNumber || !identityType) {
      return res.status(400).json({
        error: "Missing required fields: userId, licenseNumber, licenseExpiry, identityNumber, and identityType are required",
      });
    }

    // Validate license expiry date
    const expiryDate = new Date(licenseExpiry);
    if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
      return res.status(400).json({ error: "License expiry date must be a valid future date" });
    }

    // Check if user exists and has USER role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, accountStatus: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.accountStatus !== "ACTIVE") {
      return res.status(403).json({ error: "User account is not active" });
    }

    // Check if driver profile already exists
    const existingDriver = await prisma.driver.findUnique({
      where: { userId },
    });

    if (existingDriver) {
      return res.status(409).json({ error: "Driver profile already exists for this user" });
    }

    // Check for duplicate license or identity numbers
    const duplicateCheck = await prisma.driver.findFirst({
      where: {
        OR: [{ licenseNumber }, { identityNumber }],
      },
    });

    if (duplicateCheck) {
      return res.status(409).json(
        {
          error: "License number or identity number already exists",
        }
      );
    }

    // Create driver profile and update user role in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Create driver profile
      const driver = await tx.driver.create({
        data: {
          userId,
          licenseNumber,
          licenseExpiry: expiryDate,
          identityNumber,
          identityType,
          bankAccountNumber,
          bankName,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              profileImageUrl: true,
            },
          },
        },
      });

      // Update user role to DRIVER
      await tx.user.update({
        where: { id: userId },
        data: { role: "DRIVER" },
      });

      // Log the registration
      await tx.systemLog.create({
        data: {
          userId,
          action: "driver_registered",
          entityType: "driver",
          entityId: driver.id,
          details: {
            licenseNumber,
            identityType,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return driver;
    });

    return res.status(201).json(
      {
        success: true,
        data: result,
        message: "Driver registered successfully",
      }
    );
  } catch (error) {
    console.error("Error in driver POST:", error);
    return res.status(500).json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};

export const addVehicle = async (req: Request, res: Response) => {
  try {
    const url = new URL(req.url);
    const driverId = url.searchParams.get("driverId");

    if (!driverId) {
      return res.status(400).json({ error: "driverId is required" });
    }

    const vehicleData: VehicleCreateData = req.body;

    // Validate required fields
    if (
      !vehicleData.make ||
      !vehicleData.model ||
      !vehicleData.year ||
      !vehicleData.color ||
      !vehicleData.plateNumber ||
      !vehicleData.seats ||
      !vehicleData.imageUrls ||
      !Array.isArray(vehicleData.imageUrls) ||
      vehicleData.imageUrls.length === 0
    ) {
      return res.status(400).json(
        {
          error: "Missing required fields: make, model, year, color, plateNumber, seats, and imageUrls (array) are required",
        }
      );
    }

    // Validate year
    const currentYear = new Date().getFullYear();
    if (vehicleData.year < 1900 || vehicleData.year > currentYear + 1) {
      return res.status(400).json({ error: "Invalid vehicle year" });
    }

    // Validate seats
    if (vehicleData.seats < 1 || vehicleData.seats > 8) {
      return res.status(400).json({ error: "Seats must be between 1 and 8" });
    }

    // Check if driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, userId: true },
    });

    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    // Check for duplicate plate number
    const duplicatePlate = await prisma.vehicle.findUnique({
      where: { plateNumber: vehicleData.plateNumber },
    });

    if (duplicatePlate) {
      return res.status(409).json({ error: "Vehicle with this plate number already exists" });
    }

    // Handle vehicle image uploads if files present
    if (req.files && Array.isArray(req.files)) {
      const imageUrls = [];
      for (const file of req.files as Express.Multer.File[]) {
        const uploadResult = await uploadToCloudinary(file.buffer, file.originalname, "vehicles/images");
        imageUrls.push(uploadResult.url);
      }
      vehicleData.imageUrls = imageUrls;
    }

    // Create vehicle
    const vehicle = await prisma.vehicle.create({
      data: {
        driverId,
        make: vehicleData.make,
        model: vehicleData.model,
        year: vehicleData.year,
        color: vehicleData.color,
        plateNumber: vehicleData.plateNumber,
        seats: vehicleData.seats,
        imageUrls: vehicleData.imageUrls, // Array of URLs
        insuranceExpiry: vehicleData.insuranceExpiry ? new Date(vehicleData.insuranceExpiry) : null,
        registrationExpiry: vehicleData.registrationExpiry ? new Date(vehicleData.registrationExpiry) : null,
      },
      include: {
        driver: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (socketManager) {
      socketManager.emitToRoom(`driver_${driverId}`, "vehicle_added", { vehicle });
    }

    return res.status(201).json(
      {
        success: true,
        data: vehicle,
        message: "Vehicle added successfully",
      }
    );
  } catch (error) {
    console.error("Error in driver POST:", error);
    return res.status(500).json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};

export const updateDriverProfile = async (req: Request, res: Response) => {
  try {
    const driverId = req.params.driverId;
    const updateData: DriverUpdateData = req.body;

    // Validate license expiry if provided
    if (updateData.licenseExpiry) {
      const expiryDate = new Date(updateData.licenseExpiry);
      if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        return res.status(400).json({ error: "License expiry date must be a valid future date" });
      }
    }

    // Check for duplicate license or identity numbers if updating them
    if (updateData.licenseNumber || updateData.identityNumber) {
      const duplicateCheck = await prisma.driver.findFirst({
        where: {
          AND: [
            { id: { not: driverId } },
            {
              OR: [...(updateData.licenseNumber ? [{ licenseNumber: updateData.licenseNumber }] : []), ...(updateData.identityNumber ? [{ identityNumber: updateData.identityNumber }] : [])],
            },
          ],
        },
      });

      if (duplicateCheck) {
        return res.status(409).json(
          {
            error: "License number or identity number already exists",
          }
        );
      }
    }

    // Filter out undefined values and prepare update data
    const filteredUpdateData = Object.fromEntries(Object.entries(updateData).filter(([_, value]) => value !== undefined && value !== null));

    if (Object.keys(filteredUpdateData).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    // Convert date strings to Date objects if needed
    const updatePayload: any = { ...filteredUpdateData };
    if (updateData.licenseExpiry) {
      updatePayload.licenseExpiry = new Date(updateData.licenseExpiry);
    }

    // Handle profile image upload if file present
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, req.file.originalname, "drivers/profile_images");
      updatePayload.profileImageUrl = uploadResult.url;
    }

    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: updatePayload,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profileImageUrl: true,
            role: true,
            accountStatus: true,
          },
        },
        vehicles: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            color: true,
            plateNumber: true,
            seats: true,
            status: true,
            isVerified: true,
          },
        },
      },
    });

    if (socketManager) {
      socketManager.emitToRoom(`driver_${driverId}`, "driver_profile_updated", { driver: updatedDriver });
      socketManager.emitToRoom(`user_${updatedDriver.user.id}`, "driver_profile_updated", { driver: updatedDriver });
    }

    return res.status(200).json(
      {
        success: true,
        data: updatedDriver,
        message: "Driver profile updated successfully",
      }
    );
  } catch (error) {
    console.error("Error in driver PUT:", error);
    return res.status(500).json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};

export const updateLocation = async (req: Request, res: Response) => {
  try {
    const driverId = req.params.driverId;
    const { latitude, longitude }: LocationUpdateData = req.body;

    // Validate coordinates
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ error: "Valid latitude and longitude are required" });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: {
        currentLatitude: latitude,
        currentLongitude: longitude,
      },
      select: {
        id: true,
        userId: true,
        isOnline: true,
        currentLatitude: true,
        currentLongitude: true,
      },
    });

    // Update user's last active time
    await prisma.user.update({
      where: { id: updatedDriver.userId },
      data: { lastActiveAt: new Date() },
    });

    if (socketManager) {
      socketManager.emitToRoom(`driver_${driverId}`, "driver_location_updated", {
        driverId: updatedDriver.id,
        location: {
          latitude: Number(updatedDriver.currentLatitude),
          longitude: Number(updatedDriver.currentLongitude),
        },
      });
    }

    return res.status(200).json(
      {
        success: true,
        data: {
          id: updatedDriver.id,
          isOnline: updatedDriver.isOnline,
          currentLocation: {
            latitude: Number(updatedDriver.currentLatitude),
            longitude: Number(updatedDriver.currentLongitude),
          },
        },
        message: "Location updated successfully",
      }
    );
  } catch (error) {
    console.error("Error in driver PUT:", error);
    return res.status(500).json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};

export const toggleOnlineStatus = async (req: Request, res: Response) => {
  try {
    const driverId = req.params.driverId;
    const { isOnline } = req.body;

    if (typeof isOnline !== "boolean") {
      return res.status(400).json({ error: "isOnline must be a boolean" });
    }

    // Check if driver is verified before allowing online status
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        isVerified: true,
        userId: true,
        user: {
          select: {
            accountStatus: true,
          },
        },
      },
    });

    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    if (!driver.isVerified && isOnline) {
      return res.status(403).json(
        {
          error: "Driver must be verified before going online",
        }
      );
    }

    if (driver.user.accountStatus !== "ACTIVE" && isOnline) {
      return res.status(403).json(
        {
          error: "User account must be active to go online",
        }
      );
    }

    // Update online status
    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: {
        isOnline,
        ...(isOnline && { currentLatitude: null, currentLongitude: null }), // Clear location when going offline
      },
      select: {
        id: true,
        isOnline: true,
        isVerified: true,
        currentLatitude: true,
        currentLongitude: true,
      },
    });

    // Update user's last active time
    await prisma.user.update({
      where: { id: driver.userId },
      data: { lastActiveAt: new Date() },
    });

    if (socketManager) {
      socketManager.emitToRoom(`driver_${driverId}`, "driver_online_status_changed", {
        driverId: updatedDriver.id,
        isOnline: updatedDriver.isOnline,
      });
    }

    return res.status(200).json(
      {
        success: true,
        data: updatedDriver,
        message: `Driver is now ${isOnline ? "online" : "offline"}`,
      }
    );
  } catch (error) {
    console.error("Error in driver PUT:", error);
    return res.status(500).json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};

export const getDriver = async (req: Request, res: Response) => {
  try {
    const url = new URL(req.url);
    const driverId = url.searchParams.get("driverId");
    const userId = url.searchParams.get("userId");
    const includeVehicles = url.searchParams.get("includeVehicles") === "true";
    const includeStats = url.searchParams.get("includeStats") === "true";
    const includeEarnings = url.searchParams.get("includeEarnings") === "true";

    if (!driverId && !userId) {
      return res.status(400).json({ error: "driverId or userId is required" });
    }

    // Build where clause
    const whereClause = driverId ? { id: driverId } : { userId: userId! };

    // Build include clause
    const includeClause: any = {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          profileImageUrl: true,
          role: true,
          accountStatus: true,
          rating: true,
          totalRides: true,
          isEmailVerified: true,
          isPhoneVerified: true,
        },
      },
    };

    if (includeVehicles) {
      includeClause.vehicles = {
        select: {
          id: true,
          make: true,
          model: true,
          year: true,
          color: true,
          plateNumber: true,
          seats: true,
          imageUrls: true, // Array of URLs
          status: true,
          isVerified: true,
          insuranceExpiry: true,
          registrationExpiry: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      };
    }

    if (includeEarnings) {
      includeClause.earnings = {
        select: {
          id: true,
          amount: true,
          date: true,
          rideCount: true,
          totalFares: true,
          platformFees: true,
        },
        orderBy: { date: "desc" },
        take: 30, // Last 30 days
      };
    }

    const driverData = await prisma.driver.findUnique({
      where: whereClause,
      include: includeClause,
    });

    if (!driverData) {
      return res.status(404).json({ error: "Driver not found" });
    }

    // Get additional stats if requested
    let additionalStats = {};
    if (includeStats) {
      const [rideStats, avgRating, totalEarningsThisMonth] = await Promise.all([
        prisma.ride.groupBy({
          by: ["status"],
          where: { driverId: driverData.id },
          _count: true,
        }),
        prisma.rating.aggregate({
          where: {
            driverId: driverData.userId, // Rating.driverId refers to User.id
            isUserToDriver: true, // Ratings given to driver by users
          },
          _avg: { rating: true },
          _count: true,
        }),
        prisma.earning.aggregate({
          where: {
            driverId: driverData.id,
            date: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
          _sum: { amount: true },
        }),
      ]);

      const completedRides = rideStats.find((stat: any) => stat.status === "COMPLETED")?._count || 0;
      const cancelledRides = rideStats.find((stat: any) => stat.status === "CANCELLED")?._count || 0;
      const inProgressRides = rideStats.find((stat: any) => stat.status === "IN_PROGRESS")?._count || 0;

      additionalStats = {
        completedRides,
        cancelledRides,
        inProgressRides,
        avgDriverRating: avgRating._avg.rating ? Number(avgRating._avg.rating) : null,
        totalRatings: avgRating._count,
        earningsThisMonth: totalEarningsThisMonth._sum.amount ? Number(totalEarningsThisMonth._sum.amount) : 0,
      };
    }

    // Format response with current location
    const formattedDriver = {
      ...driverData,
      currentLocation:
        driverData.currentLatitude && driverData.currentLongitude
          ? {
              latitude: Number(driverData.currentLatitude),
              longitude: Number(driverData.currentLongitude),
            }
          : null,
      totalEarnings: Number(driverData.totalEarnings),
      rating: driverData.rating ? Number(driverData.rating) : null,
      ...additionalStats,
    };

    // Remove the separate lat/lng fields
    delete (formattedDriver as any).currentLatitude;
    delete (formattedDriver as any).currentLongitude;

    return res.status(200).json(
      {
        success: true,
        data: formattedDriver,
      }
    );
  } catch (error) {
    console.error("Error fetching driver:", error);
    return res.status(500).json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};

export const verifyDriver = async (req: Request, res: Response) => {
  try {
    const driverId = req.params.driverId;
    const { isVerified, adminId } = req.body;

    if (typeof isVerified !== "boolean") {
      return res.status(400).json({ error: "isVerified must be a boolean" });
    }

    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: { isVerified },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log the verification action
    await prisma.systemLog.create({
      data: {
        userId: adminId || null,
        action: isVerified ? "driver_verified" : "driver_unverified",
        entityType: "driver",
        entityId: driverId,
        details: {
          driverUserId: updatedDriver.userId,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return res.status(200).json(
      {
        success: true,
        data: updatedDriver,
        message: `Driver ${isVerified ? "verified" : "unverified"} successfully`,
      }
    );
  } catch (error) {
    console.error("Error in driver PATCH:", error);
    return res.status(500).json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};

export const updateVehicleController = async (req: Request, res: Response) => {
  try {
    const vehicleId = req.params.vehicleId;
    const updateData = req.body;

    // Validate year if provided
    if (updateData.year) {
      const currentYear = new Date().getFullYear();
      if (updateData.year < 1900 || updateData.year > currentYear + 1) {
        return res.status(400).json({ error: "Invalid vehicle year" });
      }
    }

    // Validate seats if provided
    if (updateData.seats && (updateData.seats < 1 || updateData.seats > 8)) {
      return res.status(400).json({ error: "Seats must be between 1 and 8" });
    }

    // Check for duplicate plate number if updating
    if (updateData.plateNumber) {
      const duplicatePlate = await prisma.vehicle.findFirst({
        where: {
          AND: [{ id: { not: vehicleId } }, { plateNumber: updateData.plateNumber }],
        },
      });

      if (duplicatePlate) {
        return res.status(409).json({ error: "Vehicle with this plate number already exists" });
      }
    }

    // Filter out undefined values
    const filteredUpdateData = Object.fromEntries(Object.entries(updateData).filter(([_, value]) => value !== undefined && value !== null));

    // Convert date strings to Date objects if needed
    const updatePayload: any = { ...filteredUpdateData };
    if (updateData.insuranceExpiry) {
      updatePayload.insuranceExpiry = new Date(updateData.insuranceExpiry);
    }
    if (updateData.registrationExpiry) {
      updatePayload.registrationExpiry = new Date(updateData.registrationExpiry);
    }

    // Handle vehicle image uploads if files present
    if (req.files && Array.isArray(req.files)) {
      const imageUrls = [];
      for (const file of req.files as Express.Multer.File[]) {
        const uploadResult = await uploadToCloudinary(file.buffer, file.originalname, "vehicles/images");
        imageUrls.push(uploadResult.url);
      }
      updateData.imageUrls = imageUrls;
    }

    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: updatePayload,
      include: {
        driver: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (socketManager) {
      socketManager.emitToRoom(`driver_${updatedVehicle.driver.id}`, "vehicle_updated", { vehicle: updatedVehicle });
    }

    return res.status(200).json(
      {
        success: true,
        data: updatedVehicle,
        message: "Vehicle updated successfully",
      }
    );
  } catch (error) {
    console.error("Error in driver PATCH:", error);
    return res.status(500).json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};

export const verifyVehicle = async (req: Request, res: Response) => {
  try {
    const vehicleId = req.params.vehicleId;
    const { isVerified, adminId } = req.body;

    if (typeof isVerified !== "boolean") {
      return res.status(400).json({ error: "isVerified must be a boolean" });
    }

    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { isVerified },
      include: {
        driver: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (socketManager) {
      socketManager.emitToRoom(`driver_${updatedVehicle.driver.id}`, "vehicle_verified", { vehicle: updatedVehicle });
    }

    return res.status(200).json(
      {
        success: true,
        data: updatedVehicle,
        message: `Vehicle ${isVerified ? "verified" : "unverified"} successfully`,
      }
    );
  } catch (error) {
    console.error("Error in driver PATCH:", error);
    return res.status(500).json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};

export const deleteVehicleController = async (req: Request, res: Response) => {
  try {
    const vehicleId = req.params.vehicleId;

    if (!vehicleId) {
      return res.status(400).json({ error: "vehicleId is required" });
    }

    // Check if vehicle has active rides
    const activeRides = await prisma.ride.count({
      where: {
        vehicleId,
        status: {
          in: ["PENDING", "ACCEPTED", "IN_PROGRESS"],
        },
      },
    });

    if (activeRides > 0) {
      return res.status(400).json(
        {
          error: "Cannot delete vehicle with active rides",
        }
      );
    }

    // Delete vehicle
    const deletedVehicle = await prisma.vehicle.delete({
      where: { id: vehicleId },
      select: {
        id: true,
        make: true,
        model: true,
        plateNumber: true,
        driver: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (socketManager) {
      socketManager.emitToRoom(`driver_${deletedVehicle.driver.id}`, "vehicle_deleted", { vehicle: deletedVehicle });
    }

    // Log the deletion
    await prisma.systemLog.create({
      data: {
        userId: deletedVehicle.driver.userId,
        action: "vehicle_deleted",
        entityType: "vehicle",
        entityId: vehicleId,
        details: {
          make: deletedVehicle.make,
          model: deletedVehicle.model,
          plateNumber: deletedVehicle.plateNumber,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return res.status(200).json(
      {
        success: true,
        data: deletedVehicle,
        message: "Vehicle deleted successfully",
      }
    );
  } catch (error) {
    console.error("Error in driver DELETE:", error);
    return res.status(500).json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};

export const suspendDriver = async (req: Request, res: Response) => {
  try {
    const driverId = req.params.driverId;
    const { reason, adminId } = req.body;

    // Get driver info
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    // Suspend user and set driver offline in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Update user account status
      const suspendedUser = await tx.user.update({
        where: { id: driver.userId },
        data: { accountStatus: "SUSPENDED" },
        select: {
          id: true,
          name: true,
          email: true,
          accountStatus: true,
        },
      });

      // Set driver offline
      await tx.driver.update({
        where: { id: driverId },
        data: { isOnline: false },
      });

      // Cancel any pending or accepted rides
      await tx.ride.updateMany({
        where: {
          driverId,
          status: { in: ["PENDING", "ACCEPTED"] },
        },
        data: {
          status: "CANCELLED",
          cancelReason: "Driver account suspended",
          cancelledAt: new Date(),
        },
      });

      // Log the suspension
      await tx.systemLog.create({
        data: {
          userId: adminId || null,
          action: "driver_suspended",
          entityType: "driver",
          entityId: driverId,
          details: {
            reason: reason || "Driver account suspended",
            driverUserId: driver.userId,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return suspendedUser;
    });

    if (socketManager) {
      socketManager.emitToRoom(`driver_${driverId}`, "driver_suspended", { driverId });
      socketManager.emitToRoom(`user_${driver.userId}`, "driver_suspended", { driverId });
    }

    return res.status(200).json(
      {
        success: true,
        data: result,
        message: "Driver suspended successfully",
      }
    );
  } catch (error) {
    console.error("Error in driver DELETE:", error);
    return res.status(500).json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};

// Additional utility endpoints

// GET endpoint for nearby drivers
export async function GET_NEARBY_DRIVERS(request: Request) {
  try {
    const url = new URL(request.url);
    const latitude = parseFloat(url.searchParams.get("latitude") || "0");
    const longitude = parseFloat(url.searchParams.get("longitude") || "0");
    const radius = parseFloat(url.searchParams.get("radius") || "5"); // km
    const limit = parseInt(url.searchParams.get("limit") || "10");

    if (!latitude || !longitude) {
      return Response.json({ error: "Valid latitude and longitude are required" }, { status: 400 });
    }

    // Note: For production, you'd want to use PostGIS or similar for proper geo queries
    // This is a simplified approach using Prisma
    const nearbyDrivers = await prisma.driver.findMany({
      where: {
        isOnline: true,
        isVerified: true,
        currentLatitude: { not: null },
        currentLongitude: { not: null },
        user: {
          accountStatus: "ACTIVE",  
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
            rating: true,
          },
        },
        vehicles: {
          where: {
            status: "ACTIVE",
            isVerified: true,
          },
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            color: true,
            seats: true,
            imageUrl: true,
          },
        },
      },
      take: limit,
    });

    // Calculate distances and filter by radius
    // Note: This is a simplified distance calculation
    const driversWithDistance = nearbyDrivers
      .map((driver: any) => {
        const lat1 = Number(driver.currentLatitude);
        const lon1 = Number(driver.currentLongitude);
        const lat2 = latitude;
        const lon2 = longitude;

        // Haversine formula for distance calculation
        const R = 6371; // Earth's radius in km
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return {
          ...driver,
          distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
          currentLocation: {
            latitude: lat1,
            longitude: lon1,
          },
        };
      })
      .filter((driver: any) => driver.distance <= radius)
      .sort((a: any, b: any) => a.distance - b.distance);

    return Response.json(
      {
        success: true,
        data: driversWithDistance,
        meta: {
          total: driversWithDistance.length,
          searchRadius: radius,
          searchLocation: { latitude, longitude },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching nearby drivers:", error);
    return Response.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
