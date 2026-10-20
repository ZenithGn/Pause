package com.pause.app.domain.usecase

import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.model.DrawerField
import com.pause.app.domain.model.DrawerShare
import com.pause.app.domain.model.DrawerValidationError
import com.pause.app.domain.model.SharePermission
import com.pause.app.domain.repository.ShareRepository
import com.pause.app.domain.validation.DrawerValidator

/** FR-02.7 – share a drawer by email with a view/edit permission. */
class ShareDrawerUseCase(
    private val shareRepository: ShareRepository,
    private val getCurrentSessionUseCase: GetCurrentSessionUseCase,
) {
    suspend operator fun invoke(
        drawer: Drawer,
        email: String,
        permission: SharePermission,
    ): Result<String> {
        if (!drawer.isOwner) return Result.failure(DrawerFailure.NotOwner)

        val ownerEmail = getCurrentSessionUseCase()?.user?.email
        val validation = DrawerValidator.validateShareEmail(email, ownerEmail)
        if (validation != null) {
            return Result.failure(
                DrawerFailure.InvalidInput(mapOf(DrawerField.SHARE_EMAIL to validation)),
            )
        }

        return drawerResult {
            val normalized = email.trim()
            val recipient = shareRepository.findRecipient(normalized)
                ?: throw DrawerFailure.InvalidInput(
                    mapOf(DrawerField.SHARE_EMAIL to DrawerValidationError.RECIPIENT_NOT_FOUND),
                )
            shareRepository.share(drawer.id, recipient.email, permission)
        }
    }
}
