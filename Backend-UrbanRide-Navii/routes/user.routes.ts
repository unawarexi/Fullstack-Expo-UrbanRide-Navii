import { authMiddleware } from "@/middleware/jwt.middleware";
import { Router } from "express";
import { createUser, deleteUser, getUser, patchUser, updateUser } from "../controllers/user.controller";

const router = Router();

router.use(authMiddleware);

router.post("/", createUser);

router.put("/", updateUser);


router.get("/", getUser);

// PATCH /api/users - Partial user profile update
router.patch("/", patchUser);

// DELETE /api/users - Deactivate user account (soft delete)
router.delete("/", deleteUser);

export default router;
