import { authMiddleware } from "@/middleware/jwt.middleware";
import { Router } from "express";
import {
    addVehicle,
    deleteVehicleController,
    GET_NEARBY_DRIVERS,
    getDriver,
    registerDriver,
    suspendDriver,
    toggleOnlineStatus,
    updateDriverProfile,
    updateLocation,
    updateVehicleController,
    verifyDriver,
    verifyVehicle,
} from "../controllers/driver.controller";
import { multerErrorHandler, upload } from "../services/cloduinary";

const router = Router();

router.use(authMiddleware);

// Register driver profile
router.post("/", registerDriver);

// Add vehicle (with image upload)
router.post("/vehicle", upload.array("imageUrls", 6), multerErrorHandler, addVehicle);

// Update driver profile (with optional profile image upload)
router.put("/:driverId", upload.single("profileImageUrl"), multerErrorHandler, updateDriverProfile);

// Update driver location
router.put("/:driverId/location", updateLocation);

// Toggle online status
router.put("/:driverId/online", toggleOnlineStatus);

// Get driver info
router.get("/", getDriver);

// Verify driver (admin)
router.patch("/:driverId/verify", verifyDriver);

// Update vehicle (with optional image upload)
router.put("/vehicle/:vehicleId", upload.array("imageUrls", 6), multerErrorHandler, updateVehicleController);

// Verify vehicle (admin)
router.patch("/vehicle/:vehicleId/verify", verifyVehicle);

// Delete vehicle
router.delete("/vehicle/:vehicleId", deleteVehicleController);

// Suspend driver (admin)
router.delete("/:driverId/suspend", suspendDriver);

// Get nearby drivers
router.get("/nearby", (req, res) => {
  // @ts-ignore
  GET_NEARBY_DRIVERS(req).then((response: any) => {
    res.status(response.status || 200).json(response.body || response);
  });
});

export default router;
