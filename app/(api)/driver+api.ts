import { prisma } from "@/lib/prisma";

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
  imageUrl?: string;
  insuranceExpiry?: string;
  registrationExpiry?: string;
}

interface LocationUpdateData {
  latitude: number;
  longitude: number;
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "register") {
      return await registerDriver(request);
    } else if (action === "add-vehicle") {
      return await addVehicle(request);
    } else {
      return Response.json({ error: "Invalid action. Use 'register' or 'add-vehicle'" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in driver POST:", error);
    return Response.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function registerDriver(request: Request) {
  const { userId, licenseNumber, licenseExpiry, identityNumber, identityType, bankAccountNumber, bankName }: DriverCreateData = await request.json();

  // Validate required fields
  if (!userId || !licenseNumber || !licenseExpiry || !identityNumber || !identityType) {
    return Response.json(
      {
        error: "Missing required fields: userId, licenseNumber, licenseExpiry, identityNumber, and identityType are required",
      },
      { status: 400 }
    );
  }

  // Validate license expiry date
  const expiryDate = new Date(licenseExpiry);
  if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
    return Response.json({ error: "License expiry date must be a valid future date" }, { status: 400 });
  }

  // Check if user exists and has USER role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, accountStatus: true },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  if (user.accountStatus !== "ACTIVE") {
    return Response.json({ error: "User account is not active" }, { status: 403 });
  }

  // Check if driver profile already exists
  const existingDriver = await prisma.driver.findUnique({
    where: { userId },
  });

  if (existingDriver) {
    return Response.json({ error: "Driver profile already exists for this user" }, { status: 409 });
  }

  // Check for duplicate license or identity numbers
  const duplicateCheck = await prisma.driver.findFirst({
    where: {
      OR: [{ licenseNumber }, { identityNumber }],
    },
  });

  if (duplicateCheck) {
    return Response.json(
      {
        error: "License number or identity number already exists",
      },
      { status: 409 }
    );
  }

  // Create driver profile and update user role in transaction
  const result = await prisma.$transaction(async (tx : any) => {
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

  return Response.json(
    {
      success: true,
      data: result,
      message: "Driver registered successfully",
    },
    { status: 201 }
  );
}

async function addVehicle(request: Request) {
  const url = new URL(request.url);
  const driverId = url.searchParams.get("driverId");

  if (!driverId) {
    return Response.json({ error: "driverId is required" }, { status: 400 });
  }

  const vehicleData: VehicleCreateData = await request.json();

  // Validate required fields
  if (!vehicleData.make || !vehicleData.model || !vehicleData.year || !vehicleData.color || !vehicleData.plateNumber || !vehicleData.seats) {
    return Response.json(
      {
        error: "Missing required fields: make, model, year, color, plateNumber, and seats are required",
      },
      { status: 400 }
    );
  }

  // Validate year
  const currentYear = new Date().getFullYear();
  if (vehicleData.year < 1900 || vehicleData.year > currentYear + 1) {
    return Response.json({ error: "Invalid vehicle year" }, { status: 400 });
  }

  // Validate seats
  if (vehicleData.seats < 1 || vehicleData.seats > 8) {
    return Response.json({ error: "Seats must be between 1 and 8" }, { status: 400 });
  }

  // Check if driver exists
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { id: true, userId: true },
  });

  if (!driver) {
    return Response.json({ error: "Driver not found" }, { status: 404 });
  }

  // Check for duplicate plate number
  const duplicatePlate = await prisma.vehicle.findUnique({
    where: { plateNumber: vehicleData.plateNumber },
  });

  if (duplicatePlate) {
    return Response.json({ error: "Vehicle with this plate number already exists" }, { status: 409 });
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
      imageUrl: vehicleData.imageUrl,
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

  return Response.json(
    {
      success: true,
      data: vehicle,
      message: "Vehicle added successfully",
    },
    { status: 201 }
  );
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const driverId = url.searchParams.get("driverId");

    if (!driverId) {
      return Response.json({ error: "driverId is required" }, { status: 400 });
    }

    if (action === "update-location") {
      return await updateLocation(driverId, request);
    } else if (action === "toggle-online") {
      return await toggleOnlineStatus(driverId, request);
    } else {
      return await updateDriverProfile(driverId, request);
    }
  } catch (error) {
    console.error("Error in driver PUT:", error);
    return Response.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function updateDriverProfile(driverId: string, request: Request) {
  const updateData: DriverUpdateData = await request.json();

  // Validate license expiry if provided
  if (updateData.licenseExpiry) {
    const expiryDate = new Date(updateData.licenseExpiry);
    if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
      return Response.json({ error: "License expiry date must be a valid future date" }, { status: 400 });
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
      return Response.json(
        {
          error: "License number or identity number already exists",
        },
        { status: 409 }
      );
    }
  }

  // Filter out undefined values and prepare update data
  const filteredUpdateData = Object.fromEntries(Object.entries(updateData).filter(([_, value]) => value !== undefined && value !== null));

  if (Object.keys(filteredUpdateData).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Convert date strings to Date objects if needed
  const updatePayload: any = { ...filteredUpdateData };
  if (updateData.licenseExpiry) {
    updatePayload.licenseExpiry = new Date(updateData.licenseExpiry);
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

  return Response.json(
    {
      success: true,
      data: updatedDriver,
      message: "Driver profile updated successfully",
    },
    { status: 200 }
  );
}

async function updateLocation(driverId: string, request: Request) {
  const { latitude, longitude }: LocationUpdateData = await request.json();

  // Validate coordinates
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return Response.json({ error: "Valid latitude and longitude are required" }, { status: 400 });
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return Response.json({ error: "Invalid coordinates" }, { status: 400 });
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

  return Response.json(
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
    },
    { status: 200 }
  );
}

async function toggleOnlineStatus(driverId: string, request: Request) {
  const { isOnline } = await request.json();

  if (typeof isOnline !== "boolean") {
    return Response.json({ error: "isOnline must be a boolean" }, { status: 400 });
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
    return Response.json({ error: "Driver not found" }, { status: 404 });
  }

  if (!driver.isVerified && isOnline) {
    return Response.json(
      {
        error: "Driver must be verified before going online",
      },
      { status: 403 }
    );
  }

  if (driver.user.accountStatus !== "ACTIVE" && isOnline) {
    return Response.json(
      {
        error: "User account must be active to go online",
      },
      { status: 403 }
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

  return Response.json(
    {
      success: true,
      data: updatedDriver,
      message: `Driver is now ${isOnline ? "online" : "offline"}`,
    },
    { status: 200 }
  );
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const driverId = url.searchParams.get("driverId");
    const userId = url.searchParams.get("userId");
    const includeVehicles = url.searchParams.get("includeVehicles") === "true";
    const includeStats = url.searchParams.get("includeStats") === "true";
    const includeEarnings = url.searchParams.get("includeEarnings") === "true";

    if (!driverId && !userId) {
      return Response.json({ error: "driverId or userId is required" }, { status: 400 });
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
          imageUrl: true,
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
      return Response.json({ error: "Driver not found" }, { status: 404 });
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

    return Response.json(
      {
        success: true,
        data: formattedDriver,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching driver:", error);
    return Response.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const driverId = url.searchParams.get("driverId");
    const vehicleId = url.searchParams.get("vehicleId");

    if (action === "verify-driver") {
      return await verifyDriver(driverId, request);
    } else if (action === "update-vehicle") {
      return await updateVehicle(vehicleId, request);
    } else if (action === "verify-vehicle") {
      return await verifyVehicle(vehicleId, request);
    } else {
      return Response.json(
        {
          error: "Invalid action. Use 'verify-driver', 'update-vehicle', or 'verify-vehicle'",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in driver PATCH:", error);
    return Response.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function verifyDriver(driverId: string | null, request: Request) {
  if (!driverId) {
    return Response.json({ error: "driverId is required" }, { status: 400 });
  }

  const { isVerified, adminId } = await request.json();

  if (typeof isVerified !== "boolean") {
    return Response.json({ error: "isVerified must be a boolean" }, { status: 400 });
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

  return Response.json(
    {
      success: true,
      data: updatedDriver,
      message: `Driver ${isVerified ? "verified" : "unverified"} successfully`,
    },
    { status: 200 }
  );
}

async function updateVehicle(vehicleId: string | null, request: Request) {
  if (!vehicleId) {
    return Response.json({ error: "vehicleId is required" }, { status: 400 });
  }

  const updateData = await request.json();

  // Validate year if provided
  if (updateData.year) {
    const currentYear = new Date().getFullYear();
    if (updateData.year < 1900 || updateData.year > currentYear + 1) {
      return Response.json({ error: "Invalid vehicle year" }, { status: 400 });
    }
  }

  // Validate seats if provided
  if (updateData.seats && (updateData.seats < 1 || updateData.seats > 8)) {
    return Response.json({ error: "Seats must be between 1 and 8" }, { status: 400 });
  }

  // Check for duplicate plate number if updating
  if (updateData.plateNumber) {
    const duplicatePlate = await prisma.vehicle.findFirst({
      where: {
        AND: [{ id: { not: vehicleId } }, { plateNumber: updateData.plateNumber }],
      },
    });

    if (duplicatePlate) {
      return Response.json({ error: "Vehicle with this plate number already exists" }, { status: 409 });
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

  return Response.json(
    {
      success: true,
      data: updatedVehicle,
      message: "Vehicle updated successfully",
    },
    { status: 200 }
  );
}

async function verifyVehicle(vehicleId: string | null, request: Request) {
  if (!vehicleId) {
    return Response.json({ error: "vehicleId is required" }, { status: 400 });
  }

  const { isVerified, adminId } = await request.json();

  if (typeof isVerified !== "boolean") {
    return Response.json({ error: "isVerified must be a boolean" }, { status: 400 });
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

  // Log the verification action
  await prisma.systemLog.create({
    data: {
      userId: adminId || null,
      action: isVerified ? "vehicle_verified" : "vehicle_unverified",
      entityType: "vehicle",
      entityId: vehicleId,
      details: {
        driverId: updatedVehicle.driver.id,
        plateNumber: updatedVehicle.plateNumber,
        timestamp: new Date().toISOString(),
      },
    },
  });

  return Response.json(
    {
      success: true,
      data: updatedVehicle,
      message: `Vehicle ${isVerified ? "verified" : "unverified"} successfully`,
    },
    { status: 200 }
  );
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const driverId = url.searchParams.get("driverId");
    const vehicleId = url.searchParams.get("vehicleId");

    if (action === "delete-vehicle") {
      return await deleteVehicle(vehicleId);
    } else if (action === "suspend-driver") {
      return await suspendDriver(driverId, request);
    } else {
      return Response.json(
        {
          error: "Invalid action. Use 'delete-vehicle' or 'suspend-driver'",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in driver DELETE:", error);
    return Response.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function deleteVehicle(vehicleId: string | null) {
  if (!vehicleId) {
    return Response.json({ error: "vehicleId is required" }, { status: 400 });
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
    return Response.json(
      {
        error: "Cannot delete vehicle with active rides",
      },
      { status: 400 }
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

  return Response.json(
    {
      success: true,
      data: deletedVehicle,
      message: "Vehicle deleted successfully",
    },
    { status: 200 }
  );
}

async function suspendDriver(driverId: string | null, request: Request) {
  if (!driverId) {
    return Response.json({ error: "driverId is required" }, { status: 400 });
  }

  const { reason, adminId } = await request.json();

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
    return Response.json({ error: "Driver not found" }, { status: 404 });
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

  return Response.json(
    {
      success: true,
      data: result,
      message: "Driver suspended successfully",
    },
    { status: 200 }
  );
}

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
