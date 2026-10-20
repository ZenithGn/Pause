package com.pause.app.domain.model

/** Fields used by drawer / share forms. */
enum class DrawerField {
    NAME,
    DESCRIPTION,
    SHARE_EMAIL,
}

/** Field-level validation problems for drawers, mapped to `strings.xml` in the UI. */
enum class DrawerValidationError {
    NAME_REQUIRED,
    NAME_TOO_LONG,
    DESCRIPTION_TOO_LONG,
    EMAIL_REQUIRED,
    EMAIL_INVALID,
    SHARE_WITH_SELF,
    RECIPIENT_NOT_FOUND,
}

/**
 * Domain failures for the Memory Drawers module. Resource-free so the domain and
 * use cases stay unit-testable; the presentation layer maps them to [UiText].
 */
sealed class DrawerFailure : Exception() {

    data class InvalidInput(
        val errors: Map<DrawerField, DrawerValidationError>,
    ) : DrawerFailure() {
        override val message: String = "Invalid drawer input: $errors"
    }

    data object NotFound : DrawerFailure()

    data object NotSignedIn : DrawerFailure()

    data object NotOwner : DrawerFailure()

    data object ReadOnly : DrawerFailure()

    /** FR-02.2: the free tier drawer quota (profile.max_drawers) is reached. */
    data class DrawerQuotaReached(val maxDrawers: Int) : DrawerFailure()

    /** FR-02.5: the drawer storage quota is reached. */
    data class StorageFull(
        val usedBytes: Long,
        val limitBytes: Long,
    ) : DrawerFailure()

    data object UnsupportedFormat : DrawerFailure()

    data class PhotoTooLarge(val sizeBytes: Long, val maxBytes: Long) : DrawerFailure()

    data object NetworkUnavailable : DrawerFailure()

    data class Unknown(val details: String? = null) : DrawerFailure()
}
