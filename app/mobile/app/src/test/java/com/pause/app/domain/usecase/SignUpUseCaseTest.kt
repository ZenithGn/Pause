package com.pause.app.domain.usecase

import com.pause.app.domain.model.AuthFailure
import com.pause.app.domain.model.AuthField
import com.pause.app.domain.model.ValidationError
import com.pause.app.domain.repository.SignUpOutcome
import com.pause.app.domain.validation.CredentialsValidator
import com.pause.app.testutil.FakeAuthRepository
import com.pause.app.testutil.FakeData
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SignUpUseCaseTest {

    private val repository = FakeAuthRepository()
    private val useCase = SignUpUseCase(repository)

    @Test
    fun `rejects invalid input before touching the network`() = runTest {
        val result = useCase(
            email = "bad-email",
            password = "short",
            confirmPassword = "other",
            displayName = "",
            acceptedTerms = false,
        )

        val failure = result.exceptionOrNull() as AuthFailure.InvalidInput
        assertEquals(
            setOf(
                AuthField.DISPLAY_NAME,
                AuthField.EMAIL,
                AuthField.PASSWORD,
                AuthField.CONFIRM_PASSWORD,
                AuthField.TERMS,
            ),
            failure.errors.keys,
        )
        assertEquals(ValidationError.NAME_REQUIRED, failure.errors[AuthField.DISPLAY_NAME])
        assertEquals(ValidationError.EMAIL_INVALID, failure.errors[AuthField.EMAIL])
        assertNull(repository.lastSignedUpEmail)
    }

    @Test
    fun `trims input and forwards to the repository`() = runTest {
        repository.signUpOutcome = SignUpOutcome.ConfirmationRequired("new-user@pause.app")

        val result = useCase(
            email = "  new-user@pause.app ",
            password = "Pause2026",
            confirmPassword = "Pause2026",
            displayName = "  Nguyễn Văn A ",
            acceptedTerms = true,
        )

        assertTrue(result.isSuccess)
        assertEquals(SignUpOutcome.ConfirmationRequired("new-user@pause.app"), result.getOrNull())
        assertEquals("new-user@pause.app", repository.lastSignedUpEmail)
        assertEquals("Nguyễn Văn A", repository.lastSignedUpDisplayName)
    }

    @Test
    fun `signs in immediately when confirmation is disabled on the server`() = runTest {
        repository.signUpOutcome = SignUpOutcome.SignedIn(FakeData.session())

        val result = useCase(
            email = "user@pause.app",
            password = "Pause2026",
            confirmPassword = "Pause2026",
            displayName = "Nguyễn Văn A",
            acceptedTerms = true,
        )

        assertTrue(result.getOrNull() is SignUpOutcome.SignedIn)
    }

    @Test
    fun `propagates domain failures`() = runTest {
        repository.signUpFailure = AuthFailure.EmailAlreadyRegistered

        val result = useCase(
            email = "user@pause.app",
            password = "Pause2026",
            confirmPassword = "Pause2026",
            displayName = "Nguyễn Văn A",
            acceptedTerms = true,
        )

        assertEquals(AuthFailure.EmailAlreadyRegistered, result.exceptionOrNull())
    }
}

