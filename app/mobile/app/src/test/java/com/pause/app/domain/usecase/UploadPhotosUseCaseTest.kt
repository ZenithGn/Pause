package com.pause.app.domain.usecase

import com.pause.app.domain.model.DrawerFailure
import com.pause.app.domain.repository.RawPhoto
import com.pause.app.testutil.FakePhotoProcessor
import com.pause.app.testutil.FakePhotoRepository
import com.pause.app.testutil.testDrawer
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class UploadPhotosUseCaseTest {

    private val photos = FakePhotoRepository()
    private val processor = FakePhotoProcessor()
    private val useCase = UploadPhotosUseCase(photos, processor)

    private fun raw(count: Int): List<RawPhoto> = List(count) {
        RawPhoto(bytes = ByteArray(2048), mimeType = "image/jpeg")
    }

    @Test
    fun `uploads a batch and reports progress`() = runTest {
        val drawer = testDrawer(storageLimitBytes = 10 * 1024 * 1024)
        val progress = mutableListOf<Pair<Int, Int>>()

        val result = useCase(drawer, raw(3)) { done, total -> progress += done to total }

        val batch = result.getOrThrow()
        assertEquals(3, batch.uploaded.size)
        assertEquals(0, batch.failures.size)
        assertEquals(3, photos.photos.size)
        assertEquals(0, progress.first().first)
        assertEquals(3 to 3, progress.last())
    }

    @Test
    fun `rejects writes on a read-only drawer`() = runTest {
        val drawer = testDrawer(isOwner = false, permission = com.pause.app.domain.model.SharePermission.VIEW)

        val result = useCase(drawer, raw(1))

        assertEquals(DrawerFailure.ReadOnly, result.exceptionOrNull())
    }

    @Test
    fun `rejects a full drawer before processing`() = runTest {
        val drawer = testDrawer(
            storageUsedBytes = 100,
            storageLimitBytes = 100,
        )

        val result = useCase(drawer, raw(1))

        assertTrue(result.exceptionOrNull() is DrawerFailure.StorageFull)
        assertEquals(0, photos.photos.size)
    }

    @Test
    fun `fails photos larger than the compressed limit`() = runTest {
        processor.outputSize = (DrawerLimits.MAX_COMPRESSED_PHOTO_BYTES + 1).toInt()
        val drawer = testDrawer(storageLimitBytes = 100 * 1024 * 1024)

        val result = useCase(drawer, raw(1))

        val batch = result.getOrThrow()
        assertTrue(batch.uploaded.isEmpty())
        assertTrue(batch.failures.single().failure is DrawerFailure.PhotoTooLarge)
    }

    @Test
    fun `stops uploading when the drawer quota would be exceeded`() = runTest {
        processor.outputSize = 1024
        val drawer = testDrawer(
            storageUsedBytes = 0,
            storageLimitBytes = 3_000,
        )

        val result = useCase(drawer, raw(5))

        val batch = result.getOrThrow()
        assertEquals(2, batch.uploaded.size)
        assertEquals(3, batch.failures.size)
        assertTrue(batch.failures.all { it.failure is DrawerFailure.StorageFull })
        assertEquals(3000L - 2 * 1024L, batch.remainingBytes)
    }

    @Test
    fun `reports unsupported formats per photo`() = runTest {
        processor.failure = DrawerFailure.UnsupportedFormat
        val drawer = testDrawer(storageLimitBytes = 10 * 1024 * 1024)

        val result = useCase(drawer, raw(2))

        val batch = result.getOrThrow()
        assertTrue(batch.uploaded.isEmpty())
        assertEquals(2, batch.failures.size)
    }

    @Test
    fun `empty selection is a no-op`() = runTest {
        val result = useCase(testDrawer(), emptyList())

        assertEquals(0, result.getOrThrow().uploaded.size)
    }
}
