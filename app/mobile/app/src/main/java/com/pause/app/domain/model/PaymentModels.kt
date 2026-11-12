package com.pause.app.domain.model

/**
 * Payment status lifecycle for PayOS / VietQR Open Banking.
 */
enum class PaymentStatus {
    PENDING,
    SUCCESS,
    FAILED,
    CANCELLED
}

/**
 * Information needed to render and complete a payment checkout.
 */
data class PaymentCheckoutInfo(
    val orderCode: Long,
    val paymentType: String,
    val referenceId: String,
    val amountVnd: Int,
    val transferMemo: String,
    val vietQrUrl: String,
    val bankName: String = "MB Bank (Quân Đội)",
    val bankCode: String = "MB",
    val accountNumber: String = "0388888888",
    val accountHolder: String = "PAUSE MEMORY STUDIO",
    val checkoutUrl: String? = null,
    val appDeepLink: String? = null,
    val status: PaymentStatus = PaymentStatus.PENDING,
    val transactionId: String? = null,
)

