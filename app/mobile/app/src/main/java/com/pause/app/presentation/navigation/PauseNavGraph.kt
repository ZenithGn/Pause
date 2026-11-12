package com.pause.app.presentation.navigation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.pause.app.presentation.auth.AuthEvent
import com.pause.app.presentation.auth.AuthViewModel
import com.pause.app.presentation.auth.ForgotPasswordScreen
import com.pause.app.presentation.auth.LoginScreen
import com.pause.app.presentation.auth.RegisterScreen
import com.pause.app.presentation.auth.ResetPasswordScreen
import com.pause.app.presentation.common.UiText
import com.pause.app.presentation.common.components.PauseTab
import com.pause.app.presentation.common.components.PauseToast
import com.pause.app.presentation.drawer.CreateDrawerSheet
import com.pause.app.presentation.drawer.DrawerDetailScreen
import com.pause.app.presentation.drawer.DrawerDetailViewModel
import com.pause.app.presentation.drawer.DrawerListScreen
import com.pause.app.presentation.drawer.DrawerListViewModel
import com.pause.app.presentation.home.HomeScreen
import com.pause.app.presentation.notification.NotificationListScreen
import com.pause.app.presentation.notification.NotificationViewModel
import com.pause.app.presentation.payment.PaymentFailedScreen
import com.pause.app.presentation.payment.PaymentQrScreen
import com.pause.app.presentation.profile.ProfileScreen
import com.pause.app.presentation.profile.ProfileViewModel
import com.pause.app.presentation.order.OrderConfirmScreen
import com.pause.app.presentation.order.OrderDetailScreen
import com.pause.app.presentation.order.OrderFormScreen
import com.pause.app.presentation.order.OrderListScreen
import com.pause.app.presentation.order.OrderViewModel
import com.pause.app.presentation.photobooth.PhotoboothPreviewScreen
import com.pause.app.presentation.photobooth.PhotoboothViewModel
import com.pause.app.presentation.photobooth.SelectPhotosScreen
import com.pause.app.presentation.photobooth.TemplateListScreen
import com.pause.app.presentation.share.ShareDrawerScreen
import com.pause.app.presentation.share.ShareDrawerViewModel
import com.pause.app.presentation.splash.SplashScreen
import com.pause.app.presentation.splash.SplashViewModel
import com.pause.app.presentation.upgrade.UpgradeScreen
import kotlinx.coroutines.delay
import org.koin.androidx.compose.koinViewModel
import org.koin.core.parameter.parametersOf

/** Navigation graph: auth flow + FR-02 drawer flow + FR-03 photobooth & order flow. */
object Routes {
    const val SPLASH = "splash"
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val FORGOT_PASSWORD = "forgot_password"
    const val RESET_PASSWORD = "reset_password"
    const val HOME = "home"
    const val MEMORIES = "memories"
    const val EXPLORE = "explore"
    const val DRAWER_DETAIL = "drawer/{drawerId}"
    const val SHARE_DRAWER = "drawer/{drawerId}/share"
    const val PROFILE = "profile"
    const val PHOTOBOOTH_TEMPLATES = "photobooth/templates"
    const val PHOTOBOOTH_PHOTOS = "photobooth/photos"
    const val PHOTOBOOTH_PREVIEW = "photobooth/preview"
    const val ORDER_FORM = "order/form/{itemId}"
    const val ORDER_CONFIRM = "order/confirm/{orderId}"
    const val ORDER_LIST = "order/list"
    const val ORDER_DETAIL = "order/detail/{orderId}"
    const val UPGRADE = "upgrade"
    const val NOTIFICATIONS = "notifications"
    const val PAYMENT_QR = "payment/qr/{paymentType}/{refId}/{amountVnd}"
    const val PAYMENT_FAILED = "payment/failed/{paymentType}/{refId}/{amountVnd}"

