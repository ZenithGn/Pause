package com.pause.app.presentation.common

import androidx.annotation.StringRes
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource

/**
 * Localizable UI string resolved at composition time. Keeps resources out of the
 * domain/ViewModel layers (AGENTS.md: all user-facing strings live in strings.xml).
 */
sealed interface UiText {

    data class Resource(
        @StringRes val resId: Int,
        val args: List<Any> = emptyList(),
    ) : UiText

    data class Dynamic(val value: String) : UiText

    @Composable
    fun asString(): String = when (this) {
        is Resource -> stringResource(resId, *args.toTypedArray())
        is Dynamic -> value
    }
}
