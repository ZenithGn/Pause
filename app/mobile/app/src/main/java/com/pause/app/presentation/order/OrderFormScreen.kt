package com.pause.app.presentation.order

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Payment
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.pause.app.R
import com.pause.app.presentation.common.components.PauseErrorBanner
import com.pause.app.presentation.theme.PauseColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderFormScreen(
    state: OrderFormUiState,
    onBack: () -> Unit,
    onNameChange: (String) -> Unit,
    onPhoneChange: (String) -> Unit,
    onAddressChange: (String) -> Unit,
    onNoteChange: (String) -> Unit,
    onIncrementQuantity: () -> Unit,
    onDecrementQuantity: () -> Unit,
    onSubmit: () -> Unit,
) {
    var selectedPaymentMethod by remember { mutableStateOf(0) } // 0 = COD, 1 = Banking QR

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.order_form_title), fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = stringResource(R.string.back))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = PauseColors.Paper),
            )
        },
        bottomBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(PauseColors.Surface)
                    .border(1.dp, PauseColors.Line, RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
                    .padding(horizontal = 20.dp, vertical = 14.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = stringResource(R.string.order_total_amount),
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                        color = PauseColors.Charcoal,
                    )
                    Text(
                        text = stringResource(R.string.order_format_currency, state.grandTotalVnd),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = PauseColors.Wine,
                    )
                }

                Spacer(Modifier.height(10.dp))

                Button(
                    onClick = onSubmit,
                    enabled = !state.isSubmitting,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = PauseColors.Wine,
                        disabledContainerColor = PauseColors.Wine.copy(alpha = 0.5f),
                    ),
                ) {
                    if (state.isSubmitting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = PauseColors.Surface,
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Text(
                            text = stringResource(R.string.order_submit_button),
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = Color.White,
                        )
                    }
                }
            }
        },
        containerColor = PauseColors.Paper,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 12.dp),
        ) {
            state.error?.let {
                PauseErrorBanner(it, Modifier.padding(bottom = 12.dp))
            }

            // --- Product Summary Card ---
            SectionHeader(title = stringResource(R.string.order_summary_section))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(PauseColors.Surface)
                    .border(1.dp, PauseColors.Line, RoundedCornerShape(14.dp))
                    .padding(14.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(PauseColors.CategoryBg),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (state.previewUrl != null && state.previewUrl.isNotBlank()) {
                            AsyncImage(
                                model = state.previewUrl,
                                contentDescription = null,
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop,
                            )
                        } else {
                            Icon(
                                Icons.Filled.Image,
                                contentDescription = null,
                                tint = PauseColors.Muted,
                                modifier = Modifier.size(28.dp),
                            )
                        }
                    }

                    Spacer(Modifier.width(14.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = state.templateName.ifBlank { "Photobooth Strip" },
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = PauseColors.Ink,
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = stringResource(R.string.photobooth_slot_count, state.slotCount),
                            style = MaterialTheme.typography.bodySmall,
                            color = PauseColors.Muted,
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = stringResource(R.string.order_format_currency, state.unitPriceVnd),
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = PauseColors.Wine,
                        )
                    }

                    // Quantity selector
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(PauseColors.CategoryBg)
                            .padding(horizontal = 4.dp, vertical = 2.dp),
                    ) {
                        IconButton(
                            onClick = onDecrementQuantity,
                            modifier = Modifier.size(28.dp),
                            enabled = state.quantity > 1,
                        ) {
                            Icon(Icons.Filled.Remove, null, modifier = Modifier.size(16.dp))
                        }
                        Text(
                            text = state.quantity.toString(),
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp),
                        )
                        IconButton(
                            onClick = onIncrementQuantity,
                            modifier = Modifier.size(28.dp),
                        ) {
                            Icon(Icons.Filled.Add, null, modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }

            Spacer(Modifier.height(18.dp))

            // --- Recipient Information ---
            SectionHeader(title = stringResource(R.string.order_recipient_section))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(PauseColors.Surface)
                    .border(1.dp, PauseColors.Line, RoundedCornerShape(14.dp))
                    .padding(14.dp),
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = state.shippingName,
                        onValueChange = onNameChange,
                        label = { Text(stringResource(R.string.order_recipient_name)) },
                        leadingIcon = { Icon(Icons.Filled.Person, null, tint = PauseColors.Wine) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        colors = outlinedFieldColors(),
                        shape = RoundedCornerShape(10.dp),
                    )

                    OutlinedTextField(
                        value = state.shippingPhone,
                        onValueChange = onPhoneChange,
                        label = { Text(stringResource(R.string.order_recipient_phone)) },
                        leadingIcon = { Icon(Icons.Filled.Phone, null, tint = PauseColors.Wine) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        colors = outlinedFieldColors(),
                        shape = RoundedCornerShape(10.dp),
                    )

                    OutlinedTextField(
                        value = state.shippingAddress,
                        onValueChange = onAddressChange,
                        label = { Text(stringResource(R.string.order_recipient_address)) },
                        leadingIcon = { Icon(Icons.Filled.LocationOn, null, tint = PauseColors.Wine) },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                        colors = outlinedFieldColors(),
                        shape = RoundedCornerShape(10.dp),
                    )

                    OutlinedTextField(
                        value = state.note,
                        onValueChange = onNoteChange,
                        label = { Text(stringResource(R.string.order_recipient_notes)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        colors = outlinedFieldColors(),
                        shape = RoundedCornerShape(10.dp),
                    )
                }
            }

            Spacer(Modifier.height(18.dp))

            // --- Payment Method ---
            SectionHeader(title = stringResource(R.string.order_payment_section))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(PauseColors.Surface)
                    .border(1.dp, PauseColors.Line, RoundedCornerShape(14.dp))
                    .padding(14.dp),
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    PaymentOptionRow(
                        title = stringResource(R.string.order_payment_cod),
                        subtitle = "Thanh toán bằng tiền mặt khi nhận hàng",
                        selected = selectedPaymentMethod == 0,
                        onClick = { selectedPaymentMethod = 0 },
                    )
                    HorizontalDivider(color = PauseColors.Line)
                    PaymentOptionRow(
                        title = stringResource(R.string.order_payment_bank),
                        subtitle = "Chuyển khoản qua mã VietQR tiện lợi",
                        selected = selectedPaymentMethod == 1,
                        onClick = { selectedPaymentMethod = 1 },
                    )
                }
            }

            Spacer(Modifier.height(18.dp))

            // --- Price Breakdown ---
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(PauseColors.Surface)
                    .border(1.dp, PauseColors.Line, RoundedCornerShape(14.dp))
                    .padding(14.dp),
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    PriceRow(
                        label = stringResource(R.string.order_subtotal),
                        value = stringResource(R.string.order_format_currency, state.totalPriceVnd),
                    )
                    PriceRow(
                        label = stringResource(R.string.order_shipping_fee),
                        value = stringResource(R.string.order_format_currency, state.shippingFeeVnd),
                    )
                    HorizontalDivider(color = PauseColors.Line, modifier = Modifier.padding(vertical = 4.dp))
                    PriceRow(
                        label = stringResource(R.string.order_total_amount),
                        value = stringResource(R.string.order_format_currency, state.grandTotalVnd),
                        isBold = true,
                    )
                }
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleSmall,
        fontWeight = FontWeight.Bold,
        color = PauseColors.Ink,
        modifier = Modifier.padding(bottom = 8.dp),
    )
}

@Composable
private fun PaymentOptionRow(
    title: String,
    subtitle: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RadioButton(
            selected = selected,
            onClick = onClick,
            colors = RadioButtonDefaults.colors(selectedColor = PauseColors.Wine),
        )
        Spacer(Modifier.width(8.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.SemiBold, color = PauseColors.Ink)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = PauseColors.Muted)
        }
    }
}

@Composable
private fun PriceRow(label: String, value: String, isBold: Boolean = false) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = if (isBold) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.Normal,
            color = if (isBold) PauseColors.Ink else PauseColors.Muted,
        )
        Text(
            text = value,
            style = if (isBold) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.Medium,
            color = if (isBold) PauseColors.Wine else PauseColors.Ink,
        )
    }
}

@Composable
private fun outlinedFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = PauseColors.Wine,
    unfocusedBorderColor = PauseColors.Line,
    focusedLabelColor = PauseColors.Wine,
)
