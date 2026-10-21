package com.pause.app.data.repository

import com.pause.app.data.local.DrawerDao
import com.pause.app.data.local.toDomain
import com.pause.app.data.local.toEntity
import com.pause.app.data.mapper.toDomain
import com.pause.app.data.mapper.toDrawerFailure
import com.pause.app.data.remote.dto.DrawerCoverDto
import com.pause.app.data.remote.dto.DrawerDto
import com.pause.app.data.remote.dto.DrawerUpdateDto
import com.pause.app.data.remote.dto.DrawerUpdateWithCoverDto
import com.pause.app.data.remote.dto.IdDto
import com.pause.app.data.remote.dto.PhotoDto
import com.pause.app.domain.model.Drawer
import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.repository.DrawerRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.rpc
import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** FR-02.1 → FR-02.4 – Supabase implementation (T-02.07). */
class DrawerRepositoryImpl(
    private val client: SupabaseClient,
    private val drawerDao: DrawerDao,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : DrawerRepository {

    override suspend fun listDrawers(): List<Drawer> = withContext(ioDispatcher) {
        val userId = currentUserId()
        try {
            val remote = client.postgrest.rpc("list_drawers")
                .decodeList<DrawerDto>()
                .map { it.toDomain() }
            if (userId != null) {
                drawerDao.clear(userId)
                drawerDao.upsertAll(remote.map { it.toEntity(userId) })
            }
            remote
        } catch (error: Exception) {
            // Offline fallback, scoped to the signed-in user only (no cross-account leak).
            val cached = userId?.let { id -> drawerDao.getAll(id).map { it.toDomain() } }.orEmpty()
            if (cached.isEmpty()) throw error.toDrawerFailure() else cached
        }
    }

    override suspend fun getDrawer(drawerId: String): Drawer = withContext(ioDispatcher) {
        val userId = currentUserId()
        try {
            fetchDrawer(drawerId)
        } catch (error: Exception) {
            val cached = userId?.let { id -> drawerDao.getById(id, drawerId)?.toDomain() }
            cached ?: throw error.toDrawerFailure()
        }
    }

    override suspend fun ownedDrawerCount(ownerId: String): Int = withContext(ioDispatcher) {
        call {
            client.from(TABLE)
                .select { filter { eq("owner_id", ownerId) } }
                .decodeList<IdDto>()
                .size
        }
    }

    override suspend fun createDrawer(
        ownerId: String,
        name: String,
        description: String?,
    ): Drawer = withContext(ioDispatcher) {
        call {
            // Insert the drawer row. We capture the returned ID so that if the
            // subsequent fetchDrawer() call fails (e.g. network timeout) we can
            // still recover on retry instead of blindly inserting a duplicate.
            // This RPC inserts and reads the drawer within one database call.
            // It prevents a committed INSERT from being reported as a failed
            // creation when the follow-up detail request cannot be completed.
            val parameters = buildJsonObject {
                put("p_name", name)
                put("p_description", description)
            }

            client.postgrest.rpc("create_drawer", parameters)
                .decodeList<DrawerDto>()
                .firstOrNull()
                ?.toDomain()
                ?: throw DrawerFailure.Unknown()
        }
    }

    override suspend fun updateDrawer(
        drawerId: String,
        name: String,
        description: String?,
        coverPhotoPath: String?,
    ): Drawer = withContext(ioDispatcher) {
        call {
            client.from(TABLE).update(
                if (coverPhotoPath != null) {
                    DrawerUpdateWithCoverDto(
                        name = name,
                        description = description,
                        coverPhotoUrl = coverPhotoPath,
                    )
                } else {
                    DrawerUpdateDto(name = name, description = description)
                },
            ) {
                filter { eq("id", drawerId) }
            }
            fetchDrawer(drawerId)
        }
    }

    override suspend fun deleteDrawer(drawerId: String): Unit = withContext(ioDispatcher) {
        call {
            // Best-effort Storage cleanup; DB cascade removes the photo rows.
            runCatching {
                val photos = client.from(PHOTOS_TABLE)
                    .select { filter { eq("drawer_id", drawerId) } }
                    .decodeList<PhotoDto>()
                val originals = photos.map { it.originalUrl }
                val thumbnails = photos.mapNotNull { it.thumbnailUrl }
                if (originals.isNotEmpty()) client.storage.from(PHOTOS_BUCKET).delete(originals)
                if (thumbnails.isNotEmpty()) client.storage.from(THUMBNAILS_BUCKET).delete(thumbnails)
            }

            client.from(TABLE).delete { filter { eq("id", drawerId) } }
            currentUserId()?.let { userId -> drawerDao.deleteById(userId, drawerId) }
        }
    }

    override suspend fun setCoverPhoto(drawerId: String, coverPhotoPath: String?): Unit =
        withContext(ioDispatcher) {
            call {
                client.from(TABLE)
                    .update(DrawerCoverDto(coverPhotoUrl = coverPhotoPath)) {
                        filter { eq("id", drawerId) }
                    }
            }
        }

    private suspend fun fetchDrawer(drawerId: String): Drawer {
        val parameters = buildJsonObject { put("p_drawer_id", drawerId) }
        val drawer = client.postgrest.rpc("get_drawer", parameters)
            .decodeList<DrawerDto>()
            .firstOrNull()
            ?.toDomain()
            ?: throw DrawerFailure.NotFound
        currentUserId()?.let { userId -> drawerDao.upsertAll(listOf(drawer.toEntity(userId))) }
        return drawer
    }

    private fun currentUserId(): String? = client.auth.currentSessionOrNull()?.user?.id

    private suspend inline fun <T> call(block: () -> T): T = try {
        block()
    } catch (error: Exception) {
        throw error.toDrawerFailure()
    }

    private companion object {
        const val TABLE = "drawers"
        const val PHOTOS_TABLE = "photos"
        const val PHOTOS_BUCKET = "photos"
        const val THUMBNAILS_BUCKET = "thumbnails"
    }
}
