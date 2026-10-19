package com.pause.app.domain.validation

import com.pause.app.domain.model.ValidationError
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CredentialsValidatorTest {

    @Test
    fun `email is required`() {
        assertEquals(ValidationError.EMAIL_REQUIRED, CredentialsValidator.validateEmail("  "))
    }

    @Test
    fun `email must be well formed`() {
        assertEquals(ValidationError.EMAIL_INVALID, CredentialsValidator.validateEmail("not-an-email"))
        assertEquals(ValidationError.EMAIL_INVALID, CredentialsValidator.validateEmail("user@pause"))
        assertNull(CredentialsValidator.validateEmail("user@pause.app"))
        assertNull(CredentialsValidator.validateEmail("  user@pause.app  "))
    }

    @Test
    fun `password length and strength`() {
        assertEquals(ValidationError.PASSWORD_REQUIRED, CredentialsValidator.validatePassword(""))
        assertEquals(ValidationError.PASSWORD_TOO_SHORT, CredentialsValidator.validatePassword("Ab1"))
        assertEquals(ValidationError.PASSWORD_WEAK, CredentialsValidator.validatePassword("onlyletters"))
        assertEquals(ValidationError.PASSWORD_WEAK, CredentialsValidator.validatePassword("12345678"))
        assertNull(CredentialsValidator.validatePassword("Pause2026"))
    }

    @Test
    fun `sign in password does not require strength`() {
        assertNull(CredentialsValidator.validatePassword("12345678", requireStrength = false))
        assertEquals(
            ValidationError.PASSWORD_TOO_SHORT,
            CredentialsValidator.validatePassword("1234567", requireStrength = false),
        )
    }

    @Test
    fun `confirm password must match`() {
        assertEquals(
            ValidationError.PASSWORD_MISMATCH,
            CredentialsValidator.validateConfirmPassword("Pause2026", "Pause2027"),
        )
        assertNull(CredentialsValidator.validateConfirmPassword("Pause2026", "Pause2026"))
    }

    @Test
    fun `display name rules`() {
        assertEquals(ValidationError.NAME_REQUIRED, CredentialsValidator.validateDisplayName(""))
        assertEquals(ValidationError.NAME_TOO_SHORT, CredentialsValidator.validateDisplayName("A"))
        assertNull(CredentialsValidator.validateDisplayName("An"))
    }

    @Test
    fun `phone is optional but validated when present`() {
        assertNull(CredentialsValidator.validateOptionalPhone(null))
        assertNull(CredentialsValidator.validateOptionalPhone(""))
        assertNull(CredentialsValidator.validateOptionalPhone("0912345678"))
        assertNull(CredentialsValidator.validateOptionalPhone("+84 912 345 678"))
        assertEquals(ValidationError.PHONE_INVALID, CredentialsValidator.validateOptionalPhone("abc"))
    }

    @Test
    fun `terms must be accepted`() {
        assertEquals(ValidationError.TERMS_REQUIRED, CredentialsValidator.validateTerms(false))
        assertNull(CredentialsValidator.validateTerms(true))
    }
}
