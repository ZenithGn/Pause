package com.pause.app.data.repository

import com.pause.app.data.local.ShareDao
import com.pause.app.data.local.toDomain
import com.pause.app.data.local.toEntity
import com.pause.app.data.mapper.toDomain
import com.pause.app.data.mapper.toDrawerFailure
import com.pause.app.data.remote.dto.DrawerShareDto
import com.pause.app.data.remote.dto.ShareInvitationDto
import com.pause.app.data.remote.dto.ShareRecipientDto
import com.pause.app.domain.model.DrawerShare
import com.pause.app.domain.model.ShareInvitation
import com.pause.app.domain.model.SharePermission
import com.pause.app.domain.model.ShareRecipient
import com.pause.app.domain.repository.ShareRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.rpc
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** FR-02.7 – sharing through the owner-only RPCs (T-02.09). */
class ShareRepositoryImpl(
    private val client: SupabaseClient,
    private val shareDao: ShareDao,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : ShareRepository {

    override suspend fun getShares(drawerId: String): List<DrawerShare> = withContext(ioDispatcher) {
        val userId = client.auth.currentSessionOrNull()?.user?.id
        try {
            val parameters = buildJsonObject { put("p_drawer_id", drawerId) }
            val remote = client.postgrest.rpc("list_drawer_shares", parameters)
                .decodeList<DrawerShareDto>()
                .map { it.toDomain() }
            if (userId != null) {
                shareDao.deleteByDrawer(userId, drawerId)
                shareDao.upsertAll(remote.map { it.toEntity(userId, drawerId) })
            }
            remote
        } catch (error: Exception) {
            val cached = userId?.let { id -> shareDao.getByDrawer(id, drawerId) }.orEmpty()
                .map { it.toDomain() }
            if (cached.isEmpty()) throw error.toDrawerFailure() else cached
        }
    }

    override suspend fun findRecipient(email: String): ShareRecipient? = withContext(ioDispatcher) {
        call {
            val parameters = buildJsonObject { put("p_email", email) }
            client.postgrest.rpc("find_share_recipient", parameters)
                .decodeList<ShareRecipientDto>()
                .firstOrNull()
                ?.toDomain()
        }
    }

    override suspend fun share(
        drawerId: String,
        email: String,
        permission: SharePermission,
    ): String = withContext(ioDispatcher) {
        call {
            val parameters = buildJsonObject {
                put("p_drawer_id", drawerId)
                put("p_email", email)
                put("p_permission", permission.wire)
            }
            client.postgrest.rpc("share_drawer", parameters).decodeAs<String>()
        }
    }

    override suspend fun getInvitations(): List<ShareInvitation> = withContext(ioDispatcher) {
        call {
            client.postgrest.rpc("list_share_invitations")
                .decodeList<ShareInvitationDto>()
                .map { it.toDomain() }
        }
    }

    override suspend fun respond(shareId: String, accept: Boolean): Unit = withContext(ioDispatcher) {
        call {
            val parameters = buildJsonObject {
                put("p_share_id", shareId)
                put("p_accept", accept)
            }
            client.postgrest.rpc("respond_share_invitation", parameters)
        }
    }

    override suspend fun revoke(shareId: String): Unit = withContext(ioDispatcher) {
        call {
            client.from(TABLE).delete { filter { eq("id", shareId) } }
        }
    }

    private suspend inline fun <T> call(block: () -> T): T = try {
        block()
    } catch (error: Exception) {
        throw error.toDrawerFailure()
    }

    private companion object {
        const val TABLE = "drawer_shares"
    }
}
