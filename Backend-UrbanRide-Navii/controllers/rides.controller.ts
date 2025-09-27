import { prisma } from "@/lib/prisma";
import { PaymentMethod, PaymentStatus, RideStatus } from "@prisma/client";
import { Request, Response } from "express";
import { SocketManager } from "../services/socket-io";

let socketManager: SocketManager | undefined;
export function setSocketManager(sm: SocketManager) { socketManager = sm; }

// Types based on our Prisma schema
interface RideCreateData {
  userId: string;
  originAddress: string;
  destinationAddress: string;
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  originalFarePrice: number;
  seats?: number;
  scheduledAt?: string; // ISO date string
  stopPoints?: any[]; // JSON array of stop points
  notes?: string;
  promoCodeId?: string;
}

interface RideUpdateData {
  driverId?: string;
  vehicleId?: string;
  status?: RideStatus;
  negotiatedFarePrice?: number;
  finalFarePrice?: number;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  rideTime?: number;
  distance?: number;
  cancelReason?: string;
  notes?: string;
}

interface RideActionData {
  driverId: string;
  vehicleId?: string;
}

interface RideFilterOptions {
  userId?: string;
  driverId?: string;
  status?: RideStatus;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export const createRide = async (req: Request, res: Response) => {
  try {
    const { userId, originAddress, destinationAddress, originLatitude, originLongitude, destinationLatitude, destinationLongitude, originalFarePrice, seats = 1, scheduledAt, stopPoints, notes, promoCodeId }: RideCreateData = req.body;

    // Validate required fields
    if (!userId || !originAddress || !destinationAddress || typeof originLatitude !== "number" || typeof originLongitude !== "number" || typeof destinationLatitude !== "number" || typeof destinationLongitude !== "number" || typeof originalFarePrice !== "number") {
      return res.status(400).json({ error: "Missing or invalid required fields" });
    }

    // Validate coordinates
    if (originLatitude < -90 || originLatitude > 90 || originLongitude < -180 || originLongitude > 180 || destinationLatitude < -90 || destinationLatitude > 90 || destinationLongitude < -180 || destinationLongitude > 180) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    // Validate fare price
    if (originalFarePrice <= 0) {
      return res.status(400).json({ error: "Fare price must be greater than 0" });
    }

    // Validate seats
    if (seats < 1 || seats > 8) {
      return res.status(400).json({ error: "Seats must be between 1 and 8" });
    }

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, accountStatus: true, name: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.accountStatus !== "ACTIVE") {
      return res.status(403).json({ error: "User account is not active" });
    }

    // Check if user has an active ride
    const activeRide = await prisma.ride.findFirst({
      where: {
        userId,
        status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] },
      },
    });

    if (activeRide) {
      return res.status(409).json(
        {
          error: "User already has an active ride",
          activeRideId: activeRide.id,
        }
      );
    }

    // Validate promo code if provided
    let promoDiscount = 0;
    if (promoCodeId) {
      const promoCode = await prisma.promoCode.findUnique({
        where: { id: promoCodeId },
        include: {
          userPromos: {
            where: { userId },
            select: { usageCount: true },
          },
        },
      });

      if (!promoCode) {
        return res.status(400).json({ error: "Invalid promo code" });
      }

      if (!promoCode.isActive || new Date() < promoCode.validFrom || new Date() > promoCode.validUntil) {
        return res.status(400).json({ error: "Promo code is not active or has expired" });
      }

      // Check usage limits
      if (promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit) {
        return res.status(400).json({ error: "Promo code usage limit exceeded" });
      }

      if (promoCode.userLimit && promoCode.userPromos[0]?.usageCount >= promoCode.userLimit) {
        return res.status(400).json({ error: "User has exceeded promo code usage limit" });
      }

      // Check minimum ride amount
      if (promoCode.minRideAmount && originalFarePrice < Number(promoCode.minRideAmount)) {
        return res.status(400).json(
          {
            error: `Minimum ride amount of ${promoCode.minRideAmount} required for this promo`,
          }
        );
      }

      // Calculate discount
      if (promoCode.discountType === "percentage") {
        promoDiscount = (originalFarePrice * Number(promoCode.discountValue)) / 100;
      } else {
        promoDiscount = Number(promoCode.discountValue);
      }

      // Apply max discount limit
      if (promoCode.maxDiscount && promoDiscount > Number(promoCode.maxDiscount)) {
        promoDiscount = Number(promoCode.maxDiscount);
      }
    }

    // Create ride in transaction
    const newRide = await prisma.$transaction(async (tx: any) => {
      // Create the ride
      const ride = await tx.ride.create({
        data: {
          userId,
          originAddress,
          destinationAddress,
          originLatitude,
          originLongitude,
          destinationLatitude,
          destinationLongitude,
          originalFarePrice,
          seats,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          stopPoints: stopPoints || null,
          notes,
          promoCodeId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              profileImageUrl: true,
            },
          },
          promoCode: {
            select: {
              id: true,
              code: true,
              title: true,
              discountType: true,
              discountValue: true,
            },
          },
        },
      });

      // Update promo code usage if used
      if (promoCodeId) {
        await tx.promoCode.update({
          where: { id: promoCodeId },
          data: { usageCount: { increment: 1 } },
        });

        // Update or create user promo usage
        await tx.userPromo.upsert({
          where: {
            userId_promoCodeId: {
              userId,
              promoCodeId,
            },
          },
          update: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
          },
          create: {
            userId,
            promoCodeId,
            usageCount: 1,
            lastUsedAt: new Date(),
          },
        });
      }

      // Add origin to recent locations
      await tx.recentLocation.create({
        data: {
          userId,
          address: originAddress,
          latitude: originLatitude,
          longitude: originLongitude,
        },
      });

      // Add destination to recent locations if different from origin
      if (destinationAddress !== originAddress) {
        await tx.recentLocation.create({
          data: {
            userId,
            address: destinationAddress,
            latitude: destinationLatitude,
            longitude: destinationLongitude,
          },
        });
      }

      return ride;
    });

    // Emit to user room for new ride
    if (socketManager) {
      socketManager.emitToRoom(`user_${userId}`, "ride_created", { ride: newRide });
    }

    return res.status(201).json(
      {
        success: true,
        data: {
          ...newRide,
          promoDiscount,
          estimatedFinalPrice: originalFarePrice - promoDiscount,
        },
        message: "Ride created successfully",
      }
    );
  } catch (error) {
    console.error("Error in ride POST:", error);
    return res.status(500).json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};

