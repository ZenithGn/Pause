package com.pause.app.presentation.order

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pause.app.R
import com.pause.app.domain.model.ShippingInfo
import com.pause.app.domain.usecase.CreateOrderUseCase
import com.pause.app.domain.usecase.GetOrderDetailUseCase
import com.pause.app.domain.usecase.GetOrdersUseCase
import com.pause.app.presentation.common.UiText
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class OrderViewModel(
    private val createOrderUseCase: CreateOrderUseCase,
    private val getOrdersUseCase: GetOrdersUseCase,
    private val getOrderDetailUseCase: GetOrderDetailUseCase,
) : ViewModel() {

    // --- Order Form State ---
    private val _formState = MutableStateFlow(OrderFormUiState())
    val formState: StateFlow<OrderFormUiState> = _formState.asStateFlow()

    // --- Order List State ---
    private val _listState = MutableStateFlow(OrderListUiState())
    val listState: StateFlow<OrderListUiState> = _listState.asStateFlow()

    // --- Order Detail State ---
    private val _detailState = MutableStateFlow(OrderDetailUiState())
    val detailState: StateFlow<OrderDetailUiState> = _detailState.asStateFlow()

    fun initOrderForm(
        itemId: String,
        templateName: String = "Photobooth Strip",
        previewUrl: String? = null,
        slotCount: Int = 4,
        unitPriceVnd: Int = 25_000,
    ) {
        _formState.update {
            it.copy(
                photoboothItemId = itemId,
                templateName = templateName,
                previewUrl = previewUrl,
                slotCount = slotCount,
                unitPriceVnd = unitPriceVnd,
                quantity = 1,
                error = null,
                createdOrder = null,
                isSubmitting = false,
            )
        }
    }

    fun onShippingNameChanged(name: String) {
        _formState.update { it.copy(shippingName = name, error = null) }
    }

    fun onShippingPhoneChanged(phone: String) {
        _formState.update { it.copy(shippingPhone = phone, error = null) }
    }

    fun onShippingAddressChanged(address: String) {
        _formState.update { it.copy(shippingAddress = address, error = null) }
    }

    fun onNoteChanged(note: String) {
        _formState.update { it.copy(note = note) }
    }

    fun onCoverTypeChanged(coverType: String) {
        _formState.update { it.copy(coverType = coverType) }
    }

    fun onPaperTypeChanged(paperType: String) {
        _formState.update { it.copy(paperType = paperType) }
    }

    fun incrementQuantity() {
        _formState.update { it.copy(quantity = (it.quantity + 1).coerceAtMost(99)) }
    }

    fun decrementQuantity() {
        _formState.update { it.copy(quantity = (it.quantity - 1).coerceAtLeast(1)) }
    }

    fun submitOrder(onSuccess: (orderId: String) -> Unit) {
        val current = _formState.value
        if (current.shippingName.isBlank()) {
            _formState.update { it.copy(error = UiText.Resource(R.string.order_error_name_required)) }
            return
        }
        val cleanPhone = current.shippingPhone.trim()
        if (cleanPhone.length !in 10..11 || !cleanPhone.all { it.isDigit() }) {
            _formState.update { it.copy(error = UiText.Resource(R.string.order_error_phone_invalid)) }
            return
        }
        if (current.shippingAddress.isBlank()) {
            _formState.update { it.copy(error = UiText.Resource(R.string.order_error_address_required)) }
            return
        }

        viewModelScope.launch {
            _formState.update { it.copy(isSubmitting = true, error = null) }
            runCatching {
                createOrderUseCase(
                    photoboothItemId = current.photoboothItemId,
                    quantity = current.quantity,
                    unitPriceVnd = current.effectiveUnitPriceVnd,
                    shipping = ShippingInfo(
                        name = current.shippingName.trim(),
                        phone = cleanPhone,
                        address = current.shippingAddress.trim(),
                        note = current.note.trim(),
                    ),
                    coverType = current.coverType,
                    paperType = current.paperType,
                )
            }.onSuccess { created ->
                _formState.update { it.copy(isSubmitting = false, createdOrder = created) }
                onSuccess(created.id)
            }.onFailure { err ->
                _formState.update {
                    it.copy(
                        isSubmitting = false,
                        error = err.message?.let { msg -> UiText.Dynamic(msg) }
                            ?: UiText.Resource(R.string.order_error_submit),
                    )
                }
            }
        }
    }

    // --- Order List ---
    fun loadOrders() {
        viewModelScope.launch {
            _listState.update { it.copy(isLoading = true, error = null) }
            runCatching { getOrdersUseCase() }
                .onSuccess { orders ->
                    _listState.update { it.copy(isLoading = false, orders = orders) }
                }
                .onFailure {
                    _listState.update {
                        it.copy(
                            isLoading = false,
                            error = UiText.Resource(R.string.error_network),
                        )
                    }
                }
        }
    }

    fun setFilter(filter: OrderFilter) {
        _listState.update { it.copy(selectedFilter = filter) }
    }

    // --- Order Detail ---
    fun loadOrderDetail(orderId: String) {
        viewModelScope.launch {
            _detailState.update { it.copy(isLoading = true, error = null) }
            runCatching { getOrderDetailUseCase(orderId) }
                .onSuccess { order ->
                    _detailState.update { it.copy(isLoading = false, order = order) }
                }
                .onFailure {
                    _detailState.update {
                        it.copy(
                            isLoading = false,
                            error = UiText.Resource(R.string.error_network),
                        )
                    }
                }
        }
    }
}
