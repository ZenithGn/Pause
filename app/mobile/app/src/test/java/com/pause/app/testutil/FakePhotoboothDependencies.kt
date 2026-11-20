package com.pause.app.testutil

import com.pause.app.domain.model.OrderStatus
import com.pause.app.domain.model.PhotoboothDraft
import com.pause.app.domain.model.PhotoboothRenderer
import com.pause.app.domain.model.PhotoboothTemplate
import com.pause.app.domain.model.PreviewUploader
import com.pause.app.domain.model.PrintOrder
import com.pause.app.domain.model.ShippingInfo
import com.pause.app.domain.repository.OrderRepository
import com.pause.app.domain.repository.PhotoboothRepository

class FakePhotoboothRepository : PhotoboothRepository {
    val drafts = mutableListOf<PhotoboothDraft>()
    var templates: List<PhotoboothTemplate> = emptyList()

    override suspend fun getActiveTemplates(): List<PhotoboothTemplate> = templates

    override suspend fun getTemplate(templateId: String): PhotoboothTemplate? =
        templates.firstOrNull { it.id == templateId }

    override suspend fun createDraft(
        templateId: String,
        photoIds: List<String>,
        previewUrl: String?,
    ): PhotoboothDraft {
        val draft = PhotoboothDraft("draft-${drafts.size + 1}", templateId, photoIds, previewUrl)
        drafts += draft
        return draft
    }
}

class FakePhotoboothRenderer(
    private val bytes: ByteArray = byteArrayOf(1, 2, 3),
) : PhotoboothRenderer {
    var lastPhotoUrls: List<String> = emptyList()
    var lastCaption: String? = null
    var failure: Throwable? = null

    override suspend fun render(
        template: PhotoboothTemplate,
        photoUrls: List<String>,
        caption: String?,
    ): Result<ByteArray> {
        failure?.let { return Result.failure(it) }
        lastPhotoUrls = photoUrls
        lastCaption = caption
        return Result.success(bytes)
    }
}

class FakePreviewUploader(
    private val url: String = "https://res.cloudinary.com/pause/image/upload/preview.jpg",
) : PreviewUploader {
    var uploadedBytes: ByteArray? = null
    var failure: Throwable? = null

    override suspend fun uploadPreview(byteArray: ByteArray): Result<String> {
        failure?.let { return Result.failure(it) }
        uploadedBytes = byteArray
        return Result.success(url)
    }
}

class FakeOrderRepository : OrderRepository {
    val createdOrders = mutableListOf<PrintOrder>()
    var lastCoverType: String? = null
    var lastPaperType: String? = null

    override suspend fun createOrder(
        photoboothItemId: String,
        quantity: Int,
        unitPriceVnd: Int,
        shipping: ShippingInfo,
        coverType: String,
        paperType: String,
    ): PrintOrder {
        lastCoverType = coverType
        lastPaperType = paperType
        val order = PrintOrder(
            id = "order-${createdOrders.size + 1}",
            userId = "user-id-1",
            photoboothItemId = photoboothItemId,
            quantity = quantity,
            unitPriceVnd = unitPriceVnd,
            totalPriceVnd = unitPriceVnd * quantity,
            shippingName = shipping.name,
            shippingPhone = shipping.phone,
            shippingAddress = shipping.address,
            note = shipping.note.ifBlank { null },
            coverType = coverType,
            paperType = paperType,
            status = OrderStatus.PENDING,
        )
        createdOrders += order
        return order
    }

    override suspend fun getOrders(): List<PrintOrder> = createdOrders.toList()

    override suspend fun getOrder(orderId: String): PrintOrder =
        createdOrders.first { it.id == orderId }

    override suspend fun getOrdersByStatus(status: String): List<PrintOrder> =
        createdOrders.filter { it.status.wire == status }
}