export const acceptRide = async (req: Request, res: Response) => {
  try {
    const url = new URL(req.url);
    const rideId = url.searchParams.get("rideId");
    const { driverId, vehicleId }: RideActionData = req.body;

    if (!rideId || !driverId) {
      return res.status(400).json({ error: "rideId and driverId are required" });
    }

    // Check if ride exists and is pending
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }

    if (ride.status !== "PENDING") {
      return res.status(400).json({ error: "Ride is not available for acceptance" });
    }

    // Fetch driver with user and vehicles relations
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: {
          select: { id: true, name: true, accountStatus: true },
        },
        vehicles: {
          where: vehicleId
            ? { id: vehicleId }
            : { status: "ACTIVE", isVerified: true },
          select: { id: true, status: true, isVerified: true, seats: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    if (!driver.isVerified || !driver.isOnline) {
      return res.status(403).json({ error: "Driver must be verified and online to accept rides" });
    }

    if (driver.user.accountStatus !== "ACTIVE") {
      return res.status(403).json({ error: "Driver account is not active" });
    }

    // Check if driver has an active ride
    const activeDriverRide = await prisma.ride.findFirst({
      where: {
        driverId,
        status: { in: ["ACCEPTED", "IN_PROGRESS"] },
      },
    });

    if (activeDriverRide) {
      return res.status(409).json({ error: "Driver already has an active ride" });
    }

    // Validate vehicle
    const selectedVehicle = driver.vehicles[0];
    if (!selectedVehicle) {
      return res.status(400).json({ error: "No available verified vehicle found" });
    }

    if (selectedVehicle.seats < ride.seats) {
      return res.status(400).json({ error: "Vehicle does not have enough seats for this ride" });
    }

    // Accept ride in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Update ride status
      const updatedRide = await tx.ride.update({
        where: { id: rideId },
        data: {
          driverId,
          vehicleId: selectedVehicle.id,
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              profileImageUrl: true,
            },
          },
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  profileImageUrl: true,
                  rating: true,
                },
              },
            },
          },
          vehicle: {
            select: {
              id: true,
              make: true,
              model: true,
              year: true,
              color: true,
              plateNumber: true,
              seats: true,
              imageUrl: true,
            },
          },
        },
      });

      // Create notifications
      await tx.notification.create({
        data: {
          userId: ride.userId,
          title: "Ride Accepted",
          message: `Your ride has been accepted by ${driver.user.name}`,
          type: "ride",
          data: { rideId, driverId },
        },
      });

      return updatedRide;
    });

    // Emit to user and driver rooms
    if (socketManager) {
      socketManager.emitToRoom(`user_${result.user.id}`, "ride_accepted", { ride: result });
      socketManager.emitToRoom(`driver_${driverId}`, "ride_accepted", { ride: result });
    }

    return res.status(200).json(
      {
        success: true,
        data: result,
        message: "Ride accepted successfully",
      }
    );
  } catch (error) {
    console.error("Error accepting ride:", error);
    return res.status(500).json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};

