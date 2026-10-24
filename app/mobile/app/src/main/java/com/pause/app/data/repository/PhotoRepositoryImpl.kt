package com.pause.app.data.repository

import com.pause.app.data.local.PhotoDao
import com.pause.app.data.local.toDomain
import com.pause.app.data.local.toEntity
import com.pause.app.data.mapper.toDomain
import com.pause.app.data.mapper.toDrawerFailure
import com.pause.app.data.remote.CloudinaryUploader
import com.pause.app.data.remote.dto.IdDto
import com.pause.app.data.remote.dto.PhotoDto
import com.pause.app.data.remote.dto.PhotoInsertDto
import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.model.Photo
import com.pause.app.domain.repository.PhotoRepository
import com.pause.app.domain.repository.PhotoUrls
import com.pause.app.domain.repository.ProcessedPhoto
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import android.util.Log
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import kotlin.time.Duration.Companion.seconds

/**
 * FR-02.5 / FR-02.6 – Photo repository with **Cloudinary upload** (hybrid
 * architecture: Cloudinary for storage + CDN, Supabase for DB + RLS).
 *
 * New photos are uploaded to Cloudinary via unsigned upload preset; the
 * returned `secure_url` is stored in `original_url` / `thumbnail_url` columns.
 * Thumbnail URLs are derived from the original using Cloudinary transformations
 * (no separate upload needed → faster, less bandwidth).
 *
 * Legacy photos that were uploaded to Supabase Storage (object paths like
 * `{drawerId}/{photoId}.jpg`) are still supported via signed URL resolution.
 */
