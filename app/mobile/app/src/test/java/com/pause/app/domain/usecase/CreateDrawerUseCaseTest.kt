package com.pause.app.domain.usecase

import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.model.DrawerField
import com.pause.app.domain.validation.DrawerValidator
import com.pause.app.testutil.FakeAuthRepository
import com.pause.app.testutil.FakeData
import com.pause.app.testutil.FakeDrawerRepository
import com.pause.app.testutil.FakeProfileRepository
import com.pause.app.testutil.testDrawer
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CreateDrawerUseCaseTest {

    private val drawers = FakeDrawerRepository()
    private val profiles = FakeProfileRepository()
    private val auth = FakeAuthRepository().apply { sessionState.value = FakeData.session() }
    private val useCase = CreateDrawerUseCase(
        drawerRepository = drawers,
        profileRepository = profiles,
        getCurrentSessionUseCase = GetCurrentSessionUseCase(auth),
    )

    @Test
    fun `creates a drawer and forwards trimmed values`() = runTest {
        val result = useCase("  Đà Lạt 2026 ", "  Chuyến đi  ")

        assertTrue(result.isSuccess)
        assertEquals("Đà Lạt 2026", drawers.lastCreatedName)
        assertEquals("Chuyến đi", drawers.lastCreatedDescription)
        assertEquals(1, drawers.drawers.size)
    }

    @Test
    fun `rejects an empty name before creating`() = runTest {
        val result = useCase("   ", null)

        val failure = result.exceptionOrNull() as DrawerFailure.InvalidInput
        assertEquals(DrawerField.NAME, failure.errors.keys.first())
        assertTrue(drawers.drawers.isEmpty())
    }

    @Test
    fun `rejects names over the limit`() = runTest {
        val result = useCase("a".repeat(DrawerValidator.MAX_NAME_LENGTH + 1), null)

        assertTrue(result.exceptionOrNull() is DrawerFailure.InvalidInput)
    }

    @Test
    fun `enforces the free-tier drawer quota`() = runTest {
        drawers.drawers += testDrawer(id = "d1")
        drawers.drawers += testDrawer(id = "d2")
        drawers.drawers += testDrawer(id = "d3")

        val result = useCase("Ngăn kéo thứ 4", null)

        val failure = result.exceptionOrNull() as DrawerFailure.DrawerQuotaReached
        assertEquals(3, failure.maxDrawers)
        assertEquals(3, drawers.drawers.size)
    }

    @Test
    fun `rejects creation without a session`() = runTest {
        auth.sessionState.value = null

        val result = useCase("Ngăn kéo", null)

        assertEquals(DrawerFailure.NotSignedIn, result.exceptionOrNull())
    }

    @Test
    fun `propagates repository failures`() = runTest {
        drawers.createFailure = DrawerFailure.Unknown("boom")

        val result = useCase("Ngăn kéo", null)

        assertNotNull(result.exceptionOrNull())
    }
}