export const startRide = async (req: Request, res: Response) => {
  try {
    const url = new URL(req.url);
    const rideId = url.searchParams.get("rideId");
    const { driverId } = req.body;

    if (!rideId || !driverId) {
      return res.status(400).json({ error: "rideId and driverId are required" });
    }

    // Check if ride exists and is accepted by this driver
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }

    if (ride.driverId !== driverId) {
      return res.status(403).json({ error: "Unauthorized: This ride is not assigned to you" });
    }

    if (ride.status !== "ACCEPTED") {
      return res.status(400).json({ error: "Ride must be accepted before starting" });
    }

    // Start ride
    const updatedRide = await prisma.$transaction(async (tx: any) => {
      const startedRide = await tx.ride.update({
        where: { id: rideId },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              profileImageUrl: true,
            },
          },
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  profileImageUrl: true,
                },
              },
            },
          },
          vehicle: true,
        },
      });

      // Create notification
      await tx.notification.create({
        data: {
          userId: ride.userId,
          title: "Ride Started",
          message: "Your ride has started",
          type: "ride",
          data: { rideId },
        },
      });

      return startedRide;
    });

    if (socketManager) {
      socketManager.emitToRoom(`user_${updatedRide.user.id}`, "ride_started", { ride: updatedRide });
      socketManager.emitToRoom(`driver_${driverId}`, "ride_started", { ride: updatedRide });
    }

    return res.status(200).json(
      {
        success: true,
        data: updatedRide,
        message: "Ride started successfully",
      }
    );
  } catch (error) {
    console.error("Error starting ride:", error);
    return res.status(500).json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};

export const completeRide = async (req: Request, res: Response) => {
  try {
    const url = new URL(req.url);
    const rideId = url.searchParams.get("rideId");
    const { driverId, finalFarePrice, rideTime, distance, paymentMethod } = req.body;

    if (!rideId || !driverId) {
      return res.status(400).json({ error: "rideId and driverId are required" });
    }

    // Check if ride exists and is in progress
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        user: { select: { id: true, name: true } },
        promoCode: {
          select: {
            discountType: true,
            discountValue: true,
            maxDiscount: true,
          },
        },
      },
    });

    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }

    if (ride.driverId !== driverId) {
      return res.status(403).json({ error: "Unauthorized: This ride is not assigned to you" });
    }

    if (ride.status !== "IN_PROGRESS") {
      return res.status(400).json({ error: "Ride must be in progress to complete" });
    }

    // Calculate final price and fees
    const baseFare = finalFarePrice || ride.negotiatedFarePrice || ride.originalFarePrice;

    // Calculate promo discount
    let promoDiscount = 0;
    if (ride.promoCode) {
      if (ride.promoCode.discountType === "percentage") {
        promoDiscount = (Number(baseFare) * Number(ride.promoCode.discountValue)) / 100;
      } else {
        promoDiscount = Number(ride.promoCode.discountValue);
      }

      if (ride.promoCode.maxDiscount && promoDiscount > Number(ride.promoCode.maxDiscount)) {
        promoDiscount = Number(ride.promoCode.maxDiscount);
      }
    }

    const finalAmount = Number(baseFare) - promoDiscount;
    const platformFee = finalAmount * 0.15; // 15% platform fee
    const driverEarning = finalAmount - platformFee;

    // Complete ride in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Update ride
      const completedRide = await tx.ride.update({
        where: { id: rideId },
        data: {
          status: "COMPLETED",
          finalFarePrice: finalAmount,
          paymentMethod: paymentMethod || null,
          paymentStatus: paymentMethod === "CASH" ? "PAID" : "PENDING",
          rideTime,
          distance,
          completedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              profileImageUrl: true,
            },
          },
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  profileImageUrl: true,
                },
              },
            },
          },
          vehicle: true,
        },
      });

      // Create payment record
      await tx.payment.create({
        data: {
          rideId,
          amount: finalAmount,
          method: paymentMethod || "CASH",
          status: paymentMethod === "CASH" ? "PAID" : "PENDING",
          promoDiscount,
          platformFee,
          driverEarning,
          processedAt: paymentMethod === "CASH" ? new Date() : null,
        },
      });

      // Update user's total rides
      await tx.user.update({
        where: { id: ride.userId },
        data: { totalRides: { increment: 1 } },
      });

      // Update driver's stats
      await tx.driver.update({
        where: { id: driverId },
        data: {
          totalRides: { increment: 1 },
          totalEarnings: { increment: driverEarning },
        },
      });

      // Create or update daily earnings record
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await tx.earning.upsert({
        where: {
          driverId_date: {
            driverId,
            date: today,
          },
        },
        update: {
          amount: { increment: driverEarning },
          rideCount: { increment: 1 },
          totalFares: { increment: finalAmount },
          platformFees: { increment: platformFee },
        },
        create: {
          driverId,
          date: today,
          amount: driverEarning,
          rideCount: 1,
          totalFares: finalAmount,
          platformFees: platformFee,
        },
      });

      // Create notifications
      await tx.notification.createMany({
        data: [
          {
            userId: ride.userId,
            title: "Ride Completed",
            message: `Your ride has been completed. Amount: ₦${finalAmount}`,
            type: "ride",
            data: { rideId, amount: finalAmount },
          },
          {
            userId: completedRide.driver?.userId,
            title: "Ride Completed",
            message: `You completed a ride. Earnings: ₦${driverEarning}`,
            type: "ride",
            data: { rideId, earnings: driverEarning },
          },
        ],
      });

      return completedRide;
    });

    if (socketManager) {
      socketManager.emitToRoom(`user_${result.user.id}`, "ride_completed", { ride: result });
      socketManager.emitToRoom(`driver_${driverId}`, "ride_completed", { ride: result });
    }

    return res.status(200).json(
      {
        success: true,
        data: {
          ...result,
          payment: {
            finalAmount,
            promoDiscount,
            platformFee,
            driverEarning,
          },
        },
        message: "Ride completed successfully",
      }
    );
  } catch (error) {
    console.error("Error completing ride:", error);
    return res.status(500).json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};

