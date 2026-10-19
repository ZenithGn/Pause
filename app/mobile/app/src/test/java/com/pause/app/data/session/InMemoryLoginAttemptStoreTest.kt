package com.pause.app.data.session

import com.pause.app.domain.repository.LoginAttemptStore
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class InMemoryLoginAttemptStoreTest {

    private var clock = 0L
    private val store = InMemoryLoginAttemptStore(now = { clock })

    @Test
    fun `locks after five failures`() {
        repeat(LoginAttemptStore.MAX_ATTEMPTS) { store.registerFailure("user@pause.app") }

        val remaining = store.lockRemainingMillis("user@pause.app")

        assertTrue(remaining > 0)
        assertEquals(LoginAttemptStore.LOCK_DURATION_MILLIS, remaining)
    }

    @Test
    fun `does not lock before five failures`() {
        repeat(LoginAttemptStore.MAX_ATTEMPTS - 1) { store.registerFailure("user@pause.app") }

        assertEquals(0L, store.lockRemainingMillis("user@pause.app"))
    }

    @Test
    fun `lock expires after fifteen minutes`() {
        repeat(LoginAttemptStore.MAX_ATTEMPTS) { store.registerFailure("user@pause.app") }

        clock = LoginAttemptStore.LOCK_DURATION_MILLIS - 1
        assertTrue(store.lockRemainingMillis("user@pause.app") > 0)

        clock = LoginAttemptStore.LOCK_DURATION_MILLIS
        assertEquals(0L, store.lockRemainingMillis("user@pause.app"))
    }

    @Test
    fun `clear resets the counter`() {
        repeat(3) { store.registerFailure("user@pause.app") }
        store.clear("user@pause.app")

        repeat(LoginAttemptStore.MAX_ATTEMPTS - 1) { store.registerFailure("user@pause.app") }

        assertEquals(0L, store.lockRemainingMillis("user@pause.app"))
    }

    @Test
    fun `keys are case and whitespace insensitive`() {
        repeat(LoginAttemptStore.MAX_ATTEMPTS) { store.registerFailure("User@Pause.app ") }

        assertTrue(store.lockRemainingMillis("  user@pause.APP") > 0)
    }
}
