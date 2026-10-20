package com.pause.app.domain.usecase

import com.pause.app.domain.model.DrawerShare
import com.pause.app.domain.model.ShareInvitation
import com.pause.app.domain.model.SharePermission
import com.pause.app.domain.model.ShareStatus
import com.pause.app.testutil.FakeShareRepository
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ShareInvitationUseCaseTest {

    private val shares = FakeShareRepository()
    private val getInvitations = GetShareInvitationsUseCase(shares)
    private val respond = RespondShareInvitationUseCase(shares)

    private fun seedInvitation(
        id: String = "share-1",
        status: ShareStatus = ShareStatus.PENDING,
    ): ShareInvitation {
        val invitation = ShareInvitation(
            id = id,
            drawerId = "drawer-1",
            drawerName = "Đà Lạt 2026",
            ownerName = "Alice",
            permission = SharePermission.VIEW,
            status = status,
        )
        shares.invitations += invitation
        shares.shares += DrawerShare(
            id = id,
            sharedWithId = "user-id-1",
            email = "me@pause.app",
            displayName = "Me",
            permission = SharePermission.VIEW,
            status = status,
        )
        return invitation
    }

    @Test
    fun `lists pending invitations`() = runTest {
        seedInvitation()

        val result = getInvitations().getOrThrow()

        assertEquals(1, result.size)
        assertEquals("Đà Lạt 2026", result.single().drawerName)
    }

    @Test
    fun `accepting removes the invitation and marks the share accepted`() = runTest {
        val invitation = seedInvitation()

        respond(invitation, accept = true).getOrThrow()

        assertTrue(shares.invitations.isEmpty())
        assertEquals(ShareStatus.ACCEPTED, shares.shares.single().status)
    }

    @Test
    fun `rejecting marks the share rejected`() = runTest {
        val invitation = seedInvitation()

        respond(invitation, accept = false).getOrThrow()

        assertTrue(shares.invitations.isEmpty())
        assertEquals(ShareStatus.REJECTED, shares.shares.single().status)
    }

    @Test
    fun `an answered invitation cannot be responded to again`() = runTest {
        val invitation = seedInvitation(status = ShareStatus.ACCEPTED)

        val result = respond(invitation, accept = true)

        assertTrue(result.isFailure)
        assertEquals(ShareStatus.ACCEPTED, shares.shares.single().status)
    }
}