export const cancelRide = async (req: Request, res: Response) => {
  try {
    const url = new URL(req.url);
    const rideId = url.searchParams.get("rideId");
    const { userId, driverId, cancelReason } = req.body;

    if (!rideId || (!userId && !driverId)) {
      return res.status(400).json({ error: "rideId and either userId or driverId are required" });
    }

    // Check if ride exists
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        user: { select: { id: true, name: true } },
        driver: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }

    // Validate authorization
    if (userId && ride.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized: This ride does not belong to you" });
    }

    if (driverId && ride.driverId !== driverId) {
      return res.status(403).json({ error: "Unauthorized: This ride is not assigned to you" });
    }

    // Check if ride can be cancelled
    if (!["PENDING", "ACCEPTED"].includes(ride.status)) {
      return res.status(400).json({ error: "Ride cannot be cancelled in its current status" });
    }

    // Cancel ride
    const cancelledRide = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.ride.update({
        where: { id: rideId },
        data: {
          status: "CANCELLED",
          cancelReason: cancelReason || (userId ? "Cancelled by user" : "Cancelled by driver"),
          cancelledAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              profileImageUrl: true,
            },
          },
          driver: ride.driver
            ? {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      phone: true,
                      profileImageUrl: true,
                    },
                  },
                },
              }
            : false,
          vehicle: true,
        },
      });

      // Create notifications
      const notifications = [];

      if (userId && ride.driver) {
        // User cancelled, notify driver
        notifications.push({
          userId: ride.driver.user.id,
          title: "Ride Cancelled",
          message: `${ride.user.name} cancelled the ride`,
          type: "ride",
          data: { rideId, cancelledBy: "user" },
        });
      } else if (driverId) {
        // Driver cancelled, notify user
        notifications.push({
          userId: ride.userId,
          title: "Ride Cancelled",
          message: `Your driver cancelled the ride. ${cancelReason || ""}`,
          type: "ride",
          data: { rideId, cancelledBy: "driver" },
        });
      }

      if (notifications.length > 0) {
        await tx.notification.createMany({ data: notifications });
      }

      return updated;
    });

    if (socketManager) {
      if (userId && cancelledRide.driver) {
        socketManager.emitToRoom(`driver_${cancelledRide.driver.id}`, "ride_cancelled", { ride: cancelledRide });
      }
      if (driverId) {
        socketManager.emitToRoom(`user_${cancelledRide.user.id}`, "ride_cancelled", { ride: cancelledRide });
      }
    }

    return res.status(200).json(
      {
        success: true,
        data: cancelledRide,
        message: "Ride cancelled successfully",
      }
    );
  } catch (error) {
    console.error("Error cancelling ride:", error);
    return res.status(500).json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};

