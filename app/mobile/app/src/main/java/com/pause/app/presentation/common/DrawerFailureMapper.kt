package com.pause.app.presentation.common

import com.pause.app.R
import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.model.DrawerField
import com.pause.app.domain.model.DrawerValidationError

/** Maps drawer failures / validation errors to localized strings (FR-02). */
object DrawerFailureMapper {

    fun toUiText(failure: DrawerFailure): UiText = when (failure) {
        is DrawerFailure.InvalidInput ->
            failure.errors.values.firstOrNull()?.let(::validationText)
                ?: UiText.Resource(R.string.error_unknown)

        DrawerFailure.NotFound -> UiText.Resource(R.string.error_drawer_not_found)
        DrawerFailure.NotOwner -> UiText.Resource(R.string.error_drawer_not_owner)
        DrawerFailure.ReadOnly -> UiText.Resource(R.string.error_drawer_read_only)
        DrawerFailure.NotSignedIn -> UiText.Resource(R.string.error_session_expired)
        is DrawerFailure.DrawerQuotaReached ->
            UiText.Resource(R.string.error_drawer_quota_reached, listOf(failure.maxDrawers))

        is DrawerFailure.StorageFull -> UiText.Resource(R.string.error_drawer_storage_full)
        DrawerFailure.UnsupportedFormat -> UiText.Resource(R.string.error_photo_format)
        is DrawerFailure.PhotoTooLarge -> UiText.Resource(R.string.error_photo_too_large)
        DrawerFailure.NetworkUnavailable -> UiText.Resource(R.string.error_network)
        is DrawerFailure.Unknown -> UiText.Resource(R.string.error_unknown)
    }

    fun fieldError(failure: DrawerFailure, field: DrawerField): UiText? =
        (failure as? DrawerFailure.InvalidInput)?.errors?.get(field)?.let(::validationText)

    fun validationText(error: DrawerValidationError): UiText = when (error) {
        DrawerValidationError.NAME_REQUIRED -> UiText.Resource(R.string.error_drawer_name_required)
        DrawerValidationError.NAME_TOO_LONG -> UiText.Resource(R.string.error_drawer_name_too_long)
        DrawerValidationError.DESCRIPTION_TOO_LONG -> UiText.Resource(R.string.error_drawer_description_too_long)
        DrawerValidationError.EMAIL_REQUIRED -> UiText.Resource(R.string.error_email_required)
        DrawerValidationError.EMAIL_INVALID -> UiText.Resource(R.string.error_email_invalid)
        DrawerValidationError.SHARE_WITH_SELF -> UiText.Resource(R.string.error_share_with_self)
        DrawerValidationError.RECIPIENT_NOT_FOUND -> UiText.Resource(R.string.error_share_recipient_not_found)
    }
}

/** "1.2 MB / 256 MB" formatting shared by the storage indicators. */
object StorageFormat {

    fun bytes(bytes: Long): String {
        if (bytes <= 0) return "0 MB"
        val megabytes = bytes / (1024.0 * 1024.0)
        return if (megabytes >= 100) {
            "%.0f MB".format(megabytes)
        } else {
            "%.1f MB".format(megabytes)
        }
    }
}
