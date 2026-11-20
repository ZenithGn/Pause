package com.pause.app.data.remote

import android.util.Log
import io.ktor.client.HttpClient
import io.ktor.client.request.forms.formData
import io.ktor.client.request.forms.submitFormWithBinaryData
import io.ktor.client.statement.bodyAsText
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.isSuccess
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import kotlinx.serialization.json.int

/**
 * Uploads images to Cloudinary via the unsigned Upload API.
 *
 * Uses the existing Ktor HTTP client — no extra SDK required.
 * All uploads go to a dedicated folder (`pause/photos/{drawerId}`) so they
 * are organised and easy to manage in the Cloudinary console.
 *
 * @param cloudName     Cloudinary cloud name (from Dashboard).
 * @param uploadPreset  An **unsigned** upload preset configured in Cloudinary settings.
 * @param httpClient    Shared Ktor HTTP client (reuses the one provisioned for Supabase).
 */
class CloudinaryUploader(
    private val cloudName: String,
    private val uploadPreset: String,
    private val httpClient: HttpClient,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) {

    /**
     * Upload raw bytes to Cloudinary.
     *
     * @param bytes      JPEG/PNG/WebP payload.
     * @param folder     Cloudinary folder path, e.g. `"pause/photos/{drawerId}"`.
     * @param publicId   Desired public_id (without extension). Cloudinary will
     *                   append a unique suffix if `unique_filename` is true (default).
     * @param mimeType   MIME type of the payload (e.g. `"image/jpeg"`).
     * @return [CloudinaryUploadResult] on success.
     * @throws CloudinaryUploadException on HTTP or parsing failure.
     */
    suspend fun upload(
        bytes: ByteArray,
        folder: String,
        publicId: String? = null,
        mimeType: String = "image/jpeg",
    ): CloudinaryUploadResult = withContext(ioDispatcher) {
        val url = "$BASE_URL/$cloudName/image/upload"

        Log.d(TAG, "upload: folder=$folder, publicId=$publicId, size=${bytes.size}, mime=$mimeType")

        val response = httpClient.submitFormWithBinaryData(
            url = url,
            formData = formData {
                append("upload_preset", uploadPreset)
                append("folder", folder)
                if (publicId != null) {
                    append("public_id", publicId)
                }
                append("file", bytes, Headers.build {
                    append(HttpHeaders.ContentType, mimeType)
                    append(HttpHeaders.ContentDisposition, "filename=\"photo.jpg\"")
                })
            },
        )

        if (!response.status.isSuccess()) {
            val body = response.bodyAsText()
            Log.e(TAG, "upload FAILED: status=${response.status}, body=$body")
            throw CloudinaryUploadException(
                "Cloudinary upload failed with status ${response.status.value}: $body",
            )
        }

        val body = response.bodyAsText()
        Log.d(TAG, "upload OK: ${body.take(200)}")

        parseUploadResponse(body)
    }

    private fun parseUploadResponse(body: String): CloudinaryUploadResult {
        val json = Json { ignoreUnknownKeys = true }
        val obj = json.parseToJsonElement(body).jsonObject
        return CloudinaryUploadResult(
            publicId = obj["public_id"]?.jsonPrimitive?.content
                ?: throw CloudinaryUploadException("Missing public_id in response"),
            secureUrl = obj["secure_url"]?.jsonPrimitive?.content
                ?: throw CloudinaryUploadException("Missing secure_url in response"),
            bytes = obj["bytes"]?.jsonPrimitive?.long ?: 0L,
            width = obj["width"]?.jsonPrimitive?.int ?: 0,
            height = obj["height"]?.jsonPrimitive?.int ?: 0,
        )
    }

    companion object {
        private const val TAG = "CloudinaryUploader"
        private const val BASE_URL = "https://api.cloudinary.com/v1_1"

        /**
         * Build a Cloudinary transformation URL for a thumbnail.
         *
         * Inserts `/w_{width},q_{quality},c_limit,f_auto/` before the
         * version segment of the original `secure_url`.
         *
         * Example:
         * ```
         * original:  https://res.cloudinary.com/demo/image/upload/v1/pause/photos/abc/photo.jpg
         * thumbnail: https://res.cloudinary.com/demo/image/upload/w_480,q_70,c_limit,f_auto/v1/pause/photos/abc/photo.jpg
         * ```
         */
        fun thumbnailUrl(
            originalSecureUrl: String,
            width: Int = 480,
            quality: Int = 70,
        ): String {
            val marker = "/image/upload/"
            val idx = originalSecureUrl.indexOf(marker)
            if (idx < 0) return originalSecureUrl
            val insertAt = idx + marker.length
            val transform = "w_$width,q_$quality,c_limit,f_auto/"
            return originalSecureUrl.substring(0, insertAt) + transform + originalSecureUrl.substring(insertAt)
        }

        /**
         * Check if a URL is a Cloudinary URL (vs. a Supabase Storage object path).
         */
        fun isCloudinaryUrl(url: String): Boolean =
            url.startsWith("https://res.cloudinary.com/")
    }
}

class CloudinaryUploadException(message: String) : Exception(message)
