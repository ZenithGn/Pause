package com.pause.app.domain.repository

/**
 * Client-side brute-force protection required by FR-01.2
 * ("Sai mật khẩu → thông báo lỗi. Quá 5 lần → khóa tạm 15 phút").
 *
 * The server (Supabase Auth rate limits) is still the source of truth; this
 * guard protects the UX and avoids hitting the rate limiter.
 */
interface LoginAttemptStore {

    /** Records a failed sign-in attempt for [email]. */
    fun registerFailure(email: String)

    /** Clears the failure counter after a successful sign-in. */
    fun clear(email: String)

    /** @return remaining lock time in milliseconds, or `0` when not locked. */
    fun lockRemainingMillis(email: String): Long

    companion object {
        const val MAX_ATTEMPTS = 5
        const val LOCK_DURATION_MILLIS = 15 * 60 * 1000L
    }
}
