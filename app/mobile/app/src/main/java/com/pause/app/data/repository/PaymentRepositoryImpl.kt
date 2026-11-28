package com.pause.app.data.repository

import com.pause.app.BuildConfig
import com.pause.app.domain.model.PaymentCheckoutInfo
import com.pause.app.domain.model.PaymentStatus
import com.pause.app.domain.repository.PaymentRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.rpc
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import java.net.URLEncoder
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

class PaymentRepositoryImpl(
    private val client: SupabaseClient,
    private val httpClient: HttpClient,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : PaymentRepository {

    private val jsonParser = Json { ignoreUnknownKeys = true }

    override suspend fun createPaymentCheckout(
        paymentType: String,
        referenceId: String,
        amountVnd: Int,
    ): Result<PaymentCheckoutInfo> = withContext(ioDispatcher) {
        runCatching {
            val shortRef = referenceId.take(6).uppercase()
            val orderCode = (System.currentTimeMillis() % 900_000_000L) + 100_000_000L

            // PayOS description: max 25 characters, alphanumeric only
            val transferMemo = when (paymentType) {
                "pause_go" -> "PAUSE GO $shortRef"
                "pause_plus" -> "PAUSE PLUS $shortRef"
                "pause_premium", "membership_yearly" -> "PAUSE VIP $shortRef"
                "membership_monthly" -> "PAUSE VIP $shortRef"
                "single_drawer" -> "PAUSE TU $shortRef"
                else -> "PAUSE IN $shortRef"
            }.take(25)

            val encodedMemo = runCatching { URLEncoder.encode(transferMemo, "UTF-8") }.getOrDefault(transferMemo)
            val encodedAccountName = runCatching { URLEncoder.encode("PAUSE MEMORY STUDIO", "UTF-8") }.getOrDefault("PAUSE%20MEMORY%20STUDIO")

            var vietQrUrl = "https://img.vietqr.io/image/MB-0388888888-compact2.png?amount=$amountVnd&addInfo=$encodedMemo&accountName=$encodedAccountName"
            var checkoutUrl: String? = null
            var bankName = "MB Bank (Quân Đội)"
            var accountNumber = "0388888888"
            var accountHolder = "PAUSE MEMORY STUDIO"
            var transactionId: String? = null

            // 1. If PayOS credentials exist, create REAL payment link via PayOS API
            val payOsClientId = BuildConfig.PAYOS_CLIENT_ID.trim()
            val payOsApiKey = BuildConfig.PAYOS_API_KEY.trim()
            val payOsChecksumKey = BuildConfig.PAYOS_CHECKSUM_KEY.trim()

            if (payOsClientId.isNotBlank() && payOsApiKey.isNotBlank() && payOsChecksumKey.isNotBlank()) {
                runCatching {
                    val cancelUrl = "pause://payment-callback?status=cancelled&orderCode=$orderCode"
                    val returnUrl = "pause://payment-callback?status=success&orderCode=$orderCode"

                    // PayOS sorted signature: amount, cancelUrl, description, orderCode, returnUrl
                    val signData = "amount=$amountVnd&cancelUrl=$cancelUrl&description=$transferMemo&orderCode=$orderCode&returnUrl=$returnUrl"
                    val signature = computeHmacSha256(payOsChecksumKey, signData)

                    val requestBody = buildJsonObject {
                        put("orderCode", orderCode)
                        put("amount", amountVnd)
                        put("description", transferMemo)
                        put("cancelUrl", cancelUrl)
                        put("returnUrl", returnUrl)
                        put("signature", signature)
                    }

                    val response = httpClient.post("https://api-merchant.payos.vn/v2/payment-requests") {
                        contentType(ContentType.Application.Json)
                        header("x-client-id", payOsClientId)
                        header("x-api-key", payOsApiKey)
                        setBody(requestBody.toString())
                    }

                    if (response.status.isSuccess()) {
                        val respJson = jsonParser.parseToJsonElement(response.bodyAsText()).jsonObject
                        val code = respJson["code"]?.jsonPrimitive?.contentOrNull
                        val data = respJson["data"]?.jsonObject
                        if (code == "00" && data != null) {
                            checkoutUrl = data["checkoutUrl"]?.jsonPrimitive?.contentOrNull
                            val payOsQrCode = data["qrCode"]?.jsonPrimitive?.contentOrNull
                            val payOsAccNum = data["accountNumber"]?.jsonPrimitive?.contentOrNull
                            val payOsAccName = data["accountName"]?.jsonPrimitive?.contentOrNull
                            val payOsBin = data["bin"]?.jsonPrimitive?.contentOrNull

                            if (!payOsAccNum.isNullOrBlank()) accountNumber = payOsAccNum
                            if (!payOsAccName.isNullOrBlank()) accountHolder = payOsAccName
                            if (!payOsBin.isNullOrBlank()) {
                                bankName = if (payOsBin == "970422") "MB Bank" else "Ngân hàng liên kết"
                            }
                            if (!payOsQrCode.isNullOrBlank()) {
                                vietQrUrl = "https://img.vietqr.io/image/$payOsBin-$accountNumber-compact2.png?amount=$amountVnd&addInfo=$encodedMemo&accountName=$encodedAccountName"
                            }
                        }
                    }
                }
            }

            // 2. Register transaction in Supabase
            runCatching {
                val params = buildJsonObject {
                    put("p_payment_type", paymentType)
                    put("p_ref_id", referenceId)
                    put("p_amount_vnd", amountVnd)
                    put("p_order_code", orderCode)
                }
                val response = client.postgrest.rpc("create_payment_checkout", params)
                val json = response.decodeAs<JsonObject>()
                transactionId = json["transaction_id"]?.jsonPrimitive?.contentOrNull
            }

            PaymentCheckoutInfo(
                orderCode = orderCode,
                paymentType = paymentType,
                referenceId = referenceId,
                amountVnd = amountVnd,
                transferMemo = transferMemo,
                vietQrUrl = vietQrUrl,
                bankName = bankName,
                accountNumber = accountNumber,
                accountHolder = accountHolder,
                checkoutUrl = checkoutUrl,
                appDeepLink = checkoutUrl ?: "vietqr://transfer?bank=970422&acc=$accountNumber&amount=$amountVnd&memo=$encodedMemo",
                status = PaymentStatus.PENDING,
                transactionId = transactionId,
            )
        }
    }

    override suspend fun checkPaymentStatus(orderCode: Long): Result<PaymentStatus> = withContext(ioDispatcher) {
        runCatching {
            // 1. If PayOS keys are present, check directly with PayOS API
            val payOsClientId = BuildConfig.PAYOS_CLIENT_ID.trim()
            val payOsApiKey = BuildConfig.PAYOS_API_KEY.trim()

            if (payOsClientId.isNotBlank() && payOsApiKey.isNotBlank()) {
                val payOsResult = runCatching {
                    val response = httpClient.get("https://api-merchant.payos.vn/v2/payment-requests/$orderCode") {
                        header("x-client-id", payOsClientId)
                        header("x-api-key", payOsApiKey)
                    }
                    if (response.status.isSuccess()) {
                        val respJson = jsonParser.parseToJsonElement(response.bodyAsText()).jsonObject
                        val data = respJson["data"]?.jsonObject
                        val payOsStatus = data?.get("status")?.jsonPrimitive?.contentOrNull
                        when (payOsStatus) {
                            "PAID" -> {
                                // Real payment confirmed! Notify Supabase to fulfill order/membership
                                runCatching {
                                    val rpcParams = buildJsonObject {
                                        put("p_order_code", orderCode)
                                        put("p_gateway_ref", "PAYOS_VERIFIED")
                                    }
                                    client.postgrest.rpc("complete_payment_transaction", rpcParams)
                                }
                                PaymentStatus.SUCCESS
                            }
                            "CANCELLED" -> PaymentStatus.CANCELLED
                            else -> null
                        }
                    } else null
                }.getOrNull()

                if (payOsResult != null) return@runCatching payOsResult
            }

            // 2. Check Supabase DB status (handles Webhook or RPC completion)
            val params = buildJsonObject {
                put("p_order_code", orderCode)
            }
            val response = client.postgrest.rpc("get_payment_transaction_status", params)
            val json = response.decodeAs<JsonObject>()
            val statusStr = json["status"]?.jsonPrimitive?.contentOrNull

            when (statusStr?.lowercase()) {
                "success" -> PaymentStatus.SUCCESS
                "failed" -> PaymentStatus.FAILED
                "cancelled" -> PaymentStatus.CANCELLED
                else -> PaymentStatus.PENDING
            }
        }
    }

    override suspend fun simulatePaymentSuccess(orderCode: Long): Result<Unit> = withContext(ioDispatcher) {
        runCatching {
            val params = buildJsonObject {
                put("p_order_code", orderCode)
                put("p_gateway_ref", "SANDBOX_SIMULATION_TEST")
            }
            client.postgrest.rpc("complete_payment_transaction", params)
            Unit
        }
    }

    private fun computeHmacSha256(key: String, data: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        val secretKey = SecretKeySpec(key.toByteArray(Charsets.UTF_8), "HmacSHA256")
        mac.init(secretKey)
        val bytes = mac.doFinal(data.toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }
}
