package com.pause.app.domain.repository

import com.pause.app.domain.model.Drawer

/** FR-02.1 → FR-02.4 – drawer CRUD, scoped by RLS on the server. */
interface DrawerRepository {

    /** Owned + shared drawers for the signed-in user (one RPC round trip). */
    suspend fun listDrawers(): List<Drawer>

    /** Single drawer the caller can access. */
    suspend fun getDrawer(drawerId: String): Drawer

    suspend fun ownedDrawerCount(ownerId: String): Int

    suspend fun createDrawer(ownerId: String, name: String, description: String?): Drawer

    suspend fun updateDrawer(
        drawerId: String,
        name: String,
        description: String?,
        coverPhotoPath: String? = null,
    ): Drawer

    /** Deletes the drawer row and best-effort removes its Storage objects. */
    suspend fun deleteDrawer(drawerId: String)

    suspend fun setCoverPhoto(drawerId: String, coverPhotoPath: String?)
}
