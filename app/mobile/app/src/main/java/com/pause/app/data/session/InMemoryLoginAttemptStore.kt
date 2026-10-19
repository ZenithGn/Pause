package com.pause.app.data.session

import com.pause.app.domain.repository.LoginAttemptStore

/**
 * In-memory implementation of the FR-01.2 lockout counter.
 *
 * Deliberately not persisted: the server is the source of truth (Supabase Auth
 * rate limits) and an app restart should not lock a user out forever.
 */
class InMemoryLoginAttemptStore(
    private val now: () -> Long = System::currentTimeMillis,
) : LoginAttemptStore {

    private data class Attempts(val count: Int, val lockedUntil: Long)

    private val attempts = mutableMapOf<String, Attempts>()

    override fun registerFailure(email: String) {
        val key = keyOf(email)
        synchronized(attempts) {
            val current = attempts[key]
            val count = (current?.count ?: 0) + 1
            attempts[key] = if (count >= LoginAttemptStore.MAX_ATTEMPTS) {
                Attempts(count = 0, lockedUntil = now() + LoginAttemptStore.LOCK_DURATION_MILLIS)
            } else {
                Attempts(count = count, lockedUntil = 0L)
            }
        }
    }

    override fun clear(email: String) {
        synchronized(attempts) { attempts.remove(keyOf(email)) }
    }

    override fun lockRemainingMillis(email: String): Long {
        val key = keyOf(email)
        synchronized(attempts) {
            val current = attempts[key] ?: return 0L
            val remaining = current.lockedUntil - now()
            if (remaining <= 0L) {
                if (current.lockedUntil != 0L) attempts.remove(key)
                return 0L
            }
            return remaining
        }
    }

    private fun keyOf(email: String): String = email.trim().lowercase()
}
