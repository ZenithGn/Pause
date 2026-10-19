package com.pause.app.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Row of `public.profiles` returned by PostgREST. */
@Serializable
data class ProfileDto(
    val id: String,
    @SerialName("display_name") val displayName: String,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    val phone: String? = null,
    @SerialName("max_drawers") val maxDrawers: Int = 3,
    @SerialName("created_at") val createdAt: String? = null,
)

/** Payload for `PATCH /profiles?id=eq.{uid}`. Nulls clear the column. */
@Serializable
data class ProfileUpdateDto(
    @SerialName("display_name") val displayName: String,
    val phone: String?,
    @SerialName("avatar_url") val avatarUrl: String?,
)
