package com.pause.app.domain.usecase

import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.repository.DrawerRepository

/** FR-02.4 – delete a drawer and its photos (owner only, irreversible). */
class DeleteDrawerUseCase(
    private val drawerRepository: DrawerRepository,
) {
    suspend operator fun invoke(drawer: Drawer): Result<Unit> {
        if (!drawer.isOwner) return Result.failure(DrawerFailure.NotOwner)
        return drawerResult { drawerRepository.deleteDrawer(drawer.id) }
    }
}
