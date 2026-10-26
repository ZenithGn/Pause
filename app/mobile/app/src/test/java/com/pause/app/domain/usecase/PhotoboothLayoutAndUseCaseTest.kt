package com.pause.app.domain.usecase

import com.pause.app.domain.model.PhotoboothTemplate
import com.pause.app.domain.model.ShippingInfo
import com.pause.app.domain.model.parseTemplateLayout
import com.pause.app.testutil.FakeOrderRepository
import com.pause.app.testutil.FakePhotoboothRenderer
import com.pause.app.testutil.FakePhotoboothRepository
import com.pause.app.testutil.FakePreviewUploader
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PhotoboothLayoutAndUseCaseTest {

    private val template = PhotoboothTemplate(
        id = "tpl-1",
        name = "Classic White",
        category = "couple",
        previewPath = "https://cdn/preview.jpg",
        slotCount = 2,
        isPremium = false,
        layoutConfig = parseTemplateLayout(
            """{"width":1200,"height":1800,"background_color":"#fff",
               "slots":[{"index":0,"x":0,"y":0,"width":600,"height":600},
                        {"index":1,"x":600,"y":0,"width":600,"height":600}],
               "texts":[{"content":"Pause","x":600,"y":1700,"font_size":48}]}""",
        ),
    )

    @Test
    fun `layout config is parsed with slots and texts`() {
        val layout = template.layoutConfig
        assertNotNull(layout)
        assertEquals(1200, layout!!.width)
        assertEquals(2, layout.slots.size)
        assertEquals("Pause", layout.texts.single().content)
    }

    @Test
    fun `invalid layout json returns null`() {
        assertNull(parseTemplateLayout("{not-json"))
        assertNull(parseTemplateLayout(null))
    }

    @Test
    fun `create photobooth renders uploads and persists preview url`() = runTest {
        val repo = FakePhotoboothRepository()
        val renderer = FakePhotoboothRenderer()
        val uploader = FakePreviewUploader()
        val useCase = CreatePhotoboothUseCase(repo, renderer, uploader)

        val result = useCase(
            template = template,
            photoIds = listOf("photo-1", "photo-2"),
            photoUrls = listOf("https://cdn/1.jpg", "https://cdn/2.jpg"),
            caption = "Đà Lạt 2026",
        ).getOrThrow()

        assertEquals("https://res.cloudinary.com/pause/image/upload/preview.jpg", result.previewUrl)
        assertEquals(listOf("https://cdn/1.jpg", "https://cdn/2.jpg"), renderer.lastPhotoUrls)
        assertEquals("Đà Lạt 2026", renderer.lastCaption)
        assertEquals("draft-1", repo.drafts.single().id)
        assertEquals(result.previewUrl, repo.drafts.single().previewUrl)
    }

    @Test
    fun `wrong number of photos fails before rendering`() = runTest {
        val renderer = FakePhotoboothRenderer()
        val useCase = CreatePhotoboothUseCase(FakePhotoboothRepository(), renderer, FakePreviewUploader())

        val result = useCase(template, listOf("photo-1"), listOf("https://cdn/1.jpg"))

        assertTrue(result.isFailure)
        assertTrue(renderer.lastPhotoUrls.isEmpty())
    }
}

class CreateOrderUseCaseTest {

    private val repository = FakeOrderRepository()
    private val useCase = CreateOrderUseCase(repository)
    private val shipping = ShippingInfo("Nguyễn Văn A", "0912345678", "123 Đà Lạt")

    @Test
    fun `valid order is created with product options`() = runTest {
        val order = useCase(
            photoboothItemId = "draft-1",
            quantity = 2,
            unitPriceVnd = 50_000,
            shipping = shipping,
            coverType = "hard",
            paperType = "premium",
        )

        assertEquals(2, order.quantity)
        assertEquals(100_000, order.totalPriceVnd)
        assertEquals("hard", repository.lastCoverType)
        assertEquals("premium", repository.lastPaperType)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `invalid quantity is rejected`() = runTest {
        useCase("draft-1", 0, 50_000, shipping)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `invalid cover type is rejected`() = runTest {
        useCase("draft-1", 1, 50_000, shipping, coverType = "gold")
    }

    @Test(expected = IllegalArgumentException::class)
    fun `missing shipping name is rejected`() = runTest {
        useCase("draft-1", 1, 50_000, shipping.copy(name = " "))
    }
}
