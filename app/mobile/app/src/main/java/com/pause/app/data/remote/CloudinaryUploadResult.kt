package com.pause.app.data.remote

/**
 * Result of a successful Cloudinary unsigned upload.
 *
 * @property publicId  Cloudinary public_id (used for destroy / transform).
 * @property secureUrl HTTPS URL for the original upload.
 * @property bytes     Uploaded file size in bytes (after server processing).
 * @property width     Image width in pixels.
 * @property height    Image height in pixels.
 */
data class CloudinaryUploadResult(
    val publicId: String,
    val secureUrl: String,
    val bytes: Long,
    val width: Int,
    val height: Int,
)
