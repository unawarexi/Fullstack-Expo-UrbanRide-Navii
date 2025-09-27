import { authMiddleware } from "@/middleware/jwt.middleware";
import { Router } from "express";
import {
    activateUser,
    assignSupportTicket,
    createPromoCode,
    getAdminDashboard,
    getDrivers,
    getRides,
    getSupportTickets,
    getUsers,
    resolveSupportTicket,
    sendBulkNotification,
    suspendUser,
    updateAppSetting,
    updatePromoCode,
    verifyDriver,
} from "../controllers/admin.controller";

const router = Router();

router.use(authMiddleware);

// Dashboard stats
router.get("/dashboard", getAdminDashboard);

// Users
router.get("/users", getUsers);

// Drivers
router.get("/drivers", getDrivers);

// Rides
router.get("/rides", getRides);

// Support tickets
router.get("/support-tickets", getSupportTickets);

// Promo codes
router.post("/promo", createPromoCode);
router.put("/promo/:id", updatePromoCode);

// Support ticket actions
router.patch("/ticket/:ticketId/assign", assignSupportTicket);
router.patch("/ticket/:ticketId/resolve", resolveSupportTicket);

// App settings
router.put("/settings", updateAppSetting);

// Notifications
router.post("/notifications", sendBulkNotification);

// Admin actions
router.patch("/driver/:driverId/verify", verifyDriver);
router.patch("/user/:userId/suspend", suspendUser);
router.patch("/user/:userId/activate", activateUser);

export default router;
