package com.pause.app.domain.validation

import com.pause.app.domain.model.DrawerValidationError

/** Pure validation rules for drawer / share forms (FR-02.2, FR-02.3, FR-02.7). */
object DrawerValidator {

    const val MAX_NAME_LENGTH = 60
    const val MAX_DESCRIPTION_LENGTH = 300

    private val EMAIL_REGEX = Regex("^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}$")

    fun validateName(raw: String): DrawerValidationError? {
        val name = raw.trim()
        return when {
            name.isEmpty() -> DrawerValidationError.NAME_REQUIRED
            name.length > MAX_NAME_LENGTH -> DrawerValidationError.NAME_TOO_LONG
            else -> null
        }
    }

    fun validateDescription(raw: String?): DrawerValidationError? {
        val description = raw?.trim().orEmpty()
        return if (description.length > MAX_DESCRIPTION_LENGTH) {
            DrawerValidationError.DESCRIPTION_TOO_LONG
        } else {
            null
        }
    }

    fun validateShareEmail(raw: String, ownerEmail: String?): DrawerValidationError? {
        val email = raw.trim()
        return when {
            email.isEmpty() -> DrawerValidationError.EMAIL_REQUIRED
            !EMAIL_REGEX.matches(email) -> DrawerValidationError.EMAIL_INVALID
            ownerEmail != null && email.equals(ownerEmail.trim(), ignoreCase = true) ->
                DrawerValidationError.SHARE_WITH_SELF
            else -> null
        }
    }
}
