package com.pause.app.data.remote

import com.pause.app.domain.model.PreviewUploader
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.auth

/**
 * Uploads rendered photobooth previews to Cloudinary under
 * `pause/photobooth/{user_id}` (see docs/03-References/storage-strategy.md).
 */
class CloudinaryPreviewUploader(
    private val client: SupabaseClient,
    private val uploader: CloudinaryUploader,
) : PreviewUploader {

    override suspend fun uploadPreview(byteArray: ByteArray): Result<String> = runCatching {
        val userId = client.auth.currentSessionOrNull()?.user?.id
            ?: error("A signed-in user is required")
        uploader.upload(
            bytes = byteArray,
            folder = "pause/photobooth/$userId",
            mimeType = "image/jpeg",
        ).secureUrl
    }
}