    fun drawerDetail(drawerId: String) = "drawer/$drawerId"
    fun shareDrawer(drawerId: String) = "drawer/$drawerId/share"
    fun orderForm(itemId: String) = "order/form/$itemId"
    fun orderConfirm(orderId: String) = "order/confirm/$orderId"
    fun orderDetail(orderId: String) = "order/detail/$orderId"
    fun paymentQr(paymentType: String, refId: String, amountVnd: Int) =
        "payment/qr/$paymentType/$refId/$amountVnd"
    fun paymentFailed(paymentType: String, refId: String, amountVnd: Int) =
        "payment/failed/$paymentType/$refId/$amountVnd"
}

@Composable
fun PauseNavGraph(
    authViewModel: AuthViewModel,
    profileViewModel: ProfileViewModel,
    splashViewModel: SplashViewModel,
    deepLinkUri: String?,
    onDeepLinkConsumed: () -> Unit,
) {
    val navController = rememberNavController()
    val authState by authViewModel.state.collectAsStateWithLifecycle()
    val profileState by profileViewModel.state.collectAsStateWithLifecycle()
    val signedIn by splashViewModel.isSignedIn.collectAsStateWithLifecycle()

    val drawerListViewModel: DrawerListViewModel = koinViewModel()
    val drawerState by drawerListViewModel.state.collectAsStateWithLifecycle()
    val photoboothViewModel: PhotoboothViewModel = koinViewModel()
    val photoboothState by photoboothViewModel.state.collectAsStateWithLifecycle()
    val orderViewModel: OrderViewModel = koinViewModel()
    val orderFormState by orderViewModel.formState.collectAsStateWithLifecycle()
    val orderListState by orderViewModel.listState.collectAsStateWithLifecycle()
    val orderDetailState by orderViewModel.detailState.collectAsStateWithLifecycle()
    val notificationViewModel: NotificationViewModel = koinViewModel()
    val notificationState by notificationViewModel.state.collectAsStateWithLifecycle()

    var toast by remember { mutableStateOf<UiText?> (null) }

    LaunchedEffect(deepLinkUri) {
        if (!deepLinkUri.isNullOrBlank()) {
            authViewModel.handleDeepLink(deepLinkUri)
            onDeepLinkConsumed()
        }
    }

    // DrawerListViewModel lives at this graph's scope and therefore outlives
    // navigation back to Login. Keep its state tied to the active account.
    LaunchedEffect(authState.session?.user?.id) {
        val currentUserId = authState.session?.user?.id
        drawerListViewModel.onSessionChanged(currentUserId)
        if (currentUserId != null) {
            profileViewModel.load(force = true)
            notificationViewModel.loadNotifications()
        }
    }

    LaunchedEffect(Unit) {
        authViewModel.events.collect { event ->
            when (event) {
                AuthEvent.NavigateToHome -> navController.navigateClearingBackStack(Routes.HOME)
                AuthEvent.NavigateToLogin, AuthEvent.SignedOut ->
                    navController.navigateClearingBackStack(Routes.LOGIN)
                AuthEvent.OpenResetPassword -> navController.navigate(Routes.RESET_PASSWORD) {
                    launchSingleTop = true
                }
                is AuthEvent.ShowMessage -> toast = event.message
            }
        }
    }

    LaunchedEffect(toast) {
        if (toast != null) {
            delay(3_000)
            toast = null
        }
    }

    fun onTabSelected(tab: PauseTab) {
        val route = when (tab) {
            PauseTab.HOME -> Routes.HOME
            PauseTab.PHOTOBOOTH -> Routes.PHOTOBOOTH_TEMPLATES
            PauseTab.MEMORIES -> Routes.MEMORIES
            PauseTab.PROFILE -> Routes.PROFILE
        }
        if (navController.currentDestination?.route != route) {
            if (tab == PauseTab.PHOTOBOOTH) {
                photoboothViewModel.start()
            }
            navController.navigate(route) {
                popUpTo(Routes.HOME) { inclusive = false }
                launchSingleTop = true
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        NavHost(navController = navController, startDestination = Routes.SPLASH) {
            composable(Routes.SPLASH) {
                SplashScreen()
                LaunchedEffect(signedIn) {
                    when (signedIn) {
                        true -> navController.navigateClearingBackStack(Routes.HOME)
                        false -> navController.navigateClearingBackStack(Routes.LOGIN)
                        null -> Unit
                    }
                }
            }

            composable(Routes.LOGIN) {
                LaunchedEffect(Unit) { authViewModel.resetTransientState() }
                LoginScreen(
                    state = authState,
                    onEmailChange = authViewModel::onEmailChange,
                    onPasswordChange = authViewModel::onPasswordChange,
                    onSignIn = authViewModel::signIn,
                    onForgotPassword = { navController.navigate(Routes.FORGOT_PASSWORD) },
                    onRegister = { navController.navigate(Routes.REGISTER) },
                    onGoogleIdToken = authViewModel::signInWithGoogle,
                    onGoogleCancelled = authViewModel::onGoogleSignInCancelled,
                    onGoogleFailure = authViewModel::onGoogleSignInFailed,
                )
            }

            composable(Routes.REGISTER) {
                RegisterScreen(
                    state = authState,
                    onBack = { navController.popBackStack() },
                    onNameChange = authViewModel::onDisplayNameChange,
                    onEmailChange = authViewModel::onEmailChange,
                    onPasswordChange = authViewModel::onPasswordChange,
                    onConfirmPasswordChange = authViewModel::onConfirmPasswordChange,
                    onTermsChange = authViewModel::onTermsChange,
                    onSignUp = authViewModel::signUp,
                    onResendConfirmation = authViewModel::resendConfirmationEmail,
                    onLoginClick = { navController.navigateClearingBackStack(Routes.LOGIN) },
                )
            }

            composable(Routes.FORGOT_PASSWORD) {
                ForgotPasswordScreen(
                    state = authState,
                    onBack = { navController.popBackStack() },
                    onEmailChange = authViewModel::onEmailChange,
                    onSendResetEmail = authViewModel::sendResetEmail,
                    onBackToLogin = { navController.navigateClearingBackStack(Routes.LOGIN) },
                )
            }

            composable(Routes.RESET_PASSWORD) {
                ResetPasswordScreen(
                    state = authState,
                    onBack = { navController.popBackStack() },
                    onPasswordChange = authViewModel::onPasswordChange,
                    onConfirmPasswordChange = authViewModel::onConfirmPasswordChange,
                    onSubmit = authViewModel::updatePassword,
                )
            }

            composable(Routes.HOME) {
                LaunchedEffect(Unit) {
                    drawerListViewModel.loadIfNeeded()
                    notificationViewModel.loadNotifications()
                    orderViewModel.loadOrders()
                }
                HomeScreen(
                    displayName = profileState.profile?.displayName
                        ?: authState.session?.user?.email?.substringBefore('@'),
                    isPremium = profileState.profile?.isPremium ?: false,
                    maxDrawers = profileState.profile?.maxDrawers ?: 3,
                    ownedDrawerCount = drawerState.owned.size,
                    recentDrawers = drawerState.recent,
                    hasError = drawerState.error != null,
                    pendingInvitationCount = drawerState.pendingInvitationCount,
                    unreadNotificationCount = notificationState.unreadCount,
                    onOpenInvitations = { onTabSelected(PauseTab.MEMORIES) },
                    onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                    onCreateDrawer = drawerListViewModel::openCreateSheet,
                    onOpenDrawer = { drawer ->
                        navController.navigate(Routes.drawerDetail(drawer.id))
                    },
                    onStartPhotobooth = {
                        photoboothViewModel.start()
                        navController.navigate(Routes.PHOTOBOOTH_TEMPLATES)
                    },
                    onStartPhotoboothWithSlot = { slotCount ->
                        photoboothViewModel.start()
                        photoboothViewModel.selectSlotCount(slotCount)
                        navController.navigate(Routes.PHOTOBOOTH_TEMPLATES)
                    },
                    recentOrders = orderListState.orders,
                    onOrderClick = { orderId -> navController.navigate(Routes.orderDetail(orderId)) },
                    onViewOrders = { navController.navigate(Routes.ORDER_LIST) },
                    onNavigate = ::onTabSelected,
                )
            }

            composable(Routes.PHOTOBOOTH_TEMPLATES) {
                LaunchedEffect(photoboothState.templates.isEmpty()) {
                    if (photoboothState.templates.isEmpty()) photoboothViewModel.loadTemplates()
                }
                TemplateListScreen(
                    state = photoboothState,
                    onBack = { navController.popBackStack() },
                    onSlotCountSelected = photoboothViewModel::selectSlotCount,
                    isUserPremium = profileState.profile?.isPremium == true,
                    onRequireUpgrade = { navController.navigate(Routes.UPGRADE) },
                    onTemplateSelected = { templateId ->
                        photoboothViewModel.selectTemplate(templateId)
                        navController.navigate(Routes.PHOTOBOOTH_PHOTOS)
                    },
                )
            }

            composable(Routes.PHOTOBOOTH_PHOTOS) {
                SelectPhotosScreen(
                    state = photoboothState,
                    onBack = { navController.popBackStack() },
                    onDrawerSelected = photoboothViewModel::selectDrawer,
                    onPhotoToggled = photoboothViewModel::togglePhoto,
                    onContinue = { navController.navigate(Routes.PHOTOBOOTH_PREVIEW) },
                )
            }

            composable(Routes.PHOTOBOOTH_PREVIEW) {
                PhotoboothPreviewScreen(
                    state = photoboothState,
                    onBack = { navController.popBackStack() },
                    onEditPhotos = { navController.popBackStack() },
                    onSave = photoboothViewModel::saveDraft,
                    onCaptionChange = photoboothViewModel::onCaptionChange,
                    onOrderClick = { draftId ->
                        navController.navigate(Routes.orderForm(draftId))
                    },
                )
            }

            composable(Routes.MEMORIES) {
                LaunchedEffect(Unit) { drawerListViewModel.loadIfNeeded() }
                DrawerListScreen(
                    state = drawerState,
                    maxDrawers = profileState.profile?.maxDrawers ?: 3,
                    onDrawerClick = { drawer -> navController.navigate(Routes.drawerDetail(drawer.id)) },
                    onCreateClick = drawerListViewModel::openCreateSheet,
                    onDismissQuota = drawerListViewModel::dismissQuotaDialog,
                    onRetry = drawerListViewModel::load,
                    onNavigate = ::onTabSelected,
                    onConsumeToast = drawerListViewModel::consumeToast,
                    onRespondInvitation = drawerListViewModel::respondInvitation,
                    onUpgradeClick = { navController.navigate(Routes.UPGRADE) },
                )
            }

            composable(
                route = Routes.DRAWER_DETAIL,
                arguments = listOf(navArgument("drawerId") { type = NavType.StringType }),
            ) { entry ->
                val drawerId = entry.arguments?.getString("drawerId").orEmpty()
                val detailViewModel: DrawerDetailViewModel = koinViewModel { parametersOf(drawerId) }
                val detailState by detailViewModel.state.collectAsStateWithLifecycle()

                LaunchedEffect(drawerId) { detailViewModel.load() }

                DrawerDetailScreen(
                    state = detailState,
                    onBack = { navController.popBackStack() },
                    onShare = { navController.navigate(Routes.shareDrawer(drawerId)) },
                    onStartPhotobooth = {
                        photoboothViewModel.start(drawerId)
                        navController.navigate(Routes.PHOTOBOOTH_TEMPLATES)
                    },
                    onPhotosPicked = detailViewModel::upload,
                    onToggleSelection = detailViewModel::toggleSelection,
                    onExitSelection = detailViewModel::exitSelectionMode,
                    onDeleteSelected = detailViewModel::deleteSelected,
                    onUpdateDrawer = detailViewModel::updateDrawer,
                    onDeleteDrawer = detailViewModel::deleteDrawer,
                    onLoadMore = detailViewModel::loadMore,
                    onConsumeToast = detailViewModel::consumeToast,
                    onSetAsCover = detailViewModel::setAsCover,
                    onDeleted = {
                        drawerListViewModel.onDrawerDeleted(drawerId)
                        navController.popBackStack()
                    },
                )
            }

            composable(
                route = Routes.SHARE_DRAWER,
                arguments = listOf(navArgument("drawerId") { type = NavType.StringType }),
            ) { entry ->
                val drawerId = entry.arguments?.getString("drawerId").orEmpty()
                val shareViewModel: ShareDrawerViewModel = koinViewModel { parametersOf(drawerId) }
                val shareState by shareViewModel.state.collectAsStateWithLifecycle()

                LaunchedEffect(drawerId) { shareViewModel.load() }

                ShareDrawerScreen(
                    state = shareState,
                    onBack = { navController.popBackStack() },
                    onEmailChange = shareViewModel::onEmailChange,
                    onPermissionChange = shareViewModel::onPermissionChange,
                    onSubmit = shareViewModel::submit,
                    onRevoke = shareViewModel::revoke,
                    onConsumeToast = shareViewModel::consumeToast,
                )
            }

            composable(Routes.PROFILE) {
                LaunchedEffect(Unit) { profileViewModel.load() }
                ProfileScreen(
                    state = profileState,
                    userEmail = authState.session?.user?.email,
                    onBack = { navController.popBackStack() },
                    onEdit = profileViewModel::startEditing,
                    onCancelEdit = profileViewModel::cancelEditing,
                    onNameChange = profileViewModel::onNameChange,
                    onPhoneChange = profileViewModel::onPhoneChange,
                    onSave = profileViewModel::save,
                    onAvatarPicked = profileViewModel::onAvatarPicked,
                    onSignOut = {
                        profileViewModel.signOut()
                        navController.navigateClearingBackStack(Routes.LOGIN)
                    },
                    onViewOrders = { navController.navigate(Routes.ORDER_LIST) },
                    onUpgrade = { navController.navigate(Routes.UPGRADE) },
                    onConsumeMessage = profileViewModel::consumeMessage,
                    onNavigate = ::onTabSelected,
                )
            }

            composable(Routes.UPGRADE) {
                LaunchedEffect(Unit) { profileViewModel.load() }
                UpgradeScreen(
                    isPremium = profileState.profile?.isPremium == true,
                    maxDrawers = profileState.profile?.maxDrawers ?: 3,
                    onBack = { navController.popBackStack() },
                    onSelectPlan = { plan ->
                        val refId = (authState.session?.user?.id ?: "VIP").take(8)
                        navController.navigate(Routes.paymentQr(plan.id, refId, plan.priceVnd))
                    },
                )
            }

            composable(Routes.NOTIFICATIONS) {
                LaunchedEffect(Unit) { notificationViewModel.loadNotifications() }
                NotificationListScreen(
                    state = notificationState,
                    onBack = { navController.popBackStack() },
                    onFilterChange = notificationViewModel::setFilter,
                    onMarkAllRead = notificationViewModel::markAllAsRead,
                    onNotificationClick = { notif ->
                        notificationViewModel.markAsRead(notif.id)
                        when (notif.type) {
                            "drawer_share" -> {
                                navController.popBackStack()
                                onTabSelected(PauseTab.MEMORIES)
                            }
                            "print_order" -> {
                                val refId = notif.referenceId
                                if (!refId.isNullOrBlank()) {
                                    navController.navigate(Routes.orderDetail(refId))
                                } else {
                                    navController.navigate(Routes.ORDER_LIST)
                                }
                            }
                            "membership" -> {
                                navController.navigate(Routes.UPGRADE)
                            }
                            else -> Unit
                        }
                    },
                )
            }

            composable(
                route = Routes.PAYMENT_QR,
                arguments = listOf(
                    navArgument("paymentType") { type = NavType.StringType },
                    navArgument("refId") { type = NavType.StringType },
                    navArgument("amountVnd") { type = NavType.IntType },
                ),
            ) { entry ->
                val paymentType = entry.arguments?.getString("paymentType").orEmpty()
                val refId = entry.arguments?.getString("refId").orEmpty()
                val amountVnd = entry.arguments?.getInt("amountVnd") ?: 0

                PaymentQrScreen(
                    paymentType = paymentType,
                    referenceId = refId,
                    amountVnd = amountVnd,
                    isProcessing = profileState.isSaving,
                    onConfirmPayment = {
                        when (paymentType) {
                            "pause_go", "pause_plus", "pause_premium", "membership_yearly", "membership_monthly" -> {
                                val planTitle = when (paymentType) {
                                    "pause_go" -> "PAUSE Go (5GB/năm)"
                                    "pause_plus" -> "PAUSE Plus (10GB/năm)"
                                    "pause_premium" -> "PAUSE Premium (20GB/năm)"
                                    else -> "Pause VIP"
                                }
                                profileViewModel.upgradeToPremium(isYearly = true, planType = paymentType) { updatedProfile ->
                                    drawerListViewModel.dismissQuotaDialog()
                                    notificationViewModel.pushNotification(
                                        type = "membership",
                                        title = "Kích hoạt $planTitle thành công!",
                                        body = "Tài khoản của bạn đã nâng cấp thành công $planTitle: Mở khóa 100% VIP Templates và mở rộng lưu trữ đám mây (${updatedProfile.maxDrawers} ngăn kéo).",
                                    )
                                    toast = UiText.Dynamic(
                                        "Đã kích hoạt $planTitle thành công!",
                                    )
                                    navController.popBackStack()
                                }
                            }
                            "single_drawer" -> {
                                profileViewModel.purchaseSingleDrawer { updatedProfile ->
                                    drawerListViewModel.dismissQuotaDialog()
                                    notificationViewModel.pushNotification(
                                        type = "membership",
                                        title = "Đã mở thêm ngăn kéo",
                                        body = "Hạn mức ngăn kéo của bạn đã tăng lên ${updatedProfile.maxDrawers} ngăn kéo.",
                                    )
                                    toast = UiText.Dynamic(
                                        "Đã mở thêm ngăn kéo thành công!",
                                    )
                                    navController.popBackStack()
                                }
                            }
                            else -> {
                                notificationViewModel.pushNotification(
                                    type = "print_order",
                                    title = "Đã thanh toán đơn in #${refId.take(8).uppercase()}",
                                    body = "Chúng tôi đã nhận chuyển khoản VietQR của bạn và đang tiến hành in ảnh.",
                                    referenceId = refId,
                                )
                                toast = UiText.Dynamic("Thanh toán VietQR thành công!")
                                navController.navigate(Routes.orderConfirm(refId)) {
                                    popUpTo(Routes.PHOTOBOOTH_PREVIEW) { inclusive = true }
                                }
                            }
                        }
                    },
                    onCancel = {
                        navController.navigate(Routes.paymentFailed(paymentType, refId, amountVnd))
                    },
                    onBack = { navController.popBackStack() },
                )
            }

            composable(
                route = Routes.PAYMENT_FAILED,
                arguments = listOf(
                    navArgument("paymentType") { type = NavType.StringType },
                    navArgument("refId") { type = NavType.StringType },
                    navArgument("amountVnd") { type = NavType.IntType },
                ),
            ) { entry ->
                val paymentType = entry.arguments?.getString("paymentType").orEmpty()
                val refId = entry.arguments?.getString("refId").orEmpty()
                val amountVnd = entry.arguments?.getInt("amountVnd") ?: 0

                PaymentFailedScreen(
                    paymentType = paymentType,
                    referenceId = refId,
                    amountVnd = amountVnd,
                    onRetry = { navController.popBackStack() },
                    onBackHome = { navController.navigateClearingBackStack(Routes.HOME) },
                )
            }

            composable(
                route = Routes.ORDER_FORM,
                arguments = listOf(navArgument("itemId") { type = NavType.StringType }),
            ) { entry ->
                val itemId = entry.arguments?.getString("itemId").orEmpty()
                LaunchedEffect(itemId, profileState.profile?.isPremium) {
                    orderViewModel.initOrderForm(
                        itemId = itemId,
                        templateName = photoboothState.selectedTemplate?.name ?: "Photobooth Strip",
                        previewUrl = photoboothState.previewUrl,
                        slotCount = photoboothState.selectedTemplate?.slotCount ?: 4,
                        isPremiumUser = profileState.profile?.isPremium == true,
                    )
                }
                OrderFormScreen(
                    state = orderFormState,
                    onBack = { navController.popBackStack() },
                    onNameChange = orderViewModel::onShippingNameChanged,
                    onPhoneChange = orderViewModel::onShippingPhoneChanged,
                    onAddressChange = orderViewModel::onShippingAddressChanged,
                    onNoteChange = orderViewModel::onNoteChanged,
                    onCoverTypeChange = orderViewModel::onCoverTypeChanged,
                    onPaperTypeChange = orderViewModel::onPaperTypeChanged,
                    onPromoCodeChange = orderViewModel::onPromoCodeChanged,
                    onIncrementQuantity = orderViewModel::incrementQuantity,
                    onDecrementQuantity = orderViewModel::decrementQuantity,
                    onSubmit = {
                        orderViewModel.submitOrder { orderId ->
                            navController.navigate(Routes.orderConfirm(orderId)) {
                                popUpTo(Routes.PHOTOBOOTH_PREVIEW) { inclusive = true }
                            }
                        }
                    },
                    onSubmitWithPayment = { isBankQr ->
                        val amountToPay = orderFormState.grandTotalVnd
                        orderViewModel.submitOrder { orderId ->
                            if (isBankQr) {
                                navController.navigate(
                                    Routes.paymentQr(
                                        paymentType = "order",
                                        refId = orderId,
                                        amountVnd = amountToPay,
                                    ),
                                )
                            } else {
                                notificationViewModel.pushNotification(
                                    type = "print_order",
                                    title = "Đặt in thành công #${orderId.take(8).uppercase()}",
                                    body = "Đơn đặt in Photobooth (COD) của bạn đã được tiếp nhận và đang chờ xử lý.",
                                    referenceId = orderId,
                                )
                                navController.navigate(Routes.orderConfirm(orderId)) {
                                    popUpTo(Routes.PHOTOBOOTH_PREVIEW) { inclusive = true }
                                }
                            }
                        }
                    },
                )
            }

            composable(
                route = Routes.ORDER_CONFIRM,
                arguments = listOf(navArgument("orderId") { type = NavType.StringType }),
            ) { entry ->
                val orderId = entry.arguments?.getString("orderId").orEmpty()
                OrderConfirmScreen(
                    orderId = orderId,
                    onViewDetail = { id ->
                        navController.navigate(Routes.orderDetail(id)) {
                            popUpTo(Routes.HOME)
                        }
                    },
                    onBackHome = { navController.navigateClearingBackStack(Routes.HOME) },
                )
            }

            composable(Routes.ORDER_LIST) {
                OrderListScreen(
                    state = orderListState,
                    onBack = { navController.popBackStack() },
                    onFilterSelected = orderViewModel::setFilter,
                    onOrderClick = { orderId -> navController.navigate(Routes.orderDetail(orderId)) },
                    onReorderClick = { order ->
                        navController.navigate(Routes.orderForm(order.photoboothItemId))
                    },
                    onRefresh = orderViewModel::loadOrders,
                )
            }

            composable(
                route = Routes.ORDER_DETAIL,
                arguments = listOf(navArgument("orderId") { type = NavType.StringType }),
            ) { entry ->
                val orderId = entry.arguments?.getString("orderId").orEmpty()
                OrderDetailScreen(
                    orderId = orderId,
                    state = orderDetailState,
                    onBack = { navController.popBackStack() },
                    onRefresh = orderViewModel::loadOrderDetail,
                )
            }
        }

        if (drawerState.isCreateSheetOpen) {
            CreateDrawerSheet(
                state = drawerState,
                onDismiss = drawerListViewModel::closeCreateSheet,
                onNameChange = drawerListViewModel::onNameChange,
                onDescriptionChange = drawerListViewModel::onDescriptionChange,
                onSubmit = drawerListViewModel::createDrawer,
            )
        }

        AnimatedVisibility(
            visible = toast != null,
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            PauseToast(message = toast?.asString().orEmpty())
        }
    }
}

private fun NavHostController.navigateClearingBackStack(route: String) {
    navigate(route) {
        popUpTo(graph.id) { inclusive = true }
        launchSingleTop = true
    }
}
