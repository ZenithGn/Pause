package com.pause.app.data.media

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import com.pause.app.domain.model.CAPTION_BOTTOM_OFFSET_PX
import com.pause.app.domain.model.CAPTION_FONT_SIZE_PX
import com.pause.app.domain.model.PhotoboothRenderer
import com.pause.app.domain.model.PhotoboothTemplate
import com.pause.app.domain.model.captionColorHex
import com.pause.app.domain.model.effectiveLayout
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.net.URL

/**
 * FR-03.2 / T-03.17 – renders template `layout_config` + selected photos into a
 * single JPEG (center-cropped per slot, captions baked in, optional frame).
 */
class AndroidPhotoboothRenderer(
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : PhotoboothRenderer {

    override suspend fun render(
        template: PhotoboothTemplate,
        photoUrls: List<String>,
        caption: String?,
    ): Result<ByteArray> = withContext(ioDispatcher) {
        try {
            val layout = template.effectiveLayout
            val canvasBitmap = Bitmap.createBitmap(layout.width, layout.height, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(canvasBitmap)
            canvas.drawColor(parseColor(layout.backgroundColor, Color.WHITE))

            layout.slots.forEachIndexed { position, slot ->
                val url = photoUrls.getOrNull(position) ?: return@forEachIndexed
                val photo = runCatching { BitmapFactory.decodeStream(URL(url).openStream()) }.getOrNull()
                    ?: return@forEachIndexed
                canvas.drawBitmap(
                    cropToFill(photo, slot.width, slot.height),
                    null,
                    RectF(slot.x.toFloat(), slot.y.toFloat(),
                        (slot.x + slot.width).toFloat(), (slot.y + slot.height).toFloat()),
                    Paint(Paint.ANTI_ALIAS_FLAG),
                )
                photo.recycle()
            }

            layout.frameUrl?.let { frameUrl ->
                runCatching { BitmapFactory.decodeStream(URL(frameUrl).openStream()) }.getOrNull()?.let { frame ->
                    canvas.drawBitmap(
                        frame,
                        null,
                        RectF(0f, 0f, layout.width.toFloat(), layout.height.toFloat()),
                        Paint(Paint.ANTI_ALIAS_FLAG),
                    )
                    frame.recycle()
                }
            }

            val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                textAlign = Paint.Align.CENTER
            }
            layout.texts.forEach { text ->
                textPaint.color = parseColor(text.color, Color.BLACK)
                textPaint.textSize = text.fontSize.toFloat()
                canvas.drawText(text.content, text.x.toFloat(), text.y.toFloat(), textPaint)
            }

            // Edit Template screen caption (user editable, layout itself is fixed).
            if (!caption.isNullOrBlank()) {
                textPaint.color = parseColor(layout.captionColorHex, Color.BLACK)
                textPaint.textSize = CAPTION_FONT_SIZE_PX
                canvas.drawText(caption.take(40), layout.width / 2f, layout.height - CAPTION_BOTTOM_OFFSET_PX, textPaint)
            }

            val output = ByteArrayOutputStream()
            canvasBitmap.compress(Bitmap.CompressFormat.JPEG, 85, output)
            canvasBitmap.recycle()
            Result.success(output.toByteArray())
        } catch (error: Exception) {
            Result.failure(error)
        }
    }

    private fun cropToFill(source: Bitmap, targetWidth: Int, targetHeight: Int): Bitmap {
        val scale = maxOf(targetWidth.toFloat() / source.width, targetHeight.toFloat() / source.height)
        val scaledWidth = (source.width * scale).toInt().coerceAtLeast(targetWidth)
        val scaledHeight = (source.height * scale).toInt().coerceAtLeast(targetHeight)
        val scaled = Bitmap.createScaledBitmap(source, scaledWidth, scaledHeight, true)
        val left = (scaledWidth - targetWidth) / 2
        val top = (scaledHeight - targetHeight) / 2
        return Bitmap.createBitmap(scaled, left, top, targetWidth, targetHeight)
    }

    private fun parseColor(value: String, fallback: Int): Int = runCatching {
        Color.parseColor(value)
    }.getOrDefault(fallback)
}
