package com.pause.app.presentation.drawer

import com.pause.app.domain.model.DrawerFailure

/** Normalises an unknown throwable into a [DrawerFailure] for the UI mapper. */
internal fun Throwable.asDrawerFailure(): DrawerFailure =
    this as? DrawerFailure ?: DrawerFailure.Unknown(message)
