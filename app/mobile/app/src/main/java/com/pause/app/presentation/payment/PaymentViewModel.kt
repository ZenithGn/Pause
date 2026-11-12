package com.pause.app.presentation.payment

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pause.app.domain.model.PaymentCheckoutInfo
import com.pause.app.domain.model.PaymentStatus
import com.pause.app.domain.repository.PaymentRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

data class PaymentUiState(
    val isLoading: Boolean = false,
    val isSimulating: Boolean = false,
    val checkoutInfo: PaymentCheckoutInfo? = null,
    val status: PaymentStatus = PaymentStatus.PENDING,
    val remainingSeconds: Int = 10 * 60,
    val errorMessage: String? = null,
    val copiedLabel: String? = null,
)

class PaymentViewModel(
    private val paymentRepository: PaymentRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(PaymentUiState())
    val uiState: StateFlow<PaymentUiState> = _uiState.asStateFlow()

    private var pollingJob: Job? = null
    private var timerJob: Job? = null

    fun initializePayment(paymentType: String, referenceId: String, amountVnd: Int) {
        if (_uiState.value.checkoutInfo != null) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            val result = paymentRepository.createPaymentCheckout(paymentType, referenceId, amountVnd)
            result.onSuccess { info ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        checkoutInfo = info,
                        status = PaymentStatus.PENDING,
                        remainingSeconds = 10 * 60,
                    )
                }
                startCountdownTimer()
                startAutoPolling(info.orderCode)
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = err.localizedMessage ?: "Không thể tạo mã thanh toán",
                    )
                }
            }
        }
    }

    private fun startCountdownTimer() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (isActive && _uiState.value.remainingSeconds > 0 && _uiState.value.status == PaymentStatus.PENDING) {
                delay(1_000)
                _uiState.update { it.copy(remainingSeconds = (it.remainingSeconds - 1).coerceAtLeast(0)) }
            }
            if (_uiState.value.remainingSeconds == 0 && _uiState.value.status == PaymentStatus.PENDING) {
                _uiState.update { it.copy(status = PaymentStatus.CANCELLED) }
            }
        }
    }

    private fun startAutoPolling(orderCode: Long) {
        pollingJob?.cancel()
        pollingJob = viewModelScope.launch {
            while (isActive && _uiState.value.status == PaymentStatus.PENDING && _uiState.value.remainingSeconds > 0) {
                delay(2_500)
                checkPaymentStatus(orderCode)
            }
        }
    }

    fun checkStatusNow() {
        val orderCode = _uiState.value.checkoutInfo?.orderCode ?: return
        if (_uiState.value.status == PaymentStatus.PENDING) {
            viewModelScope.launch {
                checkPaymentStatus(orderCode)
            }
        }
    }

    private suspend fun checkPaymentStatus(orderCode: Long) {
        val result = paymentRepository.checkPaymentStatus(orderCode)
        result.onSuccess { status ->
            if (status == PaymentStatus.SUCCESS) {
                _uiState.update { it.copy(status = PaymentStatus.SUCCESS) }
                pollingJob?.cancel()
                timerJob?.cancel()
            } else if (status == PaymentStatus.FAILED || status == PaymentStatus.CANCELLED) {
                _uiState.update { it.copy(status = status) }
                pollingJob?.cancel()
            }
        }
    }

    fun openBankingApp(context: Context) {
        val info = _uiState.value.checkoutInfo ?: return

        // 1. Copy memo & account number to clipboard for immediate convenience
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
        val clip = ClipData.newPlainText("Pause Memo", "${info.accountNumber} - ${info.transferMemo}")
        clipboard?.setPrimaryClip(clip)

        // 2. Open PayOS checkoutUrl (auto bank app chooser) or VietQR URL
        val targetUrl = info.checkoutUrl?.takeIf { it.isNotBlank() } ?: info.vietQrUrl
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(targetUrl)).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            Toast.makeText(context, "Đã mở cổng thanh toán & sao chép thông tin CK", Toast.LENGTH_SHORT).show()
        } catch (_: Exception) {
            try {
                val fallbackIntent = Intent(Intent.ACTION_VIEW, Uri.parse(info.vietQrUrl)).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(fallbackIntent)
            } catch (err: Exception) {
                Toast.makeText(context, "Không thể mở ứng dụng: ${err.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    fun copyToClipboard(context: Context, text: String, label: String) {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
        clipboard?.setPrimaryClip(ClipData.newPlainText(label, text))
        _uiState.update { it.copy(copiedLabel = label) }

        viewModelScope.launch {
            delay(2_000)
            _uiState.update { it.copy(copiedLabel = null) }
        }
    }

    fun simulatePaymentSuccess() {
        val orderCode = _uiState.value.checkoutInfo?.orderCode ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isSimulating = true) }
            val result = paymentRepository.simulatePaymentSuccess(orderCode)
            result.onSuccess {
                _uiState.update {
                    it.copy(
                        isSimulating = false,
                        status = PaymentStatus.SUCCESS,
                    )
                }
                pollingJob?.cancel()
                timerJob?.cancel()
            }.onFailure {
                // If RPC fails (e.g. mock mode), mark success locally
                _uiState.update {
                    it.copy(
                        isSimulating = false,
                        status = PaymentStatus.SUCCESS,
                    )
                }
                pollingJob?.cancel()
                timerJob?.cancel()
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        pollingJob?.cancel()
        timerJob?.cancel()
    }
}

