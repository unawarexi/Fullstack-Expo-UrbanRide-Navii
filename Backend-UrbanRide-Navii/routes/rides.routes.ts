import { authMiddleware } from "@/middleware/jwt.middleware";
import { Router } from "express";
import {
    acceptRide,
    cancelRide,
    completeRide,
    createRide,
    GET_AVAILABLE_RIDES,
    GET_RIDE_STATS,
    GET_RIDE_TRACKING,
    getRide,
    respondToNegotiation,
    startRide,
    updateRide,
} from "../controllers/rides.controller";


const router = Router();

router.use(authMiddleware);

// Create ride
router.post("/", createRide);

// Accept ride
router.post("/accept", acceptRide);

// Start ride
router.post("/start", startRide);

// Complete ride
router.post("/complete", completeRide);

// Cancel ride
router.post("/cancel", cancelRide);

// Update ride
router.put("/", updateRide);

// Get ride(s)
router.get("/", getRide);

// Ride negotiation/patch actions
router.patch("/", respondToNegotiation);

// Get available rides for drivers
router.get("/available", (req, res) => {
  // @ts-ignore
  GET_AVAILABLE_RIDES(req).then((response: any) => {
    res.status(response.status || 200).json(response.body || response);
  });
});

// Get ride tracking
router.get("/tracking", (req, res) => {
  // @ts-ignore
  GET_RIDE_TRACKING(req).then((response: any) => {
    res.status(response.status || 200).json(response.body || response);
  });
});

// Get ride stats
router.get("/stats", (req, res) => {
  // @ts-ignore
  GET_RIDE_STATS(req).then((response: any) => {
    res.status(response.status || 200).json(response.body || response);
  });
});

export default router;
