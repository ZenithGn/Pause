package com.pause.app.domain.usecase

import com.pause.app.domain.model.DrawerFailure
import kotlin.math.ceil

/** Wraps drawer repository calls so use cases always expose `Result<T>`. */
internal suspend inline fun <T> drawerResult(
    crossinline block: suspend () -> T,
): Result<T> = try {
    Result.success(block())
} catch (failure: DrawerFailure) {
    Result.failure(failure)
} catch (error: Exception) {
    Result.failure(DrawerFailure.Unknown(error.message))
}

/** FR-02.5 limits (see docs/03-References/storage-strategy.md). */
object DrawerLimits {
    const val MAX_COMPRESSED_PHOTO_BYTES = 5_242_880L // 5 MB
    const val PAGE_SIZE = 60
    const val MAX_PAGE_SIZE = 120
}

internal fun megabytes(bytes: Long): Long =
    ceil(bytes / (1024.0 * 1024.0)).toLong().coerceAtLeast(1)