export const updateRide = async (req: Request, res: Response) => {
  try {
    const url = new URL(req.url);
    const rideId = url.searchParams.get("rideId");

    if (!rideId) {
      return res.status(400).json({ error: "rideId is required" });
    }

    const updateData: RideUpdateData = req.body;

    // Filter out undefined values
    const filteredUpdateData = Object.fromEntries(Object.entries(updateData).filter(([_, value]) => value !== undefined && value !== null));

    if (Object.keys(filteredUpdateData).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const updatedRide = await prisma.ride.update({
      where: { id: rideId },
      data: {
        ...filteredUpdateData,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            profileImageUrl: true,
          },
        },
        driver: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                profileImageUrl: true,
              },
            },
          },
        },
        vehicle: true,
        rating: true,
        payment: true,
      },
    });

    if (socketManager) {
      socketManager.emitToRoom(`user_${updatedRide.user.id}`, "ride_updated", { ride: updatedRide });
      if (updatedRide.driver) {
        socketManager.emitToRoom(`driver_${updatedRide.driver.id}`, "ride_updated", { ride: updatedRide });
      }
    }

    return res.status(200).json(
      {
        success: true,
        data: updatedRide,
        message: "Ride updated successfully",
      }
    );
  } catch (error) {
    console.error("Error updating ride:", error);
    return res.status(500).json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};

export const getRide = async (req: Request, res: Response) => {
  try {
    const url = new URL(req.url);
    const rideId = url.searchParams.get("rideId");
    const userId = url.searchParams.get("userId");
    const driverId = url.searchParams.get("driverId");
    const status = url.searchParams.get("status") as RideStatus;
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const includePayment = url.searchParams.get("includePayment") === "true";
    const includeRating = url.searchParams.get("includeRating") === "true";

    // Single ride fetch
    if (rideId) {
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              profileImageUrl: true,
              rating: true,
            },
          },
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  profileImageUrl: true,
                  rating: true,
                },
              },
            },
          },
          vehicle: true,
          promoCode: {
            select: {
              id: true,
              code: true,
              title: true,
              discountType: true,
              discountValue: true,
            },
          },
          negotiations: {
            orderBy: { createdAt: "desc" },
          },
          rating: includeRating,
          payment: includePayment,
        },
      });

      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }

      return res.status(200).json(
        {
          success: true,
          data: ride,
        }
      );
    }

    // Multiple rides fetch with filters
    const whereClause: any = {};

    if (userId) whereClause.userId = userId;
    if (driverId) whereClause.driverId = driverId;
    if (status) whereClause.status = status;

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
      if (dateTo) whereClause.createdAt.lte = new Date(dateTo);
    }

    const [rides, totalCount] = await Promise.all([
      prisma.ride.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              profileImageUrl: true,
              rating: true,
            },
          },
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  profileImageUrl: true,
                  rating: true,
                },
              },
            },
          },
          vehicle: {
            select: {
              id: true,
              make: true,
              model: true,
              year: true,
              color: true,
              plateNumber: true,
              seats: true,
            },
          },
          promoCode: {
            select: {
              id: true,
              code: true,
              title: true,
            },
          },
          rating: includeRating,
          payment: includePayment,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.ride.count({ where: whereClause }),
    ]);

    return res.status(200).json(
      {
        success: true,
        data: rides,
        meta: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      }
    );
  } catch (error) {
    console.error("Error fetching rides:", error);
    return res.status(500).json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};

// PATCH endpoint for specific ride actions
export const respondToNegotiation = async (rideId: string, req: Request, res: Response) => {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const rideIdParam = url.searchParams.get("rideId");

    if (!rideIdParam) {
      return res.status(400).json({ error: "rideId is required" });
    }

    if (action === "rate") {
      return await rateRide(rideIdParam, req, res);
    } else if (action === "negotiate") {
      return await negotiatePrice(rideIdParam, req, res);
    } else if (action === "respond-negotiation") {
      return await respondToNegotiationAction(rideIdParam, req, res);
    } else if (action === "update-payment") {
      return await updatePaymentStatus(rideIdParam, req, res);
    } else {
      return res.status(400).json(
        {
          error: "Invalid action. Use 'rate', 'negotiate', 'respond-negotiation', or 'update-payment'",
        }
      );
    }
  } catch (error) {
    console.error("Error in ride PATCH:", error);
    return res.status(500).json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
};

