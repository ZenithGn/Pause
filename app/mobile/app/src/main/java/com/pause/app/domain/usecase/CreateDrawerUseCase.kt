package com.pause.app.domain.usecase

import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.model.DrawerField
import com.pause.app.domain.repository.DrawerRepository
import com.pause.app.domain.repository.ProfileRepository
import com.pause.app.domain.validation.DrawerValidator

/**
 * FR-02.2 – create a drawer after validating input and the free-tier drawer quota.
 * The server re-checks the quota with `enforce_drawer_quota()`.
 */
class CreateDrawerUseCase(
    private val drawerRepository: DrawerRepository,
    private val profileRepository: ProfileRepository,
    private val getCurrentSessionUseCase: GetCurrentSessionUseCase,
) {
    suspend operator fun invoke(name: String, description: String?): Result<Drawer> {
        val errors = buildMap {
            DrawerValidator.validateName(name)?.let { put(DrawerField.NAME, it) }
            DrawerValidator.validateDescription(description)?.let { put(DrawerField.DESCRIPTION, it) }
        }
        if (errors.isNotEmpty()) {
            return Result.failure(DrawerFailure.InvalidInput(errors))
        }

        val session = getCurrentSessionUseCase() ?: return Result.failure(DrawerFailure.NotSignedIn)

        return drawerResult {
            val profile = profileRepository.getProfile(session.user.id)
            val owned = drawerRepository.ownedDrawerCount(session.user.id)
            if (owned >= profile.maxDrawers) {
                throw DrawerFailure.DrawerQuotaReached(profile.maxDrawers)
            }
            drawerRepository.createDrawer(
                ownerId = session.user.id,
                name = name.trim(),
                description = description?.trim()?.ifBlank { null },
            )
        }
    }
}
