package com.pause.app.domain.usecase

import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.model.DrawerField
import com.pause.app.domain.model.DrawerValidationError
import com.pause.app.domain.model.SharePermission
import com.pause.app.domain.model.ShareRecipient
import com.pause.app.testutil.FakeAuthRepository
import com.pause.app.testutil.FakeData
import com.pause.app.testutil.FakeShareRepository
import com.pause.app.testutil.testDrawer
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ShareDrawerUseCaseTest {

    private val shares = FakeShareRepository()
    private val auth = FakeAuthRepository().apply { sessionState.value = FakeData.session() }
    private val useCase = ShareDrawerUseCase(
        shareRepository = shares,
        getCurrentSessionUseCase = GetCurrentSessionUseCase(auth),
    )

    @Test
    fun `shares with a resolved recipient`() = runTest {
        shares.recipients["friend@pause.app"] = ShareRecipient("friend-id", "friend@pause.app", "Bạn")

        val result = useCase(testDrawer(), " Friend@Pause.app ", SharePermission.EDIT)

        assertTrue(result.isSuccess)
        assertEquals(listOf("friend@pause.app" to SharePermission.EDIT), shares.shareCalls)
    }

    @Test
    fun `only the owner can share`() = runTest {
        val result = useCase(testDrawer(isOwner = false), "friend@pause.app", SharePermission.VIEW)

        assertEquals(DrawerFailure.NotOwner, result.exceptionOrNull())
        assertTrue(shares.shareCalls.isEmpty())
    }

    @Test
    fun `rejects sharing with yourself`() = runTest {
        val result = useCase(testDrawer(), "user@pause.app", SharePermission.VIEW)

        val failure = result.exceptionOrNull() as DrawerFailure.InvalidInput
        assertEquals(DrawerValidationError.SHARE_WITH_SELF, failure.errors[DrawerField.SHARE_EMAIL])
    }

    @Test
    fun `rejects malformed emails`() = runTest {
        val result = useCase(testDrawer(), "not-an-email", SharePermission.VIEW)

        val failure = result.exceptionOrNull() as DrawerFailure.InvalidInput
        assertEquals(DrawerValidationError.EMAIL_INVALID, failure.errors[DrawerField.SHARE_EMAIL])
    }

    @Test
    fun `reports unknown recipients`() = runTest {
        val result = useCase(testDrawer(), "nobody@pause.app", SharePermission.VIEW)

        val failure = result.exceptionOrNull() as DrawerFailure.InvalidInput
        assertEquals(
            DrawerValidationError.RECIPIENT_NOT_FOUND,
            failure.errors[DrawerField.SHARE_EMAIL],
        )
    }

    @Test
    fun `revoking removes the share`() = runTest {
        shares.recipients["friend@pause.app"] = ShareRecipient("friend-id", "friend@pause.app", "Bạn")
        useCase(testDrawer(), "friend@pause.app", SharePermission.VIEW)
        val share = shares.shares.single()

        RevokeShareUseCase(shares)(testDrawer(), share).getOrThrow()

        assertTrue(shares.shares.isEmpty())
    }

    @Test
    fun `non-owner cannot revoke`() = runTest {
        shares.recipients["friend@pause.app"] = ShareRecipient("friend-id", "friend@pause.app", "Bạn")
        useCase(testDrawer(), "friend@pause.app", SharePermission.VIEW)
        val share = shares.shares.single()

        val result = RevokeShareUseCase(shares)(testDrawer(isOwner = false), share)

        assertEquals(DrawerFailure.NotOwner, result.exceptionOrNull())
        assertEquals(1, shares.shares.size)
    }
}