const rateRide = async (rideId: string, req: Request, res: Response) => {
  const { userId, rating, comment, isUserToDriver } = req.body;

  if (!userId || typeof rating !== "number") {
    return res.status(400).json({ error: "userId and rating are required" });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5" });
  }

  // Check if ride exists and is completed
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      rating: true,
      driver: {
        select: { userId: true },
      },
    },
  });

  if (!ride) {
    return res.status(404).json({ error: "Ride not found" });
  }

  if (ride.status !== "COMPLETED") {
    return res.status(400).json({ error: "Can only rate completed rides" });
  }

  if (ride.rating) {
    return res.status(409).json({ error: "Ride has already been rated" });
  }

  // Validate user authorization
  if (isUserToDriver && ride.userId !== userId) {
    return res.status(403).json({ error: "Unauthorized: You are not the rider" });
  }

  if (!isUserToDriver && ride.driver?.userId !== userId) {
    return res.status(403).json({ error: "Unauthorized: You are not the driver" });
  }

  // Create rating and update averages in transaction
  const result = await prisma.$transaction(async (tx: any) => {
    // Create rating
    const newRating = await tx.rating.create({
      data: {
        rideId,
        userId,
        driverId: isUserToDriver ? ride.driver!.userId : ride.userId,
        rating,
        comment,
        isUserToDriver,
      },
    });

    // Update average ratings
    if (isUserToDriver && ride.driver) {
      // Update driver's average rating
      const driverRatings = await tx.rating.aggregate({
        where: {
          driverId: ride.driver.userId,
          isUserToDriver: true,
        },
        _avg: { rating: true },
      });

      await tx.user.update({
        where: { id: ride.driver.userId },
        data: { rating: driverRatings._avg.rating },
      });

      await tx.driver.update({
        where: { userId: ride.driver.userId },
        data: { rating: driverRatings._avg.rating },
      });
    } else {
      // Update user's average rating
      const userRatings = await tx.rating.aggregate({
        where: {
          driverId: ride.userId,
          isUserToDriver: false,
        },
        _avg: { rating: true },
      });

      await tx.user.update({
        where: { id: ride.userId },
        data: { rating: userRatings._avg.rating },
      });
    }

    return newRating;
  });

  return res.status(201).json(
    {
      success: true,
      data: result,
      message: "Rating submitted successfully",
    }
  );
};

const negotiatePrice = async (rideId: string, req: Request, res: Response) => {
  const { userId, proposedPrice } = req.body;

  if (!userId || typeof proposedPrice !== "number") {
    return res.status(400).json({ error: "userId and proposedPrice are required" });
  }

  if (proposedPrice <= 0) {
    return res.status(400).json({ error: "Proposed price must be greater than 0" });
  }

  // Check if ride exists and is pending
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    select: {
      id: true,
      userId: true,
      status: true,
      originalFarePrice: true,
    },
  });

  if (!ride) {
    return res.status(404).json({ error: "Ride not found" });
  }

  if (ride.userId !== userId) {
    return res.status(403).json({ error: "Unauthorized: This ride does not belong to you" });
  }

  if (ride.status !== "PENDING") {
    return res.status(400).json({ error: "Can only negotiate pending rides" });
  }

  // Check for existing active negotiations
  const existingNegotiation = await prisma.negotiation.findFirst({
    where: {
      rideId,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
  });

  if (existingNegotiation) {
    return res.status(409).json({ error: "An active negotiation already exists for this ride" });
  }

  // Create negotiation
  const negotiation = await prisma.negotiation.create({
    data: {
      rideId,
      userId,
      proposedPrice,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    },
    include: {
      ride: {
        select: {
          id: true,
          originalFarePrice: true,
          originAddress: true,
          destinationAddress: true,
        },
      },
    },
  });

  return res.status(201).json(
    {
      success: true,
      data: negotiation,
      message: "Price negotiation submitted successfully",
    }
  );
};

