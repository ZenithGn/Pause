package com.pause.app.domain.validation

import com.pause.app.domain.model.ValidationError

/**
 * Pure validation rules shared by sign-up, sign-in, password reset and profile
 * editing. No Android dependencies so they are unit-testable.
 */
object CredentialsValidator {

    const val MIN_PASSWORD_LENGTH = 8
    const val MIN_NAME_LENGTH = 2

    private val EMAIL_REGEX = Regex("^[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}$")
    private val PHONE_REGEX = Regex("^\\+?[0-9][0-9\\s.\\-]{7,14}$")
    private val DIGIT_REGEX = Regex("\\d")
    private val LETTER_REGEX = Regex("[A-Za-z]")

    /** @return the first validation error, or `null` when the value is valid. */
    fun validateEmail(raw: String): ValidationError? {
        val email = raw.trim()
        return when {
            email.isEmpty() -> ValidationError.EMAIL_REQUIRED
            !EMAIL_REGEX.matches(email) -> ValidationError.EMAIL_INVALID
            else -> null
        }
    }

    /**
     * @param requireStrength when true (sign-up / reset) the password must
     * contain both letters and digits. Sign-in only checks presence and length
     * because legacy passwords are validated by the server.
     */
    fun validatePassword(raw: String, requireStrength: Boolean = true): ValidationError? = when {
        raw.isEmpty() -> ValidationError.PASSWORD_REQUIRED
        raw.length < MIN_PASSWORD_LENGTH -> ValidationError.PASSWORD_TOO_SHORT
        requireStrength && (!LETTER_REGEX.containsMatchIn(raw) || !DIGIT_REGEX.containsMatchIn(raw)) ->
            ValidationError.PASSWORD_WEAK
        else -> null
    }

    fun validateConfirmPassword(password: String, confirmation: String): ValidationError? = when {
        confirmation.isEmpty() -> ValidationError.PASSWORD_REQUIRED
        password != confirmation -> ValidationError.PASSWORD_MISMATCH
        else -> null
    }

    fun validateDisplayName(raw: String): ValidationError? {
        val name = raw.trim()
        return when {
            name.isEmpty() -> ValidationError.NAME_REQUIRED
            name.length < MIN_NAME_LENGTH -> ValidationError.NAME_TOO_SHORT
            else -> null
        }
    }

    /** Phone is optional; an empty string is valid. */
    fun validateOptionalPhone(raw: String?): ValidationError? {
        val phone = raw?.trim().orEmpty()
        if (phone.isEmpty()) return null
        return if (PHONE_REGEX.matches(phone)) null else ValidationError.PHONE_INVALID
    }

    fun validateTerms(accepted: Boolean): ValidationError? =
        if (accepted) null else ValidationError.TERMS_REQUIRED
}
