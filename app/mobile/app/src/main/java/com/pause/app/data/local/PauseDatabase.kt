package com.pause.app.data.local

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase

/**
 * T-02.10 – Room offline cache for the Memory Drawers module.
 *
 * IMPORTANT: every row is scoped by `userId` (the signed-in Supabase user).
 * The cache is never shared between accounts — otherwise signing in with another
 * account on the same device would leak the previous user's drawers/photos.
 */
@Entity(tableName = "cached_drawers", primaryKeys = ["userId", "id"])
data class DrawerEntity(
    val userId: String,
    val id: String,
    val ownerId: String,
    val ownerName: String,
    val name: String,
    val description: String?,
    val coverPhotoPath: String?,
    val storageUsedBytes: Long,
    val storageLimitBytes: Long,
    val photoCount: Int,
    val isPurchased: Boolean,
    val isOwner: Boolean,
    val permission: String,
    val updatedAtMillis: Long,
)

@Entity(tableName = "cached_photos", primaryKeys = ["userId", "id"])
data class PhotoEntity(
    val userId: String,
    val id: String,
    val drawerId: String,
    val uploadedBy: String,
    val originalPath: String,
    val thumbnailPath: String?,
    val sizeBytes: Long,
    val mimeType: String,
    val width: Int?,
    val height: Int?,
    val uploadedAtMillis: Long,
)

@Entity(tableName = "cached_shares", primaryKeys = ["userId", "id"])
data class ShareEntity(
    val userId: String,
    val id: String,
    val drawerId: String,
    val sharedWithId: String,
    val email: String,
    val displayName: String,
    val permission: String,
    val status: String,
    val createdAtMillis: Long,
)

@Dao
interface DrawerDao {

    @Query("SELECT * FROM cached_drawers WHERE userId = :userId ORDER BY updatedAtMillis DESC")
    suspend fun getAll(userId: String): List<DrawerEntity>

    @Query("SELECT * FROM cached_drawers WHERE userId = :userId AND id = :id LIMIT 1")
    suspend fun getById(userId: String, id: String): DrawerEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<DrawerEntity>)

    @Query("DELETE FROM cached_drawers WHERE userId = :userId")
    suspend fun clear(userId: String)

    @Query("DELETE FROM cached_drawers WHERE userId = :userId AND id = :id")
    suspend fun deleteById(userId: String, id: String)

    @Query("DELETE FROM cached_drawers")
    suspend fun clearAll()
}

@Dao
interface PhotoDao {

    @Query("SELECT * FROM cached_photos WHERE userId = :userId AND drawerId = :drawerId ORDER BY uploadedAtMillis DESC")
    suspend fun getByDrawer(userId: String, drawerId: String): List<PhotoEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<PhotoEntity>)

    @Query("DELETE FROM cached_photos WHERE userId = :userId AND drawerId = :drawerId")
    suspend fun deleteByDrawer(userId: String, drawerId: String)

    @Query("DELETE FROM cached_photos WHERE userId = :userId AND id = :id")
    suspend fun deleteById(userId: String, id: String)

    @Query("DELETE FROM cached_photos")
    suspend fun clearAll()
}

@Dao
interface ShareDao {

    @Query("SELECT * FROM cached_shares WHERE userId = :userId AND drawerId = :drawerId")
    suspend fun getByDrawer(userId: String, drawerId: String): List<ShareEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<ShareEntity>)

    @Query("DELETE FROM cached_shares WHERE userId = :userId AND drawerId = :drawerId")
    suspend fun deleteByDrawer(userId: String, drawerId: String)

    @Query("DELETE FROM cached_shares")
    suspend fun clearAll()
}

@Database(
    entities = [DrawerEntity::class, PhotoEntity::class, ShareEntity::class],
    version = 2,
    exportSchema = false,
)
abstract class PauseDatabase : RoomDatabase() {

    abstract fun drawerDao(): DrawerDao

    abstract fun photoDao(): PhotoDao

    abstract fun shareDao(): ShareDao

    companion object {
        const val NAME = "pause-cache.db"
    }
}
