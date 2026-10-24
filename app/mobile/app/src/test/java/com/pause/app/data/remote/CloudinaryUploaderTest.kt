package com.pause.app.data.remote

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CloudinaryUploaderTest {

    @Test
    fun `thumbnailUrl transforms standard Cloudinary secure_url`() {
        val original = "https://res.cloudinary.com/mycloud/image/upload/v123456789/pause/photos/drawer-1/photo-1.jpg"
        val expected = "https://res.cloudinary.com/mycloud/image/upload/w_480,q_70,c_limit,f_auto/v123456789/pause/photos/drawer-1/photo-1.jpg"

        val actual = CloudinaryUploader.thumbnailUrl(original)

        assertEquals(expected, actual)
    }

    @Test
    fun `thumbnailUrl respects custom dimensions and quality`() {
        val original = "https://res.cloudinary.com/mycloud/image/upload/pause/photo.jpg"
        val expected = "https://res.cloudinary.com/mycloud/image/upload/w_200,q_50,c_limit,f_auto/pause/photo.jpg"

        val actual = CloudinaryUploader.thumbnailUrl(original, width = 200, quality = 50)

        assertEquals(expected, actual)
    }

    @Test
    fun `thumbnailUrl returns original when marker is not present`() {
        val original = "https://other-storage.com/photos/photo-1.jpg"

        val actual = CloudinaryUploader.thumbnailUrl(original)

        assertEquals(original, actual)
    }

    @Test
    fun `isCloudinaryUrl detects Cloudinary URLs correctly`() {
        assertTrue(CloudinaryUploader.isCloudinaryUrl("https://res.cloudinary.com/demo/image/upload/sample.jpg"))
        assertFalse(CloudinaryUploader.isCloudinaryUrl("drawer-1/photo-1.jpg"))
        assertFalse(CloudinaryUploader.isCloudinaryUrl("https://supabase.co/storage/v1/object/public/photos/pic.jpg"))
    }
}
