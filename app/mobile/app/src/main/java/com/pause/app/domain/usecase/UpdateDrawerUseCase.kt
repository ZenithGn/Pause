package com.pause.app.domain.usecase

import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.model.DrawerField
import com.pause.app.domain.repository.DrawerRepository
import com.pause.app.domain.validation.DrawerValidator

/** FR-02.3 – rename / edit description / change cover (owner or edit permission). */
class UpdateDrawerUseCase(
    private val drawerRepository: DrawerRepository,
) {
    suspend operator fun invoke(
        drawer: Drawer,
        name: String,
        description: String?,
        coverPhotoPath: String? = null,
    ): Result<Drawer> {
        if (!drawer.canWrite) return Result.failure(DrawerFailure.ReadOnly)

        val errors = buildMap {
            DrawerValidator.validateName(name)?.let { put(DrawerField.NAME, it) }
            DrawerValidator.validateDescription(description)?.let { put(DrawerField.DESCRIPTION, it) }
        }
        if (errors.isNotEmpty()) {
            return Result.failure(DrawerFailure.InvalidInput(errors))
        }

        return drawerResult {
            drawerRepository.updateDrawer(
                drawerId = drawer.id,
                name = name.trim(),
                description = description?.trim()?.ifBlank { null },
                coverPhotoPath = coverPhotoPath,
            )
        }
    }
}
