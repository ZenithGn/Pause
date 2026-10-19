package com.pause.app.domain.model

/**
 * Authenticated identity. Mirrors the subset of `auth.users` the app needs.
 *
 * Distinct from [UserProfile]: [User] owns credentials/identity concerns while
 * [UserProfile] is the editable `public.profiles` row (FR-01.5).
 */
data class User(
    val id: String,
    val email: String?,
    val emailConfirmed: Boolean = false,
)
