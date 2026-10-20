package com.pause.app.data.media

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import androidx.exifinterface.media.ExifInterface
import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.repository.PhotoProcessor
import com.pause.app.domain.repository.ProcessedPhoto
import com.pause.app.domain.repository.RawPhoto
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream

/**
 * Client-side compression pipeline (T-02.11, docs/03-References/storage-strategy.md):
 * downscale to 2048 px, JPEG q82, plus a 480 px thumbnail at q70.
 *
 * Runs entirely on the device to save Supabase egress/CPU and to keep the 256 MB
 * drawer quota realistic.
 */
class AndroidPhotoProcessor(
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : PhotoProcessor {

    override suspend fun process(raw: RawPhoto): Result<ProcessedPhoto> = withContext(ioDispatcher) {
        try {
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeByteArray(raw.bytes, 0, raw.bytes.size, bounds)

            if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
                return@withContext Result.failure(DrawerFailure.UnsupportedFormat)
            }

            val options = BitmapFactory.Options().apply {
                inSampleSize = sampleSizeFor(bounds.outWidth, bounds.outHeight, MAX_EDGE_PX)
            }
            val decoded = BitmapFactory.decodeByteArray(raw.bytes, 0, raw.bytes.size, options)
                ?: return@withContext Result.failure(DrawerFailure.UnsupportedFormat)

            val oriented = applyExifRotation(raw.bytes, decoded)
            val scaled = scaleDown(oriented, MAX_EDGE_PX)
            if (scaled !== oriented) oriented.recycle()

            val originalBytes = compress(scaled, ORIGINAL_QUALITY)
                ?: return@withContext Result.failure(DrawerFailure.UnsupportedFormat)

            val thumbnailSource = scaleDown(scaled, THUMBNAIL_EDGE_PX)
            val thumbnailBytes = compress(thumbnailSource, THUMBNAIL_QUALITY)
            if (thumbnailSource !== scaled) thumbnailSource.recycle()

            val width = scaled.width
            val height = scaled.height
            scaled.recycle()

            if (originalBytes.isEmpty() || thumbnailBytes == null) {
                return@withContext Result.failure(DrawerFailure.UnsupportedFormat)
            }

            Result.success(
                ProcessedPhoto(
                    original = originalBytes,
                    thumbnail = thumbnailBytes,
                    mimeType = OUTPUT_MIME_TYPE,
                    width = width,
                    height = height,
                    takenAt = raw.takenAt,
                ),
            )
        } catch (error: OutOfMemoryError) {
            Result.failure(DrawerFailure.PhotoTooLarge(raw.bytes.size.toLong(), MAX_EDGE_PX.toLong()))
        } catch (error: Exception) {
            Result.failure(DrawerFailure.UnsupportedFormat)
        }
    }

    private fun compress(bitmap: Bitmap, quality: Int): ByteArray? {
        val output = ByteArrayOutputStream()
        if (!bitmap.compress(Bitmap.CompressFormat.JPEG, quality, output)) return null
        return output.toByteArray()
    }

    private fun scaleDown(bitmap: Bitmap, maxEdgePx: Int): Bitmap {
        val largest = maxOf(bitmap.width, bitmap.height)
        if (largest <= maxEdgePx) return bitmap
        val ratio = maxEdgePx.toFloat() / largest.toFloat()
        return Bitmap.createScaledBitmap(
            bitmap,
            (bitmap.width * ratio).toInt().coerceAtLeast(1),
            (bitmap.height * ratio).toInt().coerceAtLeast(1),
            true,
        )
    }

    private fun sampleSizeFor(width: Int, height: Int, maxEdgePx: Int): Int {
        var sample = 1
        var largest = maxOf(width, height)
        while (largest / 2 >= maxEdgePx) {
            largest /= 2
            sample *= 2
        }
        return sample
    }

    private fun applyExifRotation(bytes: ByteArray, bitmap: Bitmap): Bitmap {
        val orientation = runCatching {
            ExifInterface(ByteArrayInputStream(bytes))
                .getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
        }.getOrDefault(ExifInterface.ORIENTATION_NORMAL)

        val matrix = Matrix()
        when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
            ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
            ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
            ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
            else -> return bitmap
        }
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }

    private companion object {
        const val MAX_EDGE_PX = 2048
        const val THUMBNAIL_EDGE_PX = 480
        const val ORIGINAL_QUALITY = 82
        const val THUMBNAIL_QUALITY = 70
        const val OUTPUT_MIME_TYPE = "image/jpeg"
    }
}
