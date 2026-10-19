package com.pause.app.domain.usecase

import com.pause.app.domain.model.AuthFailure
import com.pause.app.domain.repository.LoginAttemptStore
import com.pause.app.testutil.FakeAuthRepository
import com.pause.app.testutil.FakeData
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SignInUseCaseTest {

    private val repository = FakeAuthRepository()
    private val attemptStore = LoginAttemptStoreFake()
    private val useCase = SignInUseCase(repository, attemptStore)

    @Test
    fun `valid credentials return the session and clear the failure counter`() = runTest {
        attemptStore.failures = 2

        val result = useCase("user@pause.app", "Pause2026")

        assertTrue(result.isSuccess)
        assertEquals("user@pause.app", result.getOrNull()?.user?.email)
        assertEquals(0, attemptStore.failures)
        assertEquals(1, repository.signInCalls)
    }

    @Test
    fun `invalid credentials are reported and counted`() = runTest {
        repository.signInFailure = AuthFailure.InvalidCredentials

        val result = useCase("user@pause.app", "wrong-password")

        assertEquals(AuthFailure.InvalidCredentials, result.exceptionOrNull())
        assertEquals(1, attemptStore.failures)
    }

    @Test
    fun `account is locked after five failed attempts`() = runTest {
        repository.signInFailure = AuthFailure.InvalidCredentials

        repeat(LoginAttemptStore.MAX_ATTEMPTS - 1) {
            useCase("user@pause.app", "wrong-password")
        }
        assertEquals(LoginAttemptStore.MAX_ATTEMPTS - 1, attemptStore.failures)

        val lockedResult = useCase("user@pause.app", "wrong-password")

        val failure = lockedResult.exceptionOrNull() as AuthFailure.AccountLocked
        assertEquals(15, failure.retryAfterMinutes)
        assertEquals(LoginAttemptStore.MAX_ATTEMPTS, repository.signInCalls)
    }

    @Test
    fun `locked account does not call the repository`() = runTest {
        attemptStore.lockedForMillis = 5 * 60 * 1000L

        val result = useCase("user@pause.app", "Pause2026")

        val failure = result.exceptionOrNull() as AuthFailure.AccountLocked
        assertEquals(5, failure.retryAfterMinutes)
        assertEquals(0, repository.signInCalls)
    }

    @Test
    fun `rejects malformed input`() = runTest {
        val result = useCase("", "x")

        assertTrue(result.exceptionOrNull() is AuthFailure.InvalidInput)
        assertEquals(0, repository.signInCalls)
    }

    @Test
    fun `keeps unrelated failures untouched`() = runTest {
        repository.signInFailure = AuthFailure.NetworkUnavailable

        val result = useCase("user@pause.app", "Pause2026")

        assertEquals(AuthFailure.NetworkUnavailable, result.exceptionOrNull())
        assertEquals(0, attemptStore.failures)
    }

    @Test
    fun `google sign in returns a session`() = runTest {
        val google = SignInWithGoogleUseCase(repository)

        val result = google("id-token", "nonce")

        assertTrue(result.getOrNull()?.user?.email == FakeData.session("google-user@pause.app").user.email)
    }
}

private class LoginAttemptStoreFake : LoginAttemptStore {
    var failures: Int = 0
    var lockedForMillis: Long = 0L

    override fun registerFailure(email: String) {
        failures++
        if (failures >= LoginAttemptStore.MAX_ATTEMPTS) {
            lockedForMillis = LoginAttemptStore.LOCK_DURATION_MILLIS
        }
    }

    override fun clear(email: String) {
        failures = 0
        lockedForMillis = 0
    }

    override fun lockRemainingMillis(email: String): Long = lockedForMillis
}
