package com.pause.app.domain.usecase

import com.pause.app.domain.model.AuthFailure
import kotlin.math.ceil

/**
 * Wraps repository calls so use cases always expose `Result<T>` and expected
 * domain failures never leak as raw exceptions.
 */
internal suspend inline fun <T> authResult(
    crossinline block: suspend () -> T,
): Result<T> = try {
    Result.success(block())
} catch (failure: AuthFailure) {
    Result.failure(failure)
} catch (error: Exception) {
    Result.failure(AuthFailure.Unknown(error.message))
}

internal fun minutesUntil(millis: Long): Int =
    ceil(millis / 60_000.0).toInt().coerceAtLeast(1)
