package com.pause.app.data.repository

import com.pause.app.data.local.PhotoDao
import com.pause.app.data.local.toDomain
import com.pause.app.data.local.toEntity
import com.pause.app.data.mapper.toDomain
import com.pause.app.data.mapper.toDrawerFailure
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
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import kotlin.time.Duration.Companion.seconds

/**
 * FR-02.5 / FR-02.6 – Storage uploads + PostgREST photos, with an in-memory
 * signed-URL cache (private buckets, 1 hour TTL). See T-02.07 / T-02.12.
 */
class PhotoRepositoryImpl(
    private val client: SupabaseClient,
    private val photoDao: PhotoDao,
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
                    photoDao.deleteByDrawer(drawerId)
                    photoDao.upsertAll(page.map(Photo::toEntity))
                }
                page
            } catch (error: Exception) {
                // Offline fallback (T-02.10): cached snapshot with local pagination.
                val cached = photoDao.getByDrawer(drawerId).map { it.toDomain() }
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

    override suspend fun uploadPhoto(
        drawerId: String,
        processed: ProcessedPhoto,
    ): Photo = withContext(ioDispatcher) {
        call {
            val uploaderId = client.auth.currentSessionOrNull()?.user?.id
                ?: throw DrawerFailure.NotSignedIn

            val photoId = UUID.randomUUID().toString()
            val originalPath = "$drawerId/$photoId.jpg"
            val thumbnailPath = "$drawerId/${photoId}_thumb.jpg"

            client.storage.from(PHOTOS_BUCKET).upload(originalPath, processed.original, true)
            client.storage.from(THUMBNAILS_BUCKET).upload(thumbnailPath, processed.thumbnail, true)

            val inserted = client.from(TABLE)
                .insert(
                    PhotoInsertDto(
                        drawerId = drawerId,
                        uploadedBy = uploaderId,
                        originalUrl = originalPath,
                        thumbnailUrl = thumbnailPath,
                        fileSizeBytes = processed.original.size.toLong(),
                        mimeType = processed.mimeType,
                        width = processed.width,
                        height = processed.height,
                        takenAt = processed.takenAt?.toString(),
                    ),
                )
                .decodeSingle<PhotoDto>()
                .toDomain()
            photoDao.upsertAll(listOf(inserted.toEntity()))
            inserted
        }
    }

    override suspend fun deletePhoto(photo: Photo): Unit = withContext(ioDispatcher) {
        call {
            // Row first (quota is released by a DB trigger), then best-effort objects.
            client.from(TABLE).delete { filter { eq("id", photo.id) } }
            photoDao.deleteById(photo.id)
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

    override suspend fun signedPhotoUrls(photos: List<Photo>): List<PhotoUrls> =
        withContext(ioDispatcher) {
            photos.map { photo ->
                PhotoUrls(
                    photoId = photo.id,
                    thumbnailUrl = photo.thumbnailPath?.let {
                        signedUrl(THUMBNAILS_BUCKET, it)
                    },
                    originalUrl = signedUrl(PHOTOS_BUCKET, photo.originalPath),
                )
            }
        }

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
        const val TABLE = "photos"
        const val PHOTOS_BUCKET = "photos"
        const val THUMBNAILS_BUCKET = "thumbnails"
        const val SIGNED_URL_TTL = 3600L
        const val SIGNED_URL_CACHE_WINDOW_MILLIS = 55 * 60 * 1000L
    }
}
