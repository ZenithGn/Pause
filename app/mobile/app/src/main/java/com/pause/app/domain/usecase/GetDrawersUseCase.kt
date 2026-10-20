package com.pause.app.domain.usecase

import com.pause.app.domain.model.Drawer
import com.pause.app.domain.repository.DrawerRepository

/** FR-02.1 – owned + shared drawers. */
class GetDrawersUseCase(
    private val drawerRepository: DrawerRepository,
) {
    suspend operator fun invoke(): Result<List<Drawer>> =
        drawerResult { drawerRepository.listDrawers() }
}

/** Loads one drawer (detail screen / deep links). */
class GetDrawerUseCase(
    private val drawerRepository: DrawerRepository,
) {
    suspend operator fun invoke(drawerId: String): Result<Drawer> =
        drawerResult { drawerRepository.getDrawer(drawerId) }
}
