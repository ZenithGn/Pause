package com.pause.app.domain.usecase

import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.model.DrawerShare
import com.pause.app.domain.repository.ShareRepository

/** FR-02.7 – list current shares of a drawer (owner only). */
class GetDrawerSharesUseCase(
    private val shareRepository: ShareRepository,
) {
    suspend operator fun invoke(drawer: Drawer): Result<List<DrawerShare>> {
        if (!drawer.isOwner) return Result.failure(DrawerFailure.NotOwner)
        return drawerResult { shareRepository.getShares(drawer.id) }
    }
}

/** FR-02.7 – owner revokes a share at any time. */
class RevokeShareUseCase(
    private val shareRepository: ShareRepository,
) {
    suspend operator fun invoke(drawer: Drawer, share: DrawerShare): Result<Unit> {
        if (!drawer.isOwner) return Result.failure(DrawerFailure.NotOwner)
        return drawerResult { shareRepository.revoke(share.id) }
    }
}