class PhotoRepositoryImpl(
    private val client: SupabaseClient,
    private val photoDao: PhotoDao,
    private val cloudinaryUploader: CloudinaryUploader,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
    private val clock: () -> Long = System::currentTimeMillis,
) : PhotoRepository {

    private data class CachedUrl(val url: String, val expiresAtMillis: Long)

    private val signedUrlCache = ConcurrentHashMap<String, CachedUrl>()

    override suspend fun getPhotos(drawerId: String, offset: Int, limit: Int): List<Photo> =
        withContext(ioDispatcher) {
            try {
                val page = client.from(TABLE)
                    .select {
                        filter { eq("drawer_id", drawerId) }
                        order("uploaded_at", Order.DESCENDING)
                        range(offset.toLong(), (offset + limit - 1).toLong())
                    }
                    .decodeList<PhotoDto>()
                    .map { it.toDomain() }
                if (offset == 0) {
                    val userId = client.auth.currentSessionOrNull()?.user?.id
                    if (userId != null) {
                        photoDao.deleteByDrawer(userId, drawerId)
                        photoDao.upsertAll(page.map { it.toEntity(userId) })
                    }
                }
                page
            } catch (error: Exception) {
                // Offline fallback (T-02.10): cached snapshot with local pagination.
                val userId = client.auth.currentSessionOrNull()?.user?.id
                val cached = userId?.let { id -> photoDao.getByDrawer(id, drawerId) }
                    .orEmpty()
                    .map { it.toDomain() }
                if (cached.isEmpty()) throw error.toDrawerFailure() else cached.drop(offset).take(limit)
            }
        }

    override suspend fun photoCount(drawerId: String): Int = withContext(ioDispatcher) {
        call {
            client.from(TABLE)
                .select { filter { eq("drawer_id", drawerId) } }
                .decodeList<IdDto>()
                .size
        }
    }

    /**
     * Upload a photo to **Cloudinary** and insert metadata into Supabase DB.
     *
     * 1. Upload the original to Cloudinary → get `secure_url`.
     * 2. Derive a thumbnail URL using Cloudinary transformation (no separate upload).
     * 3. Insert a row in the `photos` table with the Cloudinary URLs.
     *
     * The thumbnail is **not** uploaded separately — Cloudinary generates it
     * on-the-fly from the original via URL transformation (`w_480,q_70,c_limit,f_auto`).
     */
    override suspend fun uploadPhoto(
        drawerId: String,
        processed: ProcessedPhoto,
    ): Photo = withContext(ioDispatcher) {
        call {
            val uploaderId = client.auth.currentSessionOrNull()?.user?.id
                ?: throw DrawerFailure.NotSignedIn

            val photoId = UUID.randomUUID().toString()
            val folder = "$CLOUDINARY_FOLDER/$drawerId"

            Log.d(TAG, "uploadPhoto: drawerId=$drawerId, photoId=$photoId, " +
                "originalSize=${processed.original.size}")

            // 1. Upload original to Cloudinary
            val result = try {
                cloudinaryUploader.upload(
                    bytes = processed.original,
                    folder = folder,
                    publicId = photoId,
                    mimeType = processed.mimeType,
                )
            } catch (e: Exception) {
                Log.e(TAG, "uploadPhoto: Cloudinary upload FAILED", e)
                throw e
            }

            Log.d(TAG, "uploadPhoto: Cloudinary OK → ${result.secureUrl}")

            // 2. Derive thumbnail URL via Cloudinary transformation (no upload needed)
            val thumbnailUrl = CloudinaryUploader.thumbnailUrl(result.secureUrl)

            // 3. Insert metadata into Supabase DB
            val inserted = client.from(TABLE)
                .insert(
                    PhotoInsertDto(
                        drawerId = drawerId,
                        uploadedBy = uploaderId,
                        originalUrl = result.secureUrl,
                        thumbnailUrl = thumbnailUrl,
                        fileSizeBytes = processed.original.size.toLong(),
                        mimeType = processed.mimeType,
                        width = processed.width,
                        height = processed.height,
                        takenAt = processed.takenAt?.toString(),
                    ),
                )
                .decodeSingle<PhotoDto>()
                .toDomain()
            Log.d(TAG, "uploadPhoto: DB row inserted, id=${inserted.id}")
            photoDao.upsertAll(listOf(inserted.toEntity(uploaderId)))
            inserted
        }
    }

    override suspend fun deletePhoto(photo: Photo): Unit = withContext(ioDispatcher) {
        call {
            // Row first (quota is released by a DB trigger), then best-effort storage cleanup.
            client.from(TABLE).delete { filter { eq("id", photo.id) } }
            client.auth.currentSessionOrNull()?.user?.id?.let { userId ->
                photoDao.deleteById(userId, photo.id)
            }

            if (CloudinaryUploader.isCloudinaryUrl(photo.originalPath)) {
                // Cloudinary photos: no server-side deletion from client (would require
                // API secret). Orphan cleanup can be done via Cloudinary admin API or
                // a Supabase Edge Function if needed.
                Log.d(TAG, "deletePhoto: Cloudinary photo ${photo.id} — DB row deleted, " +
                    "Cloudinary object retained (admin cleanup)")
            } else {
                // Legacy Supabase Storage photos: delete objects from buckets.
                runCatching {
                    client.storage.from(PHOTOS_BUCKET).delete(listOf(photo.originalPath))
                    photo.thumbnailPath?.let { path ->
                        client.storage.from(THUMBNAILS_BUCKET).delete(listOf(path))
                    }
                }
                signedUrlCache.remove(cacheKey(PHOTOS_BUCKET, photo.originalPath))
                photo.thumbnailPath?.let { signedUrlCache.remove(cacheKey(THUMBNAILS_BUCKET, it)) }
            }
        }
    }

    /**
     * Resolve displayable URLs for a list of photos.
     *
     * - **Cloudinary photos**: URLs are already public/CDN — return as-is.
     * - **Legacy Supabase photos**: Generate short-lived signed URLs (private buckets).
     */
    override suspend fun signedPhotoUrls(photos: List<Photo>): List<PhotoUrls> =
        withContext(ioDispatcher) {
            photos.map { photo ->
                if (CloudinaryUploader.isCloudinaryUrl(photo.originalPath)) {
                    // Cloudinary URLs are directly usable
                    PhotoUrls(
                        photoId = photo.id,
                        thumbnailUrl = photo.thumbnailPath ?: CloudinaryUploader.thumbnailUrl(photo.originalPath),
                        originalUrl = photo.originalPath,
                    )
                } else {
                    // Legacy Supabase Storage: signed URLs
                    PhotoUrls(
                        photoId = photo.id,
                        thumbnailUrl = photo.thumbnailPath?.let {
                            signedUrl(THUMBNAILS_BUCKET, it)
                        },
                        originalUrl = signedUrl(PHOTOS_BUCKET, photo.originalPath),
                    )
                }
            }
        }

    // ── Supabase signed-URL helpers (legacy photos only) ────────────────────

    private suspend fun signedUrl(bucket: String, path: String): String? {
        val key = cacheKey(bucket, path)
        val now = clock()
        signedUrlCache[key]?.let { cached ->
            if (cached.expiresAtMillis > now) return cached.url
        }

        val url = runCatching {
            client.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL.seconds)
        }.getOrNull() ?: return null

        signedUrlCache[key] = CachedUrl(url, now + SIGNED_URL_CACHE_WINDOW_MILLIS)
        return url
    }

    private fun cacheKey(bucket: String, path: String): String = "$bucket:$path"

    private suspend inline fun <T> call(block: () -> T): T = try {
        block()
    } catch (error: Exception) {
        throw error.toDrawerFailure()
    }

    private companion object {
        const val TAG = "PhotoRepositoryImpl"
        const val TABLE = "photos"
        const val PHOTOS_BUCKET = "photos"
        const val THUMBNAILS_BUCKET = "thumbnails"
        const val SIGNED_URL_TTL = 3600L
        const val SIGNED_URL_CACHE_WINDOW_MILLIS = 55 * 60 * 1000L
        const val CLOUDINARY_FOLDER = "pause/photos"
    }
}
