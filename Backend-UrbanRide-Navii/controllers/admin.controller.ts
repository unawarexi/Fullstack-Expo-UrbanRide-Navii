import { prisma } from "@/lib/prisma";
import { AccountStatus, PaymentStatus, RideStatus, Role, VehicleStatus } from "@prisma/client";
import { Request, Response } from "express";

// Middleware to check admin permissions (expects userId in request body or headers)
async function requireAdmin(request: Request) {
  // For Expo, get userId from request body or headers
  let userId: string | undefined;
  try {
    // Try to get userId from headers first
    userId = (request.headers as any).get?.("x-user-id");
    if (!userId) {
      // Try to get userId from body
      const body = request.body;
      userId = body.userId;
    }
  } catch {
    // Ignore error, userId may not be present
  }

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { adminProfile: true },
  });

  if (!user || user.role !== Role.ADMIN || !user.adminProfile?.isVerified) {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  return user;
}

// GET /api/admin/dashboard - Dashboard statistics
export const getAdminDashboard = async (req: Request, res: Response) => {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const adminUser = await requireAdmin(req);
    if (adminUser instanceof Response) return adminUser;

    switch (action) {
      case "dashboard":
        return await getDashboardStats();
      case "users":
         return await getUsers(req);
      case "drivers":
        return await getDrivers(req);
      case "rides":
        return await getRides(req);
      case "support-tickets":
        return await getSupportTickets(req);
      case "promo-codes":
        return await getPromoCodes();
      case "settings":
        return await getAppSettings();
      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};

async function getDashboardStats() {
  const [totalUsers, totalDrivers, totalRides, pendingVerifications, todayRides, revenue, activeTickets] = await Promise.all([
    prisma.user.count({ where: { role: Role.USER } }),
    prisma.driver.count(),
    prisma.ride.count(),
    prisma.driver.count({ where: { isVerified: false } }),
    prisma.ride.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.payment.aggregate({
      where: { status: PaymentStatus.PAID },
      _sum: { amount: true },
    }),
    prisma.supportTicket.count({
      where: { status: { in: ["open", "in_progress"] } },
    }),
  ]);

  return Response.json({
    totalUsers,
    totalDrivers,
    totalRides,
    pendingVerifications,
    todayRides,
    totalRevenue: revenue._sum.amount || 0,
    activeTickets,
  });
}

export const getUsers = async (req: Request) => {
  const searchParams = req.query;
  const page = parseInt(searchParams.page as string) || 1;
  const limit = parseInt(searchParams.limit as string) || 20;
  const search = (searchParams.search as string) || "";
  const status = searchParams.status as AccountStatus;

  const where = {
    ...(search && {
      OR: [{ name: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }, { phone: { contains: search, mode: "insensitive" as const } }],
    }),
    ...(status && { accountStatus: status }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        driverProfile: true,
        _count: {
          select: {
            userRides: true,
            supportTickets: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { joinedAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return Response.json({
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

export const getDrivers = async (req: Request) => {
  const searchParams = req.query;
  const page = parseInt(searchParams.page as string) || 1;
  const limit = parseInt(searchParams.limit as string) || 20;
  const verified = searchParams.verified as string | undefined;

  const where = {
    ...(verified !== null && { isVerified: verified === "true" }),
  };

  const [drivers, total] = await Promise.all([
    prisma.driver.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            accountStatus: true,
          },
        },
        vehicles: true,
        _count: {
          select: {
            driverRides: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.driver.count({ where }),
  ]);

  return Response.json({
    drivers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

export const getRides = async (req: Request) => {
  const searchParams = req.query;
  const page = parseInt(searchParams.page as string) || 1;
  const limit = parseInt(searchParams.limit as string) || 20;
  const status = searchParams.status as RideStatus;
  const date = searchParams.date as string | undefined;

  const where = {
    ...(status && { status }),
    ...(date && {
      createdAt: {
        gte: new Date(date),
        lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
      },
    }),
  };

  const [rides, total] = await Promise.all([
    prisma.ride.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        driver: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        vehicle: {
          select: {
            make: true,
            model: true,
            plateNumber: true,
          },
        },
        payment: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.ride.count({ where }),
  ]);

  return Response.json({
    rides,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

export const getSupportTickets = async (req: Request) => {
  const searchParams = req.query;
  const page = parseInt(searchParams.page as string) || 1;
  const limit = parseInt(searchParams.limit as string) || 20;
  const status = searchParams.status as string | undefined;
  const priority = searchParams.priority as string | undefined;

  const where = {
    ...(status && { status }),
    ...(priority && { priority }),
  };

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        admin: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return Response.json({
    tickets,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

async function getPromoCodes() {
  const promoCodes = await prisma.promoCode.findMany({
    include: {
      _count: {
        select: {
          userPromos: true,
          rides: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ promoCodes });
}

async function getAppSettings() {
  const settings = await prisma.appSetting.findMany({
    orderBy: { key: "asc" },
  });

  return Response.json({ settings });
}

// POST /api/admin - Handle admin actions
export async function POST(request: Request) {
  try {
    const adminUser = await requireAdmin(request);
    if (adminUser instanceof Response) return adminUser;

    const body = await request.body;
    const { action, data } = body;

    switch (action) {
      case "verify-driver":
        return await verifyDriver(data.driverId);
      case "suspend-user":
        return await suspendUser(data.userId, data.reason);
      case "activate-user":
        return await activateUser(data.userId);
      case "create-promo":
        return await createPromoCode(data);
      case "update-promo":
        return await updatePromoCode(data.id, data);
      case "assign-ticket":
        return await assignSupportTicketInternal(data.ticketId, adminUser.adminProfile!.id);
      case "resolve-ticket":
        return await resolveSupportTicket(data.ticketId);
      case "update-setting":
        return await updateAppSetting(data.key, data.value);
      case "send-notification":
        return await sendBulkNotification(data);
      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin action error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const verifyDriver = async (req: Request, ) => {
  const driverId = req.body.driverId;

  const driver = await prisma.driver.update({
    where: { id: driverId },
    data: { isVerified: true },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  // Create notification for driver
  await prisma.notification.create({
    data: {
      userId: driver.userId,
      title: "Driver Verification Approved",
      message: "Congratulations! Your driver profile has been verified. You can now start accepting rides.",
      type: "system",
    },
  });

  // Log the action
  await prisma.systemLog.create({
    data: {
      action: "driver_verified",
      entityType: "driver",
      entityId: driverId,
      details: { verifiedBy: "admin" },
    },
  });

  return Response.json({
    success: true,
    message: "Driver verified successfully",
    driver,
  });
};

export const suspendUser = async (req: Request, res: Response) => {
  const { userId, reason } = req.body;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: AccountStatus.SUSPENDED },
  });

  // Create notification
  await prisma.notification.create({
    data: {
      userId,
      title: "Account Suspended",
      message: `Your account has been suspended. Reason: ${reason}`,
      type: "system",
    },
  });

  // Log the action
  await prisma.systemLog.create({
    data: {
      action: "user_suspended",
      entityType: "user",
      entityId: userId,
      details: { reason },
    },
  });

  return Response.json({
    success: true,
    message: "User suspended successfully",
    user,
  });
};

export const activateUser = async (req: Request) => {
  const userId = req.body.userId;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: AccountStatus.ACTIVE },
  });

  // Create notification
  await prisma.notification.create({
    data: {
      userId,
      title: "Account Activated",
      message: "Your account has been reactivated. Welcome back!",
      type: "system",
    },
  });

  return Response.json({
    success: true,
    message: "User activated successfully",
    user,
  });
};

export const createPromoCode = async (req: Request) => {
  const data = req.body;

  const promoCode = await prisma.promoCode.create({
    data: {
      code: data.code.toUpperCase(),
      title: data.title,
      description: data.description,
      type: data.type,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minRideAmount: data.minRideAmount,
      maxDiscount: data.maxDiscount,
      usageLimit: data.usageLimit,
      userLimit: data.userLimit,
      validFrom: new Date(data.validFrom),
      validUntil: new Date(data.validUntil),
      targetUserIds: data.targetUserIds || [],
    },
  });

  return Response.json({
    success: true,
    message: "Promo code created successfully",
    promoCode,
  });
};

export const updatePromoCode = async (req: Request, res: Response) => {
  const id = req.body.id;
  const data = req.body;

  const promoCode = await prisma.promoCode.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minRideAmount: data.minRideAmount,
      maxDiscount: data.maxDiscount,
      usageLimit: data.usageLimit,
      userLimit: data.userLimit,
      isActive: data.isActive,
      validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      targetUserIds: data.targetUserIds || [],
    },
  });

  return Response.json({
    success: true,
    message: "Promo code updated successfully",
    promoCode,
  });
};

export const assignSupportTicket = async (req: Request, res: Response) => {
  const ticketId = req.body.ticketId;
  const adminId = req.body.adminId;
  return await assignSupportTicketInternal(ticketId, adminId);
};

// Internal function for assigning support ticket
async function assignSupportTicketInternal(ticketId: string, adminId: string) {
  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      adminId,
      status: "in_progress",
      updatedAt: new Date(),
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return Response.json({
    success: true,
    message: "Ticket assigned successfully",
    ticket,
  });
}

export const resolveSupportTicket = async (req: Request,) => {
  const ticketId = req.body.ticketId;

  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: "resolved",
      resolvedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Notify user
  await prisma.notification.create({
    data: {
      userId: ticket.userId,
      title: "Support Ticket Resolved",
      message: `Your support ticket "${ticket.subject}" has been resolved.`,
      type: "system",
    },
  });

  return Response.json({
    success: true,
    message: "Ticket resolved successfully",
    ticket,
  });
};

export const updateAppSetting = async (req: Request, res: Response) => {
  const key = req.body.key;
  const value = req.body.value;

  const setting = await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value, updatedAt: new Date() },
  });

  return Response.json({
    success: true,
    message: "Setting updated successfully",
    setting,
  });
};

export const sendBulkNotification = async (req: Request) => {
  const data = req.body;
  const { title, message, userIds, type = "system" } = data;

  const notifications = userIds.map((userId: string) => ({
    userId,
    title,
    message,
    type,
  }));

  await prisma.notification.createMany({
    data: notifications,
  });

  return Response.json({
    success: true,
    message: `Notification sent to ${userIds.length} users`,
  });
};

// PUT /api/admin - Update specific entities
export async function PUT(request: Request) {
  try {
    const adminUser = await requireAdmin(request);
    if (adminUser instanceof Response) return adminUser;

    const body = await request.body
    const { action, id, data } = body;

    switch (action) {
      case "update-user":
        return await updateUser(id, data);
      case "update-driver":
        return await updateDriver(id, data);
      case "update-vehicle-status":
        return await updateVehicleStatus(id, data.status);
      case "refund-payment":
        return await refundPayment(id, data.reason);
      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin update error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function updateUser(userId: string, data: any) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      phone: data.phone,
      accountStatus: data.accountStatus,
      role: data.role,
    },
  });

  return Response.json({
    success: true,
    message: "User updated successfully",
    user,
  });
}

async function updateDriver(driverId: string, data: any) {
  const driver = await prisma.driver.update({
    where: { id: driverId },
    data: {
      isVerified: data.isVerified,
      bankAccountNumber: data.bankAccountNumber,
      bankName: data.bankName,
    },
  });

  return Response.json({
    success: true,
    message: "Driver updated successfully",
    driver,
  });
}

async function updateVehicleStatus(vehicleId: string, status: VehicleStatus) {
  const vehicle = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status },
  });

  return Response.json({
    success: true,
    message: "Vehicle status updated successfully",
    vehicle,
  });
}

async function refundPayment(paymentId: string, reason: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { ride: { include: { user: true } } },
  });

  if (!payment) {
    return Response.json({ error: "Payment not found" }, { status: 404 });
  }

  // Update payment status
  const updatedPayment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: PaymentStatus.REFUNDED },
  });

  // Add to user wallet if they have one
  const wallet = await prisma.wallet.findUnique({
    where: { userId: payment.ride.userId },
  });

  if (wallet) {
    await prisma.$transaction([
      prisma.wallet.update({
        where: { userId: payment.ride.userId },
        data: { balance: { increment: payment.amount } },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "refund",
          amount: payment.amount,
          description: `Refund for ride payment - ${reason}`,
          referenceId: payment.rideId,
          balanceBefore: wallet.balance,
          balanceAfter: wallet.balance.add(payment.amount),
        },
      }),
    ]);
  }

  // Notify user
  await prisma.notification.create({
    data: {
      userId: payment.ride.userId,
      title: "Payment Refunded",
      message: `Your payment of ₦${payment.amount} has been refunded. Reason: ${reason}`,
      type: "payment",
    },
  });

  return Response.json({
    success: true,
    message: "Payment refunded successfully",
    payment: updatedPayment,
  });
}

// DELETE /api/admin - Delete entities
export async function DELETE(request: Request) {
  try {
    const adminUser = await requireAdmin(request);
    if (adminUser instanceof Response) return adminUser;

    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json({ error: "ID is required" }, { status: 400 });
    }

    switch (action) {
      case "delete-user":
        return await deleteUser(id);
      case "delete-promo":
        return await deletePromoCode(id);
      case "delete-vehicle":
        return await deleteVehicle(id);
      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin delete error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function deleteUser(userId: string) {
  // Check if user has active rides
  const activeRides = await prisma.ride.count({
    where: {
      userId,
      status: { in: [RideStatus.PENDING, RideStatus.ACCEPTED, RideStatus.IN_PROGRESS] },
    },
  });

  if (activeRides > 0) {
    return Response.json(
      {
        error: "Cannot delete user with active rides",
      },
      { status: 400 }
    );
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  return Response.json({
    success: true,
    message: "User deleted successfully",
  });
}

async function deletePromoCode(promoId: string) {
  await prisma.promoCode.delete({
    where: { id: promoId },
  });

  return Response.json({
    success: true,
    message: "Promo code deleted successfully",
  });
}

async function deleteVehicle(vehicleId: string) {
  // Check if vehicle has active rides
  const activeRides = await prisma.ride.count({
    where: {
      vehicleId,
      status: { in: [RideStatus.ACCEPTED, RideStatus.IN_PROGRESS] },
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

  await prisma.vehicle.delete({
    where: { id: vehicleId },
  });

  return Response.json({
    success: true,
    message: "Vehicle deleted successfully",
  });
}

// GET /api/admin/analytics - Analytics data
export async function analytics(request: Request) {
  try {
    const adminUser = await requireAdmin(request);
    if (adminUser instanceof Response) return adminUser;

    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "7d"; // 7d, 30d, 90d

    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [rideStats, revenueStats, userGrowth, driverStats, topRoutes] = await Promise.all([
      getRideAnalytics(startDate),
      getRevenueAnalytics(startDate),
      getUserGrowthAnalytics(startDate),
      getDriverAnalytics(startDate),
      getTopRoutes(startDate),
    ]);

    return Response.json({
      period,
      rideStats,
      revenueStats,
      userGrowth,
      driverStats,
      topRoutes,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function getRideAnalytics(startDate: Date) {
  const rides = await prisma.ride.groupBy({
    by: ["status"],
    where: {
      createdAt: { gte: startDate },
    },
    _count: true,
  });

  const dailyRides = await prisma.ride.findMany({
    where: {
      createdAt: { gte: startDate },
    },
    select: {
      createdAt: true,
      status: true,
    },
  });

  return {
    byStatus: rides,
    daily: dailyRides,
  };
}

async function getRevenueAnalytics(startDate: Date) {
  const payments = await prisma.payment.aggregate({
    where: {
      status: PaymentStatus.PAID,
      createdAt: { gte: startDate },
    },
    _sum: {
      amount: true,
      platformFee: true,
      driverEarning: true,
    },
    _count: true,
  });

  return payments;
}

async function getUserGrowthAnalytics(startDate: Date) {
  const users = await prisma.user.groupBy({
    by: ["joinedAt"],
    where: {
      joinedAt: { gte: startDate },
    },
    _count: true,
  });

  return users;
}

async function getDriverAnalytics(startDate: Date) {
  const drivers = await prisma.driver.findMany({
    where: {
      createdAt: { gte: startDate },
    },
    select: {
      isVerified: true,
      isOnline: true,
      totalRides: true,
      totalEarnings: true,
      rating: true,
    },
  });

  return {
    total: drivers.length,
    verified: drivers.filter((d: any) => d.isVerified).length,
    online: drivers.filter((d: any) => d.isOnline).length,
    averageRating: drivers.reduce((acc: any, d: any) => acc + (d.rating?.toNumber() || 0), 0) / drivers.length,
  };
}

async function getTopRoutes(startDate: Date) {
  const rides = await prisma.ride.findMany({
    where: {
      createdAt: { gte: startDate },
      status: RideStatus.COMPLETED,
    },
    select: {
      originAddress: true,
      destinationAddress: true,
    },
    take: 100,
  });

  // Group by route
  const routeMap = new Map();
  rides.forEach((ride: any) => {
    const route = `${ride.originAddress} → ${ride.destinationAddress}`;
    routeMap.set(route, (routeMap.get(route) || 0) + 1);
  });

  const topRoutes = Array.from(routeMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([route, count]) => ({ route, count }));

  return topRoutes;
}

// GET /api/admin/export - Export data
export async function exportData(request: Request) {
  try {
    const adminUser = await requireAdmin(request);
    if (adminUser instanceof Response) return adminUser;

    const url = new URL(request.url);
    const type = url.searchParams.get("type"); // 'users', 'drivers', 'rides', 'payments'
    const format = url.searchParams.get("format") || "json"; // 'json', 'csv'

    let data;
    switch (type) {
      case "users":
        data = await prisma.user.findMany({
          include: {
            driverProfile: true,
            _count: {
              select: {
                userRides: true,
              },
            },
          },
        });
        break;
      case "drivers":
        data = await prisma.driver.findMany({
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
            vehicles: true,
          },
        });
        break;
      case "rides":
        data = await prisma.ride.findMany({
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            driver: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            payment: true,
          },
        });
        break;
      case "payments":
        data = await prisma.payment.findMany({
          include: {
            ride: {
              select: {
                id: true,
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
        break;
      default:
        return Response.json({ error: "Invalid export type" }, { status: 400 });
    }

    if (format === "csv") {
      // Convert to CSV format
      const csv = convertToCSV(data);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${type}_export_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return Response.json({ data });
  } catch (error) {
    console.error("Export error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return "";

  // Get all unique keys from the data
  const keys = Array.from(new Set(data.flatMap((item) => Object.keys(flattenObject(item)))));

  // Create header
  const header = keys.join(",");

  // Create rows
  const rows = data.map((item) => {
    const flattened = flattenObject(item);
    return keys
      .map((key) => {
        const value = flattened[key];
        // Escape commas and quotes in CSV
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || "";
      })
      .join(",");
  });

  return [header, ...rows].join("\n");
}

function flattenObject(obj: any, prefix = ""): any {
  const flattened: any = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (value === null || value === undefined) {
        flattened[newKey] = "";
      } else if (typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        flattened[newKey] = value.join(";");
      } else {
        flattened[newKey] = value;
      }
    }
  }

  return flattened;
}

// GET /api/admin/reports - Generate reports
export async function reports(request: Request) {
  try {
    const adminUser = await requireAdmin(request);
    if (adminUser instanceof Response) return adminUser;

    const url = new URL(request.url);
    const reportType = url.searchParams.get("type");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    const dateFilter = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) }),
    };

    switch (reportType) {
      case "financial":
        return await generateFinancialReport(dateFilter);
      case "driver-performance":
        return await generateDriverPerformanceReport(dateFilter);
      case "user-activity":
        return await generateUserActivityReport(dateFilter);
      case "ride-analysis":
        return await generateRideAnalysisReport(dateFilter);
      case "support-summary":
        return await generateSupportSummaryReport(dateFilter);
      default:
        return Response.json({ error: "Invalid report type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Report generation error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function generateFinancialReport(dateFilter: any) {
  const [totalRevenue, platformFees, driverEarnings, refunds, promoDiscounts, paymentMethods] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        status: PaymentStatus.PAID,
        createdAt: dateFilter,
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: {
        status: PaymentStatus.PAID,
        createdAt: dateFilter,
      },
      _sum: { platformFee: true },
    }),
    prisma.payment.aggregate({
      where: {
        status: PaymentStatus.PAID,
        createdAt: dateFilter,
      },
      _sum: { driverEarning: true },
    }),
    prisma.payment.aggregate({
      where: {
        status: PaymentStatus.REFUNDED,
        createdAt: dateFilter,
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: {
        status: PaymentStatus.PAID,
        createdAt: dateFilter,
      },
      _sum: { promoDiscount: true },
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: {
        status: PaymentStatus.PAID,
        createdAt: dateFilter,
      },
      _count: true,
      _sum: { amount: true },
    }),
  ]);

  return Response.json({
    summary: {
      totalRevenue: totalRevenue._sum.amount || 0,
      totalTransactions: totalRevenue._count,
      platformFees: platformFees._sum.platformFee || 0,
      driverEarnings: driverEarnings._sum.driverEarning || 0,
      totalRefunds: refunds._sum.amount || 0,
      refundCount: refunds._count,
      promoDiscounts: promoDiscounts._sum.promoDiscount || 0,
    },
    paymentMethods,
    generatedAt: new Date(),
  });
}

async function generateDriverPerformanceReport(dateFilter: any) {
  const drivers = await prisma.driver.findMany({
    where: {
      createdAt: dateFilter,
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      driverRides: {
        where: {
          createdAt: dateFilter,
          status: RideStatus.COMPLETED,
        },
        include: {
          rating: true,
          payment: true,
        },
      },
      earnings: {
        where: {
          date: dateFilter,
        },
      },
    },
  });

  const performanceData = drivers.map((driver: any) => {
    const completedRides = driver.driverRides.length;
    const totalEarnings = driver.driverRides.reduce((sum: any, ride: any) => sum + (ride.payment?.driverEarning?.toNumber() || 0), 0);
    const averageRating = driver.driverRides.filter((ride: any) => ride.rating).reduce((sum: any, ride: any) => sum + (ride.rating?.rating || 0), 0) / (driver.driverRides.filter((ride: any) => ride.rating).length || 1);

    return {
      driverId: driver.id,
      driverName: driver.user.name,
      email: driver.user.email,
      completedRides,
      totalEarnings,
      averageRating: Math.round(averageRating * 100) / 100,
      isVerified: driver.isVerified,
      joinedAt: driver.createdAt,
    };
  });

  return Response.json({
    drivers: performanceData.sort((a: any, b: any) => b.totalEarnings - a.totalEarnings),
    summary: {
      totalDrivers: drivers.length,
      verifiedDrivers: drivers.filter((d: any) => d.isVerified).length,
      activeDrivers: drivers.filter((d: any) => d.driverRides.length > 0).length,
      averageRating: performanceData.reduce((sum: any, d: any) => sum + d.averageRating, 0) / performanceData.length,
    },
    generatedAt: new Date(),
  });
}

async function generateUserActivityReport(dateFilter: any) {
  const [newUsers, activeUsers, rideActivity, userRetention] = await Promise.all([
    prisma.user.count({
      where: {
        joinedAt: dateFilter,
        role: Role.USER,
      },
    }),
    prisma.user.count({
      where: {
        lastActiveAt: dateFilter,
        role: Role.USER,
      },
    }),
    prisma.ride.groupBy({
      by: ["userId"],
      where: {
        createdAt: dateFilter,
      },
      _count: true,
    }),
    prisma.user.findMany({
      where: {
        role: Role.USER,
        userRides: {
          some: {
            createdAt: dateFilter,
          },
        },
      },
      select: {
        id: true,
        name: true,
        joinedAt: true,
        _count: {
          select: {
            userRides: true,
          },
        },
      },
    }),
  ]);

  return Response.json({
    summary: {
      newUsers,
      activeUsers,
      totalRideRequests: rideActivity.length,
      averageRidesPerUser: rideActivity.reduce((sum: any, user: any) => sum + user._count, 0) / rideActivity.length,
    },
    topUsers: userRetention.sort((a: any, b: any) => b._count.userRides - a._count.userRides).slice(0, 20),
    generatedAt: new Date(),
  });
}

async function generateRideAnalysisReport(dateFilter: any) {
  const [ridesByStatus, ridesByHour, averageWaitTime, cancellationReasons, popularRoutes] = await Promise.all([
    prisma.ride.groupBy({
      by: ["status"],
      where: {
        createdAt: dateFilter,
      },
      _count: true,
    }),
    prisma.ride.findMany({
      where: {
        createdAt: dateFilter,
      },
      select: {
        createdAt: true,
      },
    }),
    prisma.ride.aggregate({
      where: {
        createdAt: dateFilter,
        acceptedAt: { not: null },
        status: { in: [RideStatus.ACCEPTED, RideStatus.COMPLETED] },
      },
      _avg: {
        // Calculate average time between creation and acceptance
        rideTime: true,
      },
    }),
    prisma.ride.groupBy({
      by: ["cancelReason"],
      where: {
        createdAt: dateFilter,
        status: RideStatus.CANCELLED,
        cancelReason: { not: null },
      },
      _count: true,
    }),
    prisma.ride.findMany({
      where: {
        createdAt: dateFilter,
        status: RideStatus.COMPLETED,
      },
      select: {
        originAddress: true,
        destinationAddress: true,
      },
      take: 1000,
    }),
  ]);

  // Process hourly data
  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: ridesByHour.filter((ride: any) => new Date(ride.createdAt).getHours() === hour).length,
  }));

  // Process popular routes
  const routeMap = new Map();
  popularRoutes.forEach((ride: any) => {
    const route = `${ride.originAddress} → ${ride.destinationAddress}`;
    routeMap.set(route, (routeMap.get(route) || 0) + 1);
  });

  const topRoutes = Array.from(routeMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([route, count]) => ({ route, count }));

  return Response.json({
    summary: {
      totalRides: ridesByStatus.reduce((sum: any, status: any) => sum + status._count, 0),
      completedRides: ridesByStatus.find((s: any) => s.status === RideStatus.COMPLETED)?._count || 0,
      cancelledRides: ridesByStatus.find((s: any) => s.status === RideStatus.CANCELLED)?._count || 0,
      averageWaitTime: averageWaitTime._avg && averageWaitTime._avg.rideTime ? averageWaitTime._avg.rideTime : 0,
    },
    ridesByStatus,
    hourlyDistribution: hourlyData,
    cancellationReasons,
    popularRoutes: topRoutes,
    generatedAt: new Date(),
  });
}

async function generateSupportSummaryReport(dateFilter: any) {
  const [ticketsByStatus, ticketsByCategory, ticketsByPriority, averageResolutionTime, adminPerformance] = await Promise.all([
    prisma.supportTicket.groupBy({
      by: ["status"],
      where: {
        createdAt: dateFilter,
      },
      _count: true,
    }),
    prisma.supportTicket.groupBy({
      by: ["category"],
      where: {
        createdAt: dateFilter,
      },
      _count: true,
    }),
    prisma.supportTicket.groupBy({
      by: ["priority"],
      where: {
        createdAt: dateFilter,
      },
      _count: true,
    }),
    prisma.supportTicket.aggregate({
      where: {
        createdAt: dateFilter,
        resolvedAt: { not: null },
      },
      _avg: {
        // This would need to be calculated based on createdAt and resolvedAt difference
      },
    }),
    prisma.supportTicket.groupBy({
      by: ["adminId"],
      where: {
        createdAt: dateFilter,
        adminId: { not: null },
      },
      _count: true,
    }),
  ]);

  // Get admin details
  const adminIds = adminPerformance.map((ap: any) => ap.adminId).filter(Boolean);
  const admins = await prisma.admin.findMany({
    where: {
      id: { in: adminIds as string[] },
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  const adminPerformanceWithNames = adminPerformance.map((ap: any) => {
    const admin = admins.find((a: any) => a.id === ap.adminId);
    return {
      adminId: ap.adminId,
      adminName: admin?.user.name || "Unknown",
      ticketsHandled: ap._count,
    };
  });

  return Response.json({
    summary: {
      totalTickets: ticketsByStatus.reduce((sum: any, status: any) => sum + status._count, 0),
      resolvedTickets: ticketsByStatus.find((s: any) => s.status === "resolved")?._count || 0,
      openTickets: ticketsByStatus.find((s: any) => s.status === "open")?._count || 0,
      inProgressTickets: ticketsByStatus.find((s: any) => s.status === "in_progress")?._count || 0,
    },
    ticketsByStatus,
    ticketsByCategory,
    ticketsByPriority,
    adminPerformance: adminPerformanceWithNames.sort((a: any, b: any) => b.ticketsHandled - a.ticketsHandled),
    generatedAt: new Date(),
  });
}

// POST /api/admin/bulk-actions - Handle bulk operations
export async function bulkActions(request: Request) {
  try {
    const adminUser = await requireAdmin(request);
    if (adminUser instanceof Response) return adminUser;

    const body = await request.body;
    const { action, ids, data } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: "IDs array is required" }, { status: 400 });
    }

    switch (action) {
      case "bulk-suspend-users":
        return await bulkSuspendUsers(ids, data?.reason || "Bulk suspension");
      case "bulk-activate-users":
        return await bulkActivateUsers(ids);
      case "bulk-verify-drivers":
        return await bulkVerifyDrivers(ids);
      case "bulk-send-notification":
        return await bulkSendNotification(ids, data);
      case "bulk-delete-notifications":
        return await bulkDeleteNotifications(ids);
      case "bulk-resolve-tickets":
        return await bulkResolveTickets(ids);
      default:
        return Response.json({ error: "Invalid bulk action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Bulk action error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function bulkSuspendUsers(userIds: string[], reason: string) {
  const result = await prisma.$transaction([
    prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { accountStatus: AccountStatus.SUSPENDED },
    }),
    prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        title: "Account Suspended",
        message: `Your account has been suspended. Reason: ${reason}`,
        type: "system",
      })),
    }),
    prisma.systemLog.createMany({
      data: userIds.map((userId) => ({
        action: "user_suspended",
        entityType: "user",
        entityId: userId,
        details: { reason, bulkAction: true },
      })),
    }),
  ]);

  return Response.json({
    success: true,
    message: `${userIds.length} users suspended successfully`,
    affected: result[0].count,
  });
}

async function bulkActivateUsers(userIds: string[]) {
  const result = await prisma.$transaction([
    prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { accountStatus: AccountStatus.ACTIVE },
    }),
    prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        title: "Account Activated",
        message: "Your account has been reactivated. Welcome back!",
        type: "system",
      })),
    }),
  ]);

  return Response.json({
    success: true,
    message: `${userIds.length} users activated successfully`,
    affected: result[0].count,
  });
}

async function bulkVerifyDrivers(driverIds: string[]) {
  const drivers = await prisma.driver.findMany({
    where: { id: { in: driverIds } },
    select: { id: true, userId: true },
  });

  const result = await prisma.$transaction([
    prisma.driver.updateMany({
      where: { id: { in: driverIds } },
      data: { isVerified: true },
    }),
    prisma.notification.createMany({
      data: drivers.map((driver: any) => ({
        userId: driver.userId,
        title: "Driver Verification Approved",
        message: "Congratulations! Your driver profile has been verified. You can now start accepting rides.",
        type: "system",
      })),
    }),
    prisma.systemLog.createMany({
      data: driverIds.map((driverId) => ({
        action: "driver_verified",
        entityType: "driver",
        entityId: driverId,
        details: { bulkAction: true },
      })),
    }),
  ]);

  return Response.json({
    success: true,
    message: `${driverIds.length} drivers verified successfully`,
    affected: result[0].count,
  });
}

async function bulkSendNotification(userIds: string[], data: any) {
  const { title, message, type = "system" } = data;

  const result = await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title,
      message,
      type,
    })),
  });

  return Response.json({
    success: true,
    message: `Notification sent to ${userIds.length} users`,
    affected: result.count,
  });
}

async function bulkDeleteNotifications(notificationIds: string[]) {
  const result = await prisma.notification.deleteMany({
    where: { id: { in: notificationIds } },
  });

  return Response.json({
    success: true,
    message: `${notificationIds.length} notifications deleted`,
    affected: result.count,
  });
}

async function bulkResolveTickets(ticketIds: string[]) {
  const tickets = await prisma.supportTicket.findMany({
    where: { id: { in: ticketIds } },
    select: { id: true, userId: true, subject: true },
  });

  const result = await prisma.$transaction([
    prisma.supportTicket.updateMany({
      where: { id: { in: ticketIds } },
      data: {
        status: "resolved",
        resolvedAt: new Date(),
        updatedAt: new Date(),
      },
    }),
    prisma.notification.createMany({
      data: tickets.map((ticket: any) => ({
        userId: ticket.userId,
        title: "Support Ticket Resolved",
        message: `Your support ticket "${ticket.subject}" has been resolved.`,
        type: "system",
      })),
    }),
  ]);

  return Response.json({
    success: true,
    message: `${ticketIds.length} tickets resolved successfully`,
    affected: result[0].count,
  });
}
