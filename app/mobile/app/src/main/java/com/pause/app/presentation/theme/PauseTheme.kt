package com.pause.app.presentation.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * Pause design system.
 *
 * Observed from the Figma "demo-UI" file (docs/03-References/screen-inventory.md):
 * grayscale-dominant, minimalist, dark logo area + light form area.
 */
object PauseColors {
    val Ink = Color(0xFF111111)
    val Charcoal = Color(0xFF2B2B2B)
    val Paper = Color(0xFFF7F6F5)
    val Surface = Color(0xFFFFFFFF)
    val Muted = Color(0xFF6B6B6B)
    val Line = Color(0xFFE5E2DF)
    val Error = Color(0xFFB3261E)

    /** Figma accent – deep wine red (#630D11). */
    val Wine = Color(0xFF630D11)
    val WineLight = Color(0xFFFDF2F2)
    val BannerBg = Color(0xFFF5F0EB)
    val CategoryBg = Color(0xFFF0EDEA)
    val SearchBg = Color(0xFFF2F0EE)
    val BlueBadge = Color(0xFF2962FF)
}

private val PauseColorScheme = lightColorScheme(
    // #630D11 is the product accent supplied with the Figma reference.
    // Ink remains reserved for typography and the authentication hero.
    primary = PauseColors.Wine,
    onPrimary = Color.White,
    primaryContainer = PauseColors.WineLight,
    onPrimaryContainer = Color.White,
    secondary = PauseColors.Muted,
    onSecondary = Color.White,
    background = PauseColors.Paper,
    onBackground = PauseColors.Ink,
    surface = PauseColors.Surface,
    onSurface = PauseColors.Ink,
    surfaceVariant = PauseColors.Paper,
    onSurfaceVariant = PauseColors.Muted,
    outline = PauseColors.Line,
    error = PauseColors.Error,
    onError = Color.White,
)

private val PauseTypography = Typography(
    displaySmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 36.sp,
        letterSpacing = 10.sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
    ),
    headlineSmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 22.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        letterSpacing = 0.4.sp,
    ),
)

@Composable
fun PauseTheme(content: @Composable () -> Unit) {
    // Brand is intentionally light-only for the MVP.
    MaterialTheme(
        colorScheme = PauseColorScheme,
        typography = PauseTypography,
        content = content,
    )
}