const respondToNegotiationAction = async (rideId: string, req: Request, res: Response) => {
  const { negotiationId, driverId, accept } = req.body;

  if (!negotiationId || !driverId || typeof accept !== "boolean") {
    return res.status(400).json({ error: "negotiationId, driverId, and accept are required" });
  }

  // Check if negotiation exists and is pending
  const negotiation = await prisma.negotiation.findUnique({
    where: { id: negotiationId },
    include: {
      ride: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!negotiation) {
    return res.status(404).json({ error: "Negotiation not found" });
  }

  if (negotiation.status !== "PENDING") {
    return res.status(400).json({ error: "Negotiation is no longer pending" });
  }

  if (negotiation.expiresAt <= new Date()) {
    await prisma.negotiation.update({
      where: { id: negotiationId },
      data: { status: "EXPIRED" },
    });
    return res.status(400).json({ error: "Negotiation has expired" });
  }

  if (negotiation.rideId !== rideId) {
    return res.status(400).json({ error: "Negotiation does not belong to this ride" });
  }

  // Respond to negotiation in transaction
  const result = await prisma.$transaction(async (tx: any) => {
    // Update negotiation status
    const updatedNegotiation = await tx.negotiation.update({
      where: { id: negotiationId },
      data: {
        status: accept ? "ACCEPTED" : "REJECTED",
        respondedAt: new Date(),
      },
    });

    // If accepted, update ride with negotiated price
    if (accept) {
      await tx.ride.update({
        where: { id: rideId },
        data: {
          negotiatedFarePrice: negotiation.proposedPrice,
        },
      });
    }

    // Create notification
    await tx.notification.create({
      data: {
        userId: negotiation.userId,
        title: accept ? "Price Negotiation Accepted" : "Price Negotiation Rejected",
        message: accept ? `Your price negotiation of ₦${negotiation.proposedPrice} has been accepted` : "Your price negotiation has been rejected",
        type: "ride",
        data: { rideId, negotiationId, accepted: accept },
      },
    });

    return updatedNegotiation;
  });

  return res.status(200).json(
    {
      success: true,
      data: result,
      message: `Negotiation ${accept ? "accepted" : "rejected"} successfully`,
    }
  );
};

const updatePaymentStatus = async (rideId: string, req: Request, res: Response) => {
  const { paymentStatus, transactionId, paymentMethod } = req.body;

  if (!paymentStatus) {
    return res.status(400).json({ error: "paymentStatus is required" });
  }

  // Check if ride exists
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      payment: true,
      user: { select: { id: true, name: true } },
      driver: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!ride) {
    return res.status(404).json({ error: "Ride not found" });
  }

  if (!ride.payment) {
    return res.status(404).json({ error: "No payment record found for this ride" });
  }

  // Update payment in transaction
  const result = await prisma.$transaction(async (tx: any) => {
    // Update payment
    const updatedPayment = await tx.payment.update({
      where: { rideId },
      data: {
        status: paymentStatus,
        transactionId,
        method: paymentMethod || ride.payment!.method,
        processedAt: paymentStatus === "PAID" ? new Date() : ride.payment!.processedAt,
      },
    });

    // Update ride payment status
    await tx.ride.update({
      where: { id: rideId },
      data: {
        paymentStatus,
        paymentMethod: paymentMethod || ride.paymentMethod,
      },
    });

    // Handle wallet payment if applicable
    if (paymentMethod === "WALLET" && paymentStatus === "PAID") {
      // Deduct from user's wallet
      const wallet = await tx.wallet.findUnique({
        where: { userId: ride.userId },
      });

      if (!wallet || Number(wallet.balance) < Number(updatedPayment.amount)) {
        throw new Error("Insufficient wallet balance");
      }

      await tx.wallet.update({
        where: { userId: ride.userId },
        data: {
          balance: { decrement: updatedPayment.amount },
          totalSpent: { increment: updatedPayment.amount },
        },
      });

      // Create wallet transaction
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "ride_payment",
          amount: Number(updatedPayment.amount),
          description: `Payment for ride from ${ride.originAddress} to ${ride.destinationAddress}`,
          referenceId: rideId,
          balanceBefore: wallet.balance,
          balanceAfter: Number(wallet.balance) - Number(updatedPayment.amount),
        },
      });
    }

    // Create notifications
    const notifications = [];

    if (paymentStatus === "PAID") {
      notifications.push({
        userId: ride.userId,
        title: "Payment Successful",
        message: `Payment of ₦${updatedPayment.amount} has been processed`,
        type: "payment",
        data: { rideId, paymentId: updatedPayment.id },
      });

      if (ride.driver) {
        notifications.push({
          userId: ride.driver.userId,
          title: "Payment Received",
          message: `Payment for your ride has been processed`,
          type: "payment",
          data: { rideId, earnings: updatedPayment.driverEarning },
        });
      }
    } else if (paymentStatus === "FAILED") {
      notifications.push({
        userId: ride.userId,
        title: "Payment Failed",
        message: "Your payment could not be processed. Please try again.",
        type: "payment",
        data: { rideId, paymentId: updatedPayment.id },
      });
    }

    if (notifications.length > 0) {
      await tx.notification.createMany({ data: notifications });
    }

    return updatedPayment;
  });

  return res.status(200).json(
    {
      success: true,
      data: result,
      message: "Payment status updated successfully",
    }
  );
};

// Additional utility functions

