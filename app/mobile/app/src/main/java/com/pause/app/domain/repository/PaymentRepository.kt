package com.pause.app.domain.repository

import com.pause.app.domain.model.PaymentCheckoutInfo
import com.pause.app.domain.model.PaymentStatus

/**
 * FR-05 – Payment gateway repository (PayOS / VietQR Open Banking).
 */
interface PaymentRepository {

    /**
     * Initializes a payment checkout transaction in Supabase with a numeric order code.
     */
    suspend fun createPaymentCheckout(
        paymentType: String,
        referenceId: String,
        amountVnd: Int,
    ): Result<PaymentCheckoutInfo>

    /**
     * Checks current transaction status from Supabase (or webhook cache).
     */
    suspend fun checkPaymentStatus(orderCode: Long): Result<PaymentStatus>

    /**
     * Completes transaction via Sandbox Simulation RPC (for demo/testing/grading).
     */
    suspend fun simulatePaymentSuccess(orderCode: Long): Result<Unit>
}

