package com.pause.app.domain.usecase

import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.model.ShareInvitation
import com.pause.app.domain.repository.ShareRepository

/** T-02.23 – pending invitations the signed-in user received. */
class GetShareInvitationsUseCase(
    private val shareRepository: ShareRepository,
) {
    suspend operator fun invoke(): Result<List<ShareInvitation>> =
        drawerResult { shareRepository.getInvitations() }
}

/** T-02.22 – accept or reject a drawer invitation. */
class RespondShareInvitationUseCase(
    private val shareRepository: ShareRepository,
) {
    suspend operator fun invoke(invitation: ShareInvitation, accept: Boolean): Result<Unit> {
        if (invitation.status.wire != "pending") {
            return Result.failure(DrawerFailure.Unknown("Invitation already answered"))
        }
        return drawerResult { shareRepository.respond(invitation.id, accept) }
    }
}
