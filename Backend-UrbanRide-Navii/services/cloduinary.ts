import { allowedExtensions, extensionToMimeType } from "@/core/utils/extensions";
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from "cloudinary";
import * as dotenv from "dotenv";
import { NextFunction, Request, Response } from "express";
import multer, { FileFilterCallback } from "multer";
import path from "path";

dotenv.config();

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Configure multer for memory storage (no local files)
const storage = multer.memoryStorage();

// Enhanced file filter for all media types
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const allAllowedExtensions = Object.values(allowedExtensions).flat();
  const allowedMimeTypes = Object.values(extensionToMimeType);

  // Check if extension is valid
  const isExtensionValid = allAllowedExtensions.includes(fileExtension);

  if (!isExtensionValid) {
    cb(new Error(`Invalid file extension: ${fileExtension}. Please upload a supported file type.`));
    return;
  }

  // Check MIME type with fallback for application/octet-stream
  const isMimeTypeValid = allowedMimeTypes.includes(file.mimetype);
  const isGenericMimeType = file.mimetype === "application/octet-stream";
  const expectedMimeType = extensionToMimeType[fileExtension as keyof typeof extensionToMimeType];

  if (isMimeTypeValid || (isGenericMimeType && expectedMimeType)) {
    // Correct MIME type if it's generic but valid extension
    if (isGenericMimeType && expectedMimeType) {
      file.mimetype = expectedMimeType;
    }
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Received: ${file.mimetype} (${fileExtension}). Expected: ${expectedMimeType || "valid file MIME type"}.`));
  }
};

// Initialize multer upload with memory storage
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
});

// Multer error handler middleware
export function multerErrorHandler(err: any, req: Request, res: Response, next: NextFunction): Response | void {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        status: "error",
        message: "File too large. Maximum size is 20MB.",
      });
    }
    return res.status(400).json({
      status: "error",
      message: err.message,
    });
  } else if (err) {
    return res.status(400).json({
      status: "error",
      message: err.message,
    });
  }
  next();
}

// Determine resource type based on file ext
const getResourceType = (filename: string): string => {
  const ext = filename.toLowerCase().split(".").pop();

  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg", "ico", "heic", "heif"];
  const videoExts = ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv", "m4v", "3gp", "ogv"];
  const audioExts = ["mp3", "wav", "flac", "aac", "ogg", "wma", "m4a", "opus", "aiff"];

  if (imageExts.includes(ext!)) return "image";
  if (videoExts.includes(ext!)) return "video";
  if (audioExts.includes(ext!)) return "video"; // Cloudinary treats audio as video resource type
  return "raw"; // For documents and other files
};

// interface for upload result
interface CloudinaryUploadResult {
  url: string;
  public_id: string;
  resource_type: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
  original_filename?: string;
  created_at: string;
  type: string;
  filename: string;
}

// Upload file buffer directly to Cloudinary
export const uploadToCloudinary = async (fileBuffer: Buffer, originalName: string, folder: string = "/projects/Navii"): Promise<CloudinaryUploadResult> => {
  try {
    const resourceType = getResourceType(originalName);
    const fileExtension = originalName.split(".").pop();
    const fileName = originalName.split(".").slice(0, -1).join(".");

    console.log("Upload parameters:", {
      originalName,
      folder,
      resourceType,
      fileExtension,
      fileName,
    });

    const uploadOptions: any = {
      folder: "projects/Navii", // This should be "projects/workspace"
      resource_type: resourceType,
      public_id: `${fileName}_${Date.now()}`,
      use_filename: true,
      unique_filename: true,
    };

    // Add transformations for images and videos
    if (resourceType === "image") {
      uploadOptions.transformation = [{ width: 1000, height: 1000, crop: "limit" }, { quality: "auto" }, { fetch_format: "auto" }];
    } else if (resourceType === "video") {
      uploadOptions.transformation = [{ quality: "auto" }, { fetch_format: "auto" }];
    }

    console.log("Cloudinary upload options:", uploadOptions);

    // Upload buffer directly to Cloudinary
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(uploadOptions, (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(error);
          } else if (result) {
            console.log("Cloudinary upload success:", {
              public_id: result.public_id,
              secure_url: result.secure_url,
              folder: result.folder,
            });
            resolve(result);
          } else {
            reject(new Error("No result returned from Cloudinary"));
          }
        })
        .end(fileBuffer);
    });

    // Validate that we got a secure_url
    if (!result.secure_url) {
      throw new Error("Cloudinary upload succeeded but no secure_url returned");
    }

    // Return comprehensive file information
    return {
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      duration: result.duration, // For video/audio files
      original_filename: result.original_filename,
      created_at: result.created_at,
      type: resourceType,
      filename: originalName,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

// Delete a file from Cloudinary
export const deleteFromCloudinary = async (publicId: string, resourceType: string = "image"): Promise<any> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    throw error;
  }
};

// Get optimized file URL with transformations
export const getOptimizedFileUrl = (publicId: string, resourceType: string = "image", transformations: any[] = []): string => {
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    ...transformations,
    secure: true,
    quality: "auto",
    fetch_format: "auto",
  });
};

// Get file metadata from Cloudinary 
export const getFileMetadata = async (publicId: string, resourceType: string = "image"): Promise<any> => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error("Error getting file metadata:", error);
    throw error;
  }
};