// GET endpoint for ride matching (find available rides for drivers)
export async function GET_AVAILABLE_RIDES(request: Request) {
  try {
    const url = new URL(request.url);
    const driverLatitude = parseFloat(url.searchParams.get("latitude") || "0");
    const driverLongitude = parseFloat(url.searchParams.get("longitude") || "0");
    const radius = parseFloat(url.searchParams.get("radius") || "10"); // km
    const limit = parseInt(url.searchParams.get("limit") || "10");

    if (!driverLatitude || !driverLongitude) {
      return Response.json({ error: "Driver latitude and longitude are required" }, { status: 400 });
    }

    // Get pending rides within radius
    const pendingRides = await prisma.ride.findMany({
      where: {
        status: "PENDING",
        driverId: null,
        scheduledAt: {
          lte: new Date(Date.now() + 30 * 60 * 1000), // Within next 30 minutes or past
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
        promoCode: {
          select: {
            code: true,
            title: true,
          },
        },
        negotiations: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "asc" },
      take: limit * 3, // Get more to filter by distance
    });

    // Calculate distances and filter
    const ridesWithDistance = pendingRides
      .map((ride: any) => {
        const lat1 = Number(ride.originLatitude);
        const lon1 = Number(ride.originLongitude);
        const lat2 = driverLatitude;
        const lon2 = driverLongitude;

        // Haversine formula
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return {
          ...ride,
          distanceFromDriver: Math.round(distance * 100) / 100,
          currentNegotiation: ride.negotiations[0] || null,
        };
      })
      .filter((ride: any) => ride.distanceFromDriver <= radius)
      .sort((a: any, b: any) => a.distanceFromDriver - b.distanceFromDriver)
      .slice(0, limit);

    return Response.json(
      {
        success: true,
        data: ridesWithDistance,
        meta: {
          total: ridesWithDistance.length,
          searchRadius: radius,
          driverLocation: { latitude: driverLatitude, longitude: driverLongitude },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching available rides:", error);
    return Response.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint for ride tracking
export async function GET_RIDE_TRACKING(request: Request) {
  try {
    const url = new URL(request.url);
    const rideId = url.searchParams.get("rideId");
    const userId = url.searchParams.get("userId");

    if (!rideId || !userId) {
      return Response.json({ error: "rideId and userId are required" }, { status: 400 });
    }

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
        driver: {
          select: {
            id: true,
            currentLatitude: true,
            currentLongitude: true,
            isOnline: true,
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                profileImageUrl: true,
              },
            },
          },
        },
        vehicle: {
          select: {
            make: true,
            model: true,
            color: true,
            plateNumber: true,
          },
        },
      },
    });

    if (!ride) {
      return Response.json({ error: "Ride not found" }, { status: 404 });
    }

    // Verify user authorization
    if (ride.userId !== userId && ride.driver?.user.id !== userId) {
      return Response.json({ error: "Unauthorized to track this ride" }, { status: 403 });
    }

    // Format driver location
    const trackingData = {
      ...ride,
      driverLocation:
        ride.driver?.currentLatitude && ride.driver?.currentLongitude
          ? {
              latitude: Number(ride.driver.currentLatitude),
              longitude: Number(ride.driver.currentLongitude),
            }
          : null,
    };

    return Response.json(
      {
        success: true,
        data: trackingData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching ride tracking:", error);
    return Response.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint for ride statistics
export async function GET_RIDE_STATS(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const driverId = url.searchParams.get("driverId");
    const period = url.searchParams.get("period") || "month"; // "week", "month", "year"

    if (!userId && !driverId) {
      return Response.json({ error: "userId or driverId is required" }, { status: 400 });
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const whereClause: any = {
      createdAt: { gte: startDate },
    };

    if (userId) whereClause.userId = userId;
    if (driverId) whereClause.driverId = driverId;

    // Get ride statistics
    const [rideStats, totalSpent, avgRating] = await Promise.all([
      prisma.ride.groupBy({
        by: ["status"],
        where: whereClause,
        _count: true,
        _sum: {
          finalFarePrice: true,
        },
      }),
      prisma.ride.aggregate({
        where: {
          ...whereClause,
          status: "COMPLETED",
        },
        _sum: {
          finalFarePrice: true,
        },
      }),
      userId
        ? prisma.rating.aggregate({
            where: {
              userId,
              isUserToDriver: false,
              createdAt: { gte: startDate },
            },
            _avg: { rating: true },
            _count: true,
          })
        : prisma.rating.aggregate({
            where: {
              driverId: await prisma.driver.findUnique({ where: { id: driverId! } }).then((d: any) => d?.userId),
              isUserToDriver: true,
              createdAt: { gte: startDate },
            },
            _avg: { rating: true },
            _count: true,
          }),
    ]);

    const stats = {
      period,
      totalRides: rideStats.reduce((sum: any, stat: any) => sum + stat._count, 0),
      completedRides: (rideStats.find((stat: any) => stat.status === "COMPLETED") ?? { _count: 0 }),
      cancelledRides: (rideStats.find((stat: any) => stat.status === "CANCELLED") ?? { _count: 0 }),
      pendingRides: (rideStats.find((stat: any) => stat.status === "PENDING")?? { _count: 0 }),
      totalAmount: totalSpent._sum.finalFarePrice ? Number(totalSpent._sum.finalFarePrice) : 0,
      averageRating: avgRating._avg.rating ? Number(avgRating._avg.rating) : null,
      totalRatings: avgRating._count,
      ridesByStatus: rideStats.map((stat: any) => ({
        status: stat.status,
        count: stat._count,
        totalAmount: stat._sum.finalFarePrice ? Number(stat._sum.finalFarePrice) : 0,
      })),
    };

    return Response.json(
      {
        success: true,
        data: stats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching ride stats:", error);
    return Response.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
    