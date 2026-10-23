package com.pause.app.presentation.common.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.text.KeyboardOptions
import com.pause.app.presentation.common.UiText
import com.pause.app.presentation.theme.PauseColors

/** "PAUSE" wordmark used on the auth screens (dark background in Figma). */
@Composable
fun PauseLogo(
    modifier: Modifier = Modifier,
    color: androidx.compose.ui.graphics.Color = PauseColors.Ink,
) {
    Text(
        text = "PAUSE",
        modifier = modifier,
        color = color,
        fontSize = 34.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 10.sp,
        textAlign = TextAlign.Center,
    )
}

@Composable
fun PauseTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    error: UiText? = null,
    enabled: Boolean = true,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    trailingIcon: (@Composable () -> Unit)? = null,
    singleLine: Boolean = true,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        enabled = enabled,
        singleLine = singleLine,
        isError = error != null,
        label = { Text(label) },
        placeholder = placeholder?.let { { Text(it) } },
        trailingIcon = trailingIcon,
        visualTransformation = visualTransformation,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
        supportingText = error?.let {
            {
                Text(
                    text = it.asString(),
                    color = MaterialTheme.colorScheme.error,
                )
            }
        },
        shape = RoundedCornerShape(14.dp),
    )
}

@Composable
fun PausePasswordField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    error: UiText? = null,
    enabled: Boolean = true,
    imeAction: ImeAction = ImeAction.Next,
) {
    var visible by remember { mutableStateOf(false) }
    PauseTextField(
        value = value,
        onValueChange = onValueChange,
        label = label,
        modifier = modifier,
        placeholder = placeholder,
        error = error,
        enabled = enabled,
        keyboardType = KeyboardType.Password,
        imeAction = imeAction,
        visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
        trailingIcon = {
            IconButton(onClick = { visible = !visible }) {
                Icon(
                    imageVector = if (visible) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                    contentDescription = null,
                )
            }
        },
    )
}

@Composable
fun PausePrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    Button(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .height(54.dp),
        enabled = enabled && !loading,
        shape = RoundedCornerShape(999.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = PauseColors.Wine,
            contentColor = androidx.compose.ui.graphics.Color.White,
        ),
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                strokeWidth = 2.dp,
                color = androidx.compose.ui.graphics.Color.White,
            )
        } else {
            Text(text = text, style = MaterialTheme.typography.labelLarge)
        }
    }
}

@Composable
fun PauseTextButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    TextButton(onClick = onClick, modifier = modifier, enabled = enabled) {
        Text(text = text, style = MaterialTheme.typography.labelLarge, color = PauseColors.Wine)
    }
}

/** "Hoặc tiếp tục với" divider. */
@Composable
fun PauseDividerLabel(text: String, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier
                .weight(1f)
                .height(1.dp)
                .background(PauseColors.Line),
        )
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 12.dp),
            style = MaterialTheme.typography.bodyMedium,
            color = PauseColors.Muted,
        )
        Box(
            modifier = Modifier
                .weight(1f)
                .height(1.dp)
                .background(PauseColors.Line),
        )
    }
}

@Composable
fun PauseSocialButton(
    text: String,
    onClick: () -> Unit,
    mark: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp),
        enabled = enabled,
        shape = RoundedCornerShape(999.dp),
    ) {
        Box(
            modifier = Modifier
                .size(22.dp)
                .background(PauseColors.Paper, RoundedCornerShape(999.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Text(text = mark, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = PauseColors.Ink)
        }
        Spacer(modifier = Modifier.size(8.dp))
        Text(text = text, style = MaterialTheme.typography.labelLarge, color = PauseColors.Ink)
    }
}

/** Inline error banner (below the form title). */
@Composable
fun PauseErrorBanner(message: UiText?, modifier: Modifier = Modifier) {
    if (message == null) return
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(PauseColors.Error.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
            .padding(horizontal = 16.dp, vertical = 12.dp),
    ) {
        Text(
            text = message.asString(),
            color = PauseColors.Error,
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}

@Composable
fun PauseSectionHeader(text: String, modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth()) {
        Text(text = text, style = MaterialTheme.typography.titleLarge, color = PauseColors.Ink)
        Spacer(modifier = Modifier.height(4.dp))
    }
}

/** Lightweight bottom toast used instead of SnackbarHost. */
@Composable
fun PauseToast(
    message: String,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier.fillMaxWidth(), contentAlignment = Alignment.BottomCenter) {
        Surface(
            shape = RoundedCornerShape(14.dp),
            color = PauseColors.Ink,
            modifier = Modifier.padding(16.dp),
        ) {
            Text(
                text = message,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                color = androidx.compose.ui.graphics.Color.White,
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}

/** Back arrow + centered title, used by Register / Forgot / Reset screens. */
@Composable
fun PauseAuthTopBar(
    title: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = null,
                tint = PauseColors.Ink,
            )
        }
        Text(
            text = title,
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.titleLarge,
            color = PauseColors.Ink,
            textAlign = TextAlign.Center,
        )
        // Keeps the title visually centered against the back button.
        Spacer(modifier = Modifier.size(48.dp))
    }
}
