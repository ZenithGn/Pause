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
 * The cache is a read-through fallback: repositories write the latest server
 * snapshot and serve it when the device is offline (photos are shown through
 * Coil's disk cache + the signed URLs stored here until they expire).
 */
@Entity(tableName = "cached_drawers")
data class DrawerEntity(
    @PrimaryKey val id: String,
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

@Entity(tableName = "cached_photos")
data class PhotoEntity(
    @PrimaryKey val id: String,
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

@Entity(tableName = "cached_shares")
data class ShareEntity(
    @PrimaryKey val id: String,
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

    @Query("SELECT * FROM cached_drawers ORDER BY updatedAtMillis DESC")
    suspend fun getAll(): List<DrawerEntity>

    @Query("SELECT * FROM cached_drawers WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): DrawerEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<DrawerEntity>)

    @Query("DELETE FROM cached_drawers")
    suspend fun clear()

    @Query("DELETE FROM cached_drawers WHERE id = :id")
    suspend fun deleteById(id: String)
}

@Dao
interface PhotoDao {

    @Query("SELECT * FROM cached_photos WHERE drawerId = :drawerId ORDER BY uploadedAtMillis DESC")
    suspend fun getByDrawer(drawerId: String): List<PhotoEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<PhotoEntity>)

    @Query("DELETE FROM cached_photos WHERE drawerId = :drawerId")
    suspend fun deleteByDrawer(drawerId: String)

    @Query("DELETE FROM cached_photos WHERE id = :id")
    suspend fun deleteById(id: String)
}

@Dao
interface ShareDao {

    @Query("SELECT * FROM cached_shares WHERE drawerId = :drawerId")
    suspend fun getByDrawer(drawerId: String): List<ShareEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<ShareEntity>)

    @Query("DELETE FROM cached_shares WHERE drawerId = :drawerId")
    suspend fun deleteByDrawer(drawerId: String)
}

@Database(
    entities = [DrawerEntity::class, PhotoEntity::class, ShareEntity::class],
    version = 1,
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
