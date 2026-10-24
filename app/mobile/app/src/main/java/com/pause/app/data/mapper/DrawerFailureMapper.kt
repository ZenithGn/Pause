package com.pause.app.data.mapper

import android.util.Log
import com.pause.app.data.remote.CloudinaryUploadException
import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.model.DrawerField
import com.pause.app.domain.model.DrawerValidationError
import io.github.jan.supabase.exceptions.RestException
import java.io.IOException

private const val TAG = "DrawerFailureMapper"

/**
 * Maps Supabase/PostgREST errors raised by the FR-02 RPCs and tables to
 * [DrawerFailure]. The SQL raises descriptive messages (see
 * `supabase/migrations/20251113090400_drawer_rpcs.sql`), which we match here.
 */
fun Throwable.toDrawerFailure(): DrawerFailure {
    if (this is DrawerFailure) return this

    // Log raw error for debugging (especially Storage upload failures)
    Log.w(TAG, "Mapping exception to DrawerFailure: ${this::class.simpleName} – $message", this)

    val text = message?.lowercase().orEmpty()

    return when {
        this is IOException -> DrawerFailure.NetworkUnavailable

        // Cloudinary upload failures
        this is CloudinaryUploadException -> DrawerFailure.Unknown("Photo upload failed. Please try again.")

        text.contains("quota reached") -> DrawerFailure.DrawerQuotaReached(3)

        text.contains("storage full") || text.contains("exceeds the 5 mb") ->
            DrawerFailure.StorageFull(0, 0)

        // Storage bucket errors (bucket missing or misconfigured)
        text.contains("bucket not found") || text.contains("bucket_not_found") ->
            DrawerFailure.Unknown("Storage bucket not found. Please contact support.")

        // Storage upload payload too large (beyond bucket file_size_limit)
        text.contains("payload too large") || text.contains("entity too large") ->
            DrawerFailure.PhotoTooLarge(0, 0)

        text.contains("no pause user with that email") -> DrawerFailure.InvalidInput(
            mapOf(DrawerField.SHARE_EMAIL to DrawerValidationError.RECIPIENT_NOT_FOUND),
        )

        text.contains("cannot share a drawer with yourself") -> DrawerFailure.InvalidInput(
            mapOf(DrawerField.SHARE_EMAIL to DrawerValidationError.SHARE_WITH_SELF),
        )

        text.contains("only the drawer owner") || text.contains("insufficient_privilege") ->
            DrawerFailure.NotOwner

        text.contains("row-level security") ||
            text.contains("policy") ||
            text.contains("permission denied") ||
            text.contains("read-only") ||
            text.contains("readonly") ||
            text.contains("new row violates") -> DrawerFailure.ReadOnly

        text.contains("drawer not found") || text.contains("no_data_found") -> DrawerFailure.NotFound

        this is RestException && statusCode == 404 -> DrawerFailure.NotFound
        this is RestException && statusCode in 401..403 -> DrawerFailure.ReadOnly

        else -> DrawerFailure.Unknown(message)
    }
}
